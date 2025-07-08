import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

interface GmailAccount {
  id: string;
  email: string;
  name?: string;
  healthy?: boolean;
}

async function fetchGmailAccounts(userId: string): Promise<GmailAccount[]> {
  const response = await fetch(`/api/gmail/accounts?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch Gmail accounts');
  }
  return response.json();
}

export function useGmailAccounts() {
  const { user } = useUser();
  const userId = user?.id;

  return useQuery({
    queryKey: ['gmail-accounts', userId],
    queryFn: () => fetchGmailAccounts(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // Consider data stale after 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}