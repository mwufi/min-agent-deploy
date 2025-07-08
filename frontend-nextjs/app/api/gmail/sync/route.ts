import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listThreads, getThread } from '@/lib/server/gmail_client';
import { db } from '@/lib/db';
import { emailThreads, emailMessages, gmailSyncHistory } from '@/lib/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import pd from '@/lib/server/pipedream_client';

interface Header {
  name: string;
  value: string;
}

interface GmailThread {
  id?: string;
  snippet?: string;
  historyId?: string;
}

function extractEmailParts(message: any) {
  const headers: Header[] = message.payload?.headers || [];

  const getHeader = (name: string) => headers.find((h: Header) => h.name === name)?.value || '';
  const getHeaders = (name: string) => headers
    .filter((h: Header) => h.name === name)
    .map(h => h.value)
    .filter(Boolean);

  // Extract body content
  let body = '';
  let bodyHtml = '';

  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
    }
  }

  return {
    from: getHeader('From'),
    to: getHeaders('To'),
    cc: getHeaders('Cc'),
    bcc: getHeaders('Bcc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    body,
    bodyHtml,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID and force full sync flag from body
    const body = await req.json().catch(() => ({}));
    const accountId = body.accountId || req.nextUrl.searchParams.get('accountId');
    const forceFullSync = body.forceFullSync === true;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Check last successful sync for incremental sync
    const lastSuccessfulSync = await db
      .select({
        historyId: gmailSyncHistory.historyId,
        completedAt: gmailSyncHistory.completedAt,
      })
      .from(gmailSyncHistory)
      .where(
        and(
          eq(gmailSyncHistory.userId, userId),
          eq(gmailSyncHistory.accountId, accountId),
          sql`${gmailSyncHistory.completedAt} IS NOT NULL`,
          sql`${gmailSyncHistory.error} IS NULL`
        )
      )
      .orderBy(desc(gmailSyncHistory.completedAt))
      .limit(1);

    const lastHistoryId = lastSuccessfulSync[0]?.historyId;
    const isIncrementalSync = !forceFullSync && lastHistoryId && lastHistoryId !== '0';

    // Start sync history
    const syncId = crypto.randomUUID();
    await db.insert(gmailSyncHistory).values({
      id: syncId,
      userId,
      accountId,
      historyId: '0', // Will be updated after sync
      syncType: isIncrementalSync ? 'incremental' : 'full',
      startedAt: new Date(),
    });

    // Get user's profile to fetch the latest history ID
    let currentHistoryId = '0';
    try {
      const profileResponse = await pd.makeProxyRequest(
        {
          searchParams: {
            account_id: accountId,
            external_user_id: userId,
          }
        },
        {
          url: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          options: { method: "GET" }
        }
      );

      const profile = typeof profileResponse === 'string'
        ? JSON.parse(profileResponse)
        : profileResponse;

      currentHistoryId = profile.historyId || '0';
    } catch (error) {
      console.error('Error fetching Gmail profile:', error);
      // Continue without history ID
    }

    let threads = [];
    let messagesAdded = 0;
    let messagesModified = 0;
    let messagesDeleted = 0;
    const processedThreadIds: string[] = [];

    if (isIncrementalSync && lastHistoryId) {
      console.log(`Performing incremental sync from history ID ${lastHistoryId} to ${currentHistoryId}`);
      
      try {
        // Fetch history changes since last sync
        const historyResponse = await pd.makeProxyRequest(
          {
            searchParams: {
              account_id: accountId,
              external_user_id: userId,
            }
          },
          {
            url: `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${lastHistoryId}&historyTypes=messageAdded&historyTypes=messageDeleted&historyTypes=labelAdded&historyTypes=labelRemoved`,
            options: { method: "GET" }
          }
        );
        
        const history = typeof historyResponse === 'string' 
          ? JSON.parse(historyResponse) 
          : historyResponse;

        if (history.history && history.history.length > 0) {
          const threadIdsToFetch = new Set<string>();
          const deletedMessageIds = new Set<string>();

          // Process history records
          for (const record of history.history) {
            // Track added messages
            if (record.messagesAdded) {
              for (const item of record.messagesAdded) {
                if (item.message?.threadId) {
                  threadIdsToFetch.add(item.message.threadId);
                }
              }
            }

            // Track deleted messages
            if (record.messagesDeleted) {
              for (const item of record.messagesDeleted) {
                if (item.message?.id) {
                  deletedMessageIds.add(item.message.id);
                }
              }
            }

            // Track label changes (messages marked as read/unread, etc)
            if (record.labelsAdded || record.labelsRemoved) {
              const items = [...(record.labelsAdded || []), ...(record.labelsRemoved || [])];
              for (const item of items) {
                if (item.message?.threadId) {
                  threadIdsToFetch.add(item.message.threadId);
                }
              }
            }
          }

          // Delete messages that were deleted in Gmail
          if (deletedMessageIds.size > 0) {
            const deleteResult = await db
              .delete(emailMessages)
              .where(
                and(
                  eq(emailMessages.accountId, accountId),
                  sql`${emailMessages.messageId} IN (${Array.from(deletedMessageIds).map(id => `'${id}'`).join(',')})`
                )
              );
            messagesDeleted = deletedMessageIds.size;
          }

          // Convert thread IDs to thread objects for processing
          threads = Array.from(threadIdsToFetch).map(id => ({ id }));
          console.log(`Incremental sync: ${threads.length} threads to update, ${deletedMessageIds.size} messages deleted`);
        } else {
          console.log('No history changes found, skipping sync');
          threads = [];
        }
      } catch (error) {
        console.error('Error performing incremental sync, falling back to full sync:', error);
        // Fall back to full sync
        const threadsResponse = await listThreads(
          userId,
          {
            maxResults: 50,
            q: '-in:spam -in:trash'
          },
          accountId
        );
        threads = threadsResponse.threads || [];
      }
    } else {
      // Full sync - fetch the 50 most recent threads
      console.log('Performing full sync');
      const threadsResponse = await listThreads(
        userId,
        {
          maxResults: 50,
          q: '-in:spam -in:trash'
        },
        accountId
      );
      threads = threadsResponse.threads || [];
    }

    // Collect all threads and messages for batch processing
    const allThreadsData = [];
    const allMessagesData = [];

    // Helper function to process a single thread
    const processThread = async (thread: GmailThread): Promise<any> => {
      if (!thread.id) return null;

      const threadDetails = await getThread(userId, thread.id, accountId);
      const messages = threadDetails.messages || [];

      if (messages.length === 0) return null;

      // Extract thread metadata from the first message
      const firstMessage = messages[0];
      const threadData = extractEmailParts(firstMessage);

      const threadInfo = {
        id: crypto.randomUUID(),
        threadId: thread.id,
        userId,
        accountId,
        subject: threadData.subject || 'No Subject',
        snippet: threadDetails.snippet || '',
        historyId: firstMessage.historyId || currentHistoryId,
        updatedAt: new Date(),
      };

      const messagesInfo = [];
      for (const message of messages) {
        if (!message.id) continue;

        const messageData = extractEmailParts(message);
        const internalDate = message.internalDate
          ? new Date(parseInt(message.internalDate))
          : new Date();

        // Extract sender name/email
        const senderMatch = messageData.from.match(/^(?:"?([^"]+)"?\s)?<?([^>]+)>?$/);
        const senderName = senderMatch ? (senderMatch[1] || senderMatch[2]) : messageData.from;
        const senderEmail = senderMatch ? senderMatch[2] : messageData.from;

        messagesInfo.push({
          id: crypto.randomUUID(),
          messageId: message.id,
          threadId: thread.id,
          userId,
          accountId,
          from: senderName,
          fromEmail: senderEmail,
          to: messageData.to,
          cc: messageData.cc,
          bcc: messageData.bcc,
          subject: messageData.subject || 'No Subject',
          snippet: message.snippet || '',
          body: messageData.body,
          bodyHtml: messageData.bodyHtml,
          labelIds: message.labelIds || [],
          isUnread: message.labelIds?.includes('UNREAD') || false,
          historyId: message.historyId || currentHistoryId,
          internalDate,
          updatedAt: new Date(),
        });
      }

      return { threadInfo, messagesInfo };
    };

    // Process threads in batches of 10
    const batchSize = 10;
    for (let i = 0; i < threads.length; i += batchSize) {
      const batch = threads.slice(i, i + batchSize);

      // Fetch thread details in parallel for this batch
      const batchResults = await Promise.all(
        batch.map((thread: GmailThread) => processThread(thread))
      );

      // Collect results from this batch
      for (const result of batchResults) {
        if (result) {
          processedThreadIds.push(result.threadInfo.threadId);
          allThreadsData.push(result.threadInfo);
          allMessagesData.push(...result.messagesInfo);
        }
      }
    }

    // Batch check existing messages
    const messageIds = allMessagesData.map(m => m.messageId);
    const existingMessages = await db
      .select({ messageId: emailMessages.messageId })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.accountId, accountId),
          inArray(emailMessages.messageId, messageIds)
        )
      );

    const existingMessageIds = new Set(existingMessages.map(m => m.messageId));
    const newMessages = allMessagesData.filter(m => !existingMessageIds.has(m.messageId));
    const updatedMessages = allMessagesData.filter(m => existingMessageIds.has(m.messageId));
    
    messagesAdded = newMessages.length;
    messagesModified = updatedMessages.length;

    // Batch upsert threads
    if (allThreadsData.length > 0) {
      await db.insert(emailThreads).values(allThreadsData).onConflictDoUpdate({
        target: [emailThreads.threadId, emailThreads.accountId],
        set: {
          subject: sql`excluded.subject`,
          snippet: sql`excluded.snippet`,
          historyId: sql`excluded.history_id`,
          updatedAt: sql`excluded.updated_at`,
        }
      });
    }

    // Batch upsert messages
    if (allMessagesData.length > 0) {
      await db.insert(emailMessages).values(allMessagesData).onConflictDoUpdate({
        target: [emailMessages.messageId, emailMessages.accountId],
        set: {
          from: sql`excluded.from`,
          to: sql`excluded.to`,
          cc: sql`excluded.cc`,
          bcc: sql`excluded.bcc`,
          subject: sql`excluded.subject`,
          snippet: sql`excluded.snippet`,
          body: sql`excluded.body`,
          bodyHtml: sql`excluded.body_html`,
          labelIds: sql`excluded.label_ids`,
          isUnread: sql`excluded.is_unread`,
          historyId: sql`excluded.history_id`,
          internalDate: sql`excluded.internal_date`,
          updatedAt: sql`excluded.updated_at`,
        }
      });
    }

    // Update sync history with results
    await db.update(gmailSyncHistory)
      .set({
        historyId: currentHistoryId,
        messagesAdded,
        messagesModified,
        messagesDeleted,
        completedAt: new Date(),
      })
      .where(eq(gmailSyncHistory.id, syncId));

    // Fetch the synced threads from database in correct order
    const syncedThreads = await db
      .select({
        messageId: emailMessages.messageId,
        threadId: emailMessages.threadId,
        subject: emailMessages.subject,
        sender: emailMessages.from,
        time: emailMessages.internalDate,
      })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.userId, userId),
          eq(emailMessages.accountId, accountId),
          inArray(emailMessages.threadId, processedThreadIds)
        )
      )
      .orderBy(desc(emailMessages.internalDate))
      .limit(50);

    // Get the most recent message from each thread
    const threadMap = new Map();
    for (const message of syncedThreads) {
      if (!threadMap.has(message.threadId) ||
        (message.time && threadMap.get(message.threadId).time < message.time)) {
        threadMap.set(message.threadId, message);
      }
    }

    const threads_result = Array.from(threadMap.values()).map(thread => ({
      ...thread,
      time: thread.time?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json({
      success: true,
      syncId,
      syncType: isIncrementalSync ? 'incremental' : 'full',
      messagesAdded,
      messagesModified,
      messagesDeleted,
      historyId: currentHistoryId,
      lastHistoryId: lastHistoryId || null,
      threads: threads_result
    });
  } catch (error) {
    console.error('Error syncing Gmail threads:', error);

    // Log error in sync history if we have a sync ID
    if (error instanceof Error && 'syncId' in error) {
      await db.update(gmailSyncHistory)
        .set({
          error: error.message,
          completedAt: new Date(),
        })
        .where(eq(gmailSyncHistory.id, error.syncId as string));
    }

    return NextResponse.json(
      { error: 'Failed to sync Gmail threads' },
      { status: 500 }
    );
  }
}