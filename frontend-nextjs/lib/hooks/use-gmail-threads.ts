import { useQuery } from '@tanstack/react-query';

export interface EmailThread {
  messageId: string;
  threadId: string;
  subject: string;
  sender: string;
  senderEmail?: string;
  time: string;
  internalDate?: number; // For sorting purposes
}

interface UseGmailThreadsOptions {
  accountId?: string;
}

export function useGmailThreads(options?: UseGmailThreadsOptions) {
  return useQuery<{ threads: EmailThread[] }>({
    queryKey: ['gmail-threads', options?.accountId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.accountId) {
        params.append('accountId', options.accountId);
      }

      const response = await fetch(`/api/gmail/threads?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Gmail threads');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always'
  });
}