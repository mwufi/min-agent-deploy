import { GetTriggersOpts, GetTriggersResponse, V1DeployedComponent } from "@pipedream/sdk";
import pd from "@/lib/server/pipedream_client";

export const getTriggers = async (externalUserId: string) => {
    // List all deployed triggers for the specified user
    const requestOpts: GetTriggersOpts = {
        externalUserId: externalUserId,
    };
    const response: GetTriggersResponse = await pd.getTriggers(requestOpts);

    const {
        data: triggers,  // The list of deployed triggers
    }: {
        data: V1DeployedComponent[],
    } = response;

    return triggers;
}