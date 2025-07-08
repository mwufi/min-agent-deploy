import { db } from '@/lib/db';
import { userAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import pd from './pipedream_client';

// Simple in-memory cache for accounts
const accountsCache = new Map<string, { accounts: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  
  // Update cache
  accountsCache.set(userId, { accounts, timestamp: Date.now() });
  
  return accounts;
}

export async function getUserAccounts(userId: string): Promise<any[]> {
  // Check cache first
  const cached = accountsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Accounts Service] Returning cached accounts for user ${userId}`);
    return cached.accounts;
  }
  
  // Try to get from database first
  const result = await db
    .select()
    .from(userAccounts)
    .where(eq(userAccounts.userId, userId))
    .limit(1);
  
  if (result.length > 0) {
    console.log(`[Accounts Service] Found accounts in DB for user ${userId}`);
    const accounts = result[0].accounts;
    
    // Update cache
    accountsCache.set(userId, { accounts, timestamp: Date.now() });
    
    return accounts;
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
  accountsCache.delete(userId);
  await syncUserAccounts(userId);
}