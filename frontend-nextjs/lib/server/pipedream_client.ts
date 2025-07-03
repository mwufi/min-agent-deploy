import { createBackendClient, ProjectEnvironment } from "@pipedream/sdk";

// This code runs on your server
const pd = createBackendClient({
    environment: process.env.PIPEDREAM_ENVIRONMENT! as ProjectEnvironment || "development",
    credentials: {
        clientId: process.env.PIPEDREAM_CLIENT_ID!,
        clientSecret: process.env.PIPEDREAM_CLIENT_SECRET!,
    },
    projectId: process.env.PIPEDREAM_PROJECT_ID!
});

export default pd;