import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listThreads, getThread } from '@/lib/server/gmail_client';

interface EmailThread {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  time: string;
}

interface Header {
  name: string;
  value: string;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query params or use default
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');

    // Fetch the 50 most recent threads
    const threadsResponse = await listThreads(
      userId,
      {
        maxResults: 50,
        q: 'in:inbox'
      },
      accountId || undefined
    );

    const threads = threadsResponse.threads || [];
    const emailThreads: EmailThread[] = [];

    // Fetch details for each thread
    for (const thread of threads) {
      if (!thread.id) continue;

      const threadDetails = await getThread(userId, thread.id, accountId || undefined);
      const messages = threadDetails.messages || [];
      if (messages.length === 0) continue;

      // Get the first message in the thread for metadata
      const firstMessage = messages[0];
      const headers: Header[] = firstMessage.payload?.headers || [];

      const subject = headers.find((h: Header) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: Header) => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find((h: Header) => h.name === 'Date')?.value || '';

      // Extract sender name/email
      const senderMatch = from.match(/^(?:"?([^"]+)"?\s)?<?([^>]+)>?$/);
      const sender = senderMatch ? (senderMatch[1] || senderMatch[2]) : from;

      emailThreads.push({
        messageId: firstMessage.id || '',
        threadId: thread.id,
        subject,
        sender,
        time: date
      });
      console.log(`[${thread.id}] ${subject} from ${sender} at ${date}`);
    }

    // Just return the data directly (no filesystem operations)
    return NextResponse.json({ threads: emailThreads });
  } catch (error) {
    console.error('Error fetching Gmail threads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail threads' },
      { status: 500 }
    );
  }
}