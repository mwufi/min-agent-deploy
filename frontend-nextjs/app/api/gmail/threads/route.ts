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
  snippet?: string;
  time: string;
  internalDate?: number;
  messageCount: number;
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
  // Get thread aggregates with latest message info and message count
  const threadData = await db.execute(sql`
    WITH thread_stats AS (
      SELECT 
        thread_id,
        COUNT(*) as message_count,
        MAX(internal_date) as latest_date
      FROM email_messages
      WHERE user_id = ${userId}
        AND account_id = ${accountId}
      GROUP BY thread_id
    ),
    latest_messages AS (
      SELECT DISTINCT ON (em.thread_id)
        em.message_id,
        em.thread_id,
        em.subject,
        em."from" as sender,
        em.from_email as sender_email,
        em.snippet,
        em.internal_date,
        ts.message_count
      FROM email_messages em
      INNER JOIN thread_stats ts ON em.thread_id = ts.thread_id
      WHERE em.user_id = ${userId}
        AND em.account_id = ${accountId}
        AND em.internal_date = ts.latest_date
      ORDER BY em.thread_id, em.internal_date DESC
    )
    SELECT 
      message_id,
      thread_id,
      subject,
      sender,
      sender_email,
      snippet,
      internal_date,
      message_count,
      EXTRACT(EPOCH FROM internal_date) * 1000 as internal_date_ms
    FROM latest_messages
    ORDER BY internal_date DESC
    LIMIT 50
  `);

  // Process and clean up the subjects
  const threads: EmailThread[] = (threadData.rows || threadData).map((row: any) => {
    // Remove "Re: " prefix from subjects
    let cleanSubject = row.subject || 'No Subject';
    cleanSubject = cleanSubject.replace(/^(Re:\s*)+/gi, '').trim();
    
    return {
      messageId: row.message_id,
      threadId: row.thread_id,
      subject: cleanSubject,
      sender: row.sender || 'Unknown Sender',
      senderEmail: row.sender_email || undefined,
      snippet: row.snippet || '',
      time: row.internal_date ? new Date(row.internal_date).toISOString() : new Date().toISOString(),
      internalDate: Number(row.internal_date_ms) || 0,
      messageCount: Number(row.message_count) || 1,
    };
  });

  return threads;
}