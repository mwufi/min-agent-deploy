import { auth } from '@clerk/nextjs/server';
import { getNotionAccounts } from '@/lib/notion/client';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const accounts = await getNotionAccounts(userId);
    
    // Format accounts for frontend
    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name || account.email || 'Notion Workspace',
      email: account.email,
      workspace_name: account.workspace_name,
    }));

    return Response.json({ accounts: formattedAccounts });
  } catch (error) {
    console.error('Error fetching Notion accounts:', error);
    return Response.json({ accounts: [], error: 'Failed to fetch Notion accounts' }, { status: 500 });
  }
}