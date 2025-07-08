import { db } from '@/lib/db';
import { userAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import pd from './pipedream_client';

export async function syncUserAccounts(userId: string): Promise<any[]> {
  console.log(`[Accounts Service] Syncing accounts for user ${userId}`);
  
  // Fetch from Pipedream
  const pipedreamAccounts = await pd.getAccounts({
    external_user_id: userId,
  });
  
  const accounts = pipedreamAccounts.data || [];
  
  // Upsert to database
  await db.insert(userAccounts).values({
    userId,
    accounts,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: userAccounts.userId,
    set: {
      accounts,
      updatedAt: new Date(),
    }
  });
  
  console.log(`[Accounts Service] Synced ${accounts.length} accounts for user ${userId}`);
  return accounts;
}

export async function getUserAccounts(userId: string): Promise<any[]> {
  // Try to get from database first
  const result = await db
    .select()
    .from(userAccounts)
    .where(eq(userAccounts.userId, userId))
    .limit(1);
  
  if (result.length > 0) {
    console.log(`[Accounts Service] Found accounts in DB for user ${userId}`);
    return result[0].accounts;
  }
  
  // If not in DB, sync from Pipedream
  console.log(`[Accounts Service] No accounts in DB, syncing from Pipedream for user ${userId}`);
  return syncUserAccounts(userId);
}

export async function getGmailAccounts(userId: string): Promise<any[]> {
  const accounts = await getUserAccounts(userId);
  return accounts.filter(account => 
    account.app?.name?.toLowerCase() === 'gmail'
  );
}

export async function invalidateUserAccounts(userId: string): Promise<void> {
  console.log(`[Accounts Service] Invalidating accounts for user ${userId}`);
  await syncUserAccounts(userId);
}