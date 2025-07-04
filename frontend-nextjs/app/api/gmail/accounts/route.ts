import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGmailAccounts } from '@/lib/server/gmail_client';

export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth();
  
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const requestedUserId = searchParams.get('userId');
  
  // Verify the requested userId matches the authenticated user
  if (requestedUserId !== clerkUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const accounts = await getGmailAccounts(clerkUserId);
    
    // Format the accounts for the frontend
    const formattedAccounts = accounts.map((account: any) => ({
      id: account.id,
      email: account.email || account.name || 'Unknown Gmail Account',
      name: account.name,
      healthy: account.healthy !== false,
    }));
    
    return NextResponse.json(formattedAccounts);
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail accounts' },
      { status: 500 }
    );
  }
}