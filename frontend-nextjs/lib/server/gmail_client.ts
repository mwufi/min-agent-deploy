import pd from "./pipedream_client";

async function getGmailAccounts(userId: string) {
    const accounts = await pd.getAccounts({
        external_user_id: userId,
    });
    const response = await accounts;
    const gmailAccounts = response.data?.filter((account: any) =>
        account.app?.name?.toLowerCase() === "gmail"
    ) || [];
    console.log("gmail accounts", gmailAccounts);
    return gmailAccounts;
}

export const getGmailMessages = async (userId: string, query: string) => {
    try {
        const gmailAccounts = await getGmailAccounts(userId);
        if (gmailAccounts.length === 0) {
            throw new Error('No Gmail accounts found');
        }
        // Make the proxy request using Pipedream SDK with correct signature
        const response = await pd.makeProxyRequest(
            {
                searchParams: {
                    account_id: gmailAccounts[0].id,
                    external_user_id: userId,
                }
            },
            {
                url: "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                options: {
                    method: "GET"
                }
            }
        );

        return response;
    } catch (error) {
        console.error('Error making Gmail proxy request:', error);
        throw new Error('Failed to fetch Gmail messages');
    }
}