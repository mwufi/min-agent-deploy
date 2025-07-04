import { useQuery } from '@tanstack/react-query';

interface NotionAccount {
  id: string;
  name: string;
  email?: string;
  workspace_name?: string;
}

export function useNotionAccounts() {
  return useQuery<{ accounts: NotionAccount[] }>({
    queryKey: ['notion-accounts'],
    queryFn: async () => {
      const response = await fetch('/api/notion/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch Notion accounts');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}