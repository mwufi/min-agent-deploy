import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFrontendClient } from "@pipedream/sdk/browser";
import { App, Component, Account, ComponentDefinition } from "@/app/_template/components/pipedream_connect/types";

// Query Keys
const QUERY_KEYS = {
    apps: (search?: string) => ["apps", search] as const,
    components: (appSlug: string) => ["components", appSlug] as const,
    componentDefinition: (componentKey: string) => ["componentDefinition", componentKey] as const,
    accounts: (userId: string) => ["accounts", userId] as const,
    gmailTriggers: (userId: string) => ["gmailTriggers", userId] as const,
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

const deployTrigger = async ({
    externalUserId,
    gmailAccountId,
    triggerType = "gmail-new-email-received"
}: {
    externalUserId: string;
    gmailAccountId?: string;
    triggerType?: string;
}) => {
    const response = await fetch("/api/pipedream/triggers/deploy", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            externalUserId,
            gmailAccountId,
            triggerType,
            timer: { "intervalSeconds": 180 }
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to deploy trigger");
    }

    return response.json();
};

const fetchGmailTriggers = async (userId: string) => {
    const response = await fetch(`/api/pipedream/triggers/list?external_user_id=${userId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch Gmail triggers");
    }
    const data = await response.json();
    return data.data || [];
};

const fetchComponentDefinition = async (componentKey: string): Promise<{ data: ComponentDefinition }> => {
    const response = await fetch(`/api/pipedream/components/definition/${componentKey}`);
    if (!response.ok) {
        throw new Error("Failed to fetch component definition");
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

            const pd = createFrontendClient();

            return new Promise<void>((resolve, reject) => {
                pd.connectAccount({
                    app: app.name_slug,
                    token: token,
                    onSuccess: (account) => {
                        console.log(`Account successfully connected: ${account.id}`);
                        resolve();
                    },
                    onError: (err) => {
                        console.error(`Connection error: ${err.message}`);
                        reject(new Error(err.message));
                    }
                });
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

export const useDeployTrigger = () => {
    return useMutation({
        mutationFn: deployTrigger,
        onSuccess: (data) => {
            console.log("Trigger deployed successfully:", data);
        },
        onError: (error) => {
            console.error("Trigger deployment failed:", error);
        },
    });
};

export const useGmailTriggers = (userId: string) => {
    return useQuery({
        queryKey: QUERY_KEYS.gmailTriggers(userId),
        queryFn: () => fetchGmailTriggers(userId),
        enabled: !!userId,
    });
};

export const useComponentDefinition = (componentKey: string | null) => {
    return useQuery({
        queryKey: QUERY_KEYS.componentDefinition(componentKey!),
        queryFn: () => fetchComponentDefinition(componentKey!),
        select: (data) => data.data,
        enabled: !!componentKey, // Only fetch when a component is selected
    });
};

// Helper hook for getting connected accounts for a specific app
export const useConnectedAccounts = (userId: string, appSlug: string) => {
    const { data: accounts = [] } = useAccounts(userId);
    return accounts.filter(account => account.app.name_slug === appSlug);
}; 