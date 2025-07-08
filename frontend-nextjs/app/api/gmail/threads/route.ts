import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listThreads, getThread, getGmailClient } from '@/lib/server/gmail_client';
import { db } from '@/lib/db';
import { emailThreads, emailMessages, gmailSyncHistory } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface EmailThread {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  time: string;
  internalDate?: number; // For sorting purposes
}

interface Header {
  name: string;
  value: string;
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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query params or use default
    const searchParams = req.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Fetch the 50 most recent threads from all folders (not just inbox)
    const threadsResponse = await listThreads(
      userId,
      {
        maxResults: 50,
        // Remove 'in:inbox' to get threads from all folders
        // Add query to exclude spam and trash by default
        q: '-in:spam -in:trash'
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

      // Format the date to be more user-friendly
      const formattedTime = date ? new Date(date).toLocaleString() : 'Unknown';

      // Get the most recent message's internal date for sorting
      const lastMessage = messages[messages.length - 1];
      const sortableDate = lastMessage.internalDate ? parseInt(lastMessage.internalDate) : 0;

      emailThreads.push({
        messageId: firstMessage.id || '',
        threadId: thread.id,
        subject,
        sender,
        time: formattedTime,
        internalDate: sortableDate // For sorting purposes
      });
      console.log(`[${thread.id}] ${subject} from ${sender} at ${formattedTime}`);
    }

    // Sort threads by most recent message date (descending)
    emailThreads.sort((a, b) => (b.internalDate || 0) - (a.internalDate || 0));

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