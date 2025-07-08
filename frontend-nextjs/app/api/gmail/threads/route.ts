import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { emailMessages, gmailSyncHistory } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getGmailAccounts as getGmailAccountsFromDB } from '@/lib/server/accounts-service';

interface EmailThread {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail?: string;
  time: string;
  internalDate?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query params
    const searchParams = req.nextUrl.searchParams;
    let accountId = searchParams.get('accountId');
    const forceSync = searchParams.get('sync') === 'true';
    
    // If no account ID provided, try to get the default Gmail account
    if (!accountId) {
      const gmailAccounts = await getGmailAccountsFromDB(userId);
      if (gmailAccounts.length > 0) {
        accountId = gmailAccounts[0].id;
        console.log(`Using default Gmail account: ${accountId}`);
      } else {  
        return NextResponse.json({ 
          threads: [],
          lastSync: null,
          syncInProgress: false,
          message: 'No Gmail accounts connected'
        });
      }
    }

    // Check if we need to sync
    const shouldSync = await shouldPerformSync(userId, accountId, forceSync);
    
    if (shouldSync) {
      // Trigger sync in the background
      console.log('Triggering background sync for account:', accountId);
      
      // Call sync endpoint without waiting for response
      fetch(`${req.nextUrl.origin}/api/gmail/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth headers
          'Cookie': req.headers.get('cookie') || '',
        },
        body: JSON.stringify({ accountId }),
      }).catch(error => {
        console.error('Background sync failed:', error);
      });
    }

    // Always fetch from database for fast response
    const threads = await fetchThreadsFromDB(userId, accountId);
    
    // Get last sync info
    const lastSync = await db
      .select({
        completedAt: gmailSyncHistory.completedAt,
        historyId: gmailSyncHistory.historyId,
        messagesAdded: gmailSyncHistory.messagesAdded,
      })
      .from(gmailSyncHistory)
      .where(
        and(
          eq(gmailSyncHistory.userId, userId),
          eq(gmailSyncHistory.accountId, accountId),
          sql`${gmailSyncHistory.completedAt} IS NOT NULL`
        )
      )
      .orderBy(desc(gmailSyncHistory.completedAt))
      .limit(1);

    return NextResponse.json({ 
      threads,
      lastSync: lastSync[0] || null,
      syncInProgress: shouldSync,
    });
  } catch (error) {
    console.error('Error fetching Gmail threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail threads' },
      { status: 500 }
    );
  }
}

async function shouldPerformSync(
  userId: string, 
  accountId: string, 
  forceSync: boolean
): Promise<boolean> {
  if (forceSync) return true;

  // Check last successful sync
  const lastSync = await db
    .select({
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

  if (!lastSync[0]) {
    // Never synced before
    return true;
  }

  // Check if last sync was more than 5 minutes ago
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastSync[0].completedAt < fiveMinutesAgo;
}

async function fetchThreadsFromDB(
  userId: string,
  accountId: string
): Promise<EmailThread[]> {
  // Get most recent message per thread
  const recentMessages = await db
    .select({
      messageId: emailMessages.messageId,
      threadId: emailMessages.threadId,
      subject: emailMessages.subject,
      sender: emailMessages.from,
      senderEmail: emailMessages.fromEmail,
      time: emailMessages.internalDate,
      internalDate: sql<number>`EXTRACT(EPOCH FROM ${emailMessages.internalDate}) * 1000`,
    })
    .from(emailMessages)
    .where(
      and(
        eq(emailMessages.userId, userId),
        eq(emailMessages.accountId, accountId)
      )
    )
    .orderBy(desc(emailMessages.internalDate))
    .limit(200); // Get more to ensure we have enough threads

  // Group by thread and get most recent message
  const threadMap = new Map<string, EmailThread>();
  
  for (const message of recentMessages) {
    if (!threadMap.has(message.threadId)) {
      threadMap.set(message.threadId, {
        messageId: message.messageId,
        threadId: message.threadId,
        subject: message.subject || 'No Subject',
        sender: message.sender || 'Unknown Sender',
        senderEmail: message.senderEmail || undefined,
        time: message.time?.toISOString() || new Date().toISOString(),
        internalDate: Number(message.internalDate) || 0,
      });
    }
  }

  // Convert to array and sort by date
  const threads = Array.from(threadMap.values())
    .sort((a, b) => (b.internalDate || 0) - (a.internalDate || 0))
    .slice(0, 50); // Return top 50 threads

  return threads;
}