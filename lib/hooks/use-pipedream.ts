import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { App, Component, Account } from "@/app/_template/components/pipedream_connect/types";

// Query Keys
const QUERY_KEYS = {
    apps: (search?: string) => ["apps", search] as const,
    components: (appSlug: string) => ["components", appSlug] as const,
    accounts: (userId: string) => ["accounts", userId] as const,
} as const;

// API Functions
const fetchApps = async (searchQuery?: string): Promise<{ data: App[] }> => {
    const url = searchQuery
        ? `/api/pipedream/apps?q=${encodeURIComponent(searchQuery)}`
        : "/api/pipedream/apps";

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Failed to fetch apps");
    }
    return response.json();
};

const fetchComponents = async (appSlug: string): Promise<{ data: Component[] }> => {
    const response = await fetch(`/api/pipedream/components/actions?app=${appSlug}`);
    if (!response.ok) {
        throw new Error("Failed to fetch components");
    }
    return response.json();
};

const fetchAccounts = async (userId: string): Promise<Account[]> => {
    const response = await fetch(`/api/pipedream/accounts?external_user_id=${userId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch accounts");
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
};

const createConnectToken = async (userId: string) => {
    const response = await fetch("/api/pipedream/tokens", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            external_user_id: userId,
            allowed_origins: [window.location.origin],
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to get connect token");
    }

    return response.json();
};

const disconnectAccount = async (accountId: string) => {
    const response = await fetch(`/api/pipedream/accounts/${accountId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to disconnect account");
    }

    return response.json();
};

// Custom Hooks
export const useApps = (searchQuery?: string) => {
    return useQuery({
        queryKey: QUERY_KEYS.apps(searchQuery),
        queryFn: () => fetchApps(searchQuery),
        select: (data) => data.data || [],
        enabled: true, // Always enabled, will show popular apps if no search
    });
};

export const useComponents = (appSlug: string | null) => {
    return useQuery({
        queryKey: QUERY_KEYS.components(appSlug!),
        queryFn: () => fetchComponents(appSlug!),
        select: (data) => data.data || [],
        enabled: !!appSlug, // Only fetch when an app is selected
    });
};

export const useAccounts = (userId: string) => {
    return useQuery({
        queryKey: QUERY_KEYS.accounts(userId),
        queryFn: () => fetchAccounts(userId),
        enabled: !!userId,
    });
};

export const useConnectApp = (userId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (app: App) => {
            const { token } = await createConnectToken(userId);

            // Open Pipedream connect in a new window/popup
            const connectUrl = `https://connect.pipedream.com/?token=${token}&app=${app.name_slug}`;
            const popup = window.open(connectUrl, 'pipedream-connect', 'width=600,height=700');

            // Return a promise that resolves when the popup closes
            return new Promise<void>((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkClosed);
                        resolve();
                    }
                }, 1000);

                // Handle popup blocked or immediately closed
                setTimeout(() => {
                    if (!popup || popup.closed) {
                        clearInterval(checkClosed);
                        reject(new Error("Popup was blocked or closed"));
                    }
                }, 500);
            });
        },
        onSuccess: () => {
            // Refetch accounts after successful connection
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts(userId) });
        },
        onError: (error) => {
            console.error("Connection failed:", error);
        },
    });
};

export const useDisconnectAccount = (userId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: disconnectAccount,
        onSuccess: () => {
            // Refetch accounts after successful disconnection
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts(userId) });
        },
        onError: (error) => {
            console.error("Disconnection failed:", error);
        },
    });
};

// Helper hook for getting connected accounts for a specific app
export const useConnectedAccounts = (userId: string, appSlug: string) => {
    const { data: accounts = [] } = useAccounts(userId);
    return accounts.filter(account => account.app.name_slug === appSlug);
}; 