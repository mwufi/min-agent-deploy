import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PipedreamConnect from "@/app/_template/components/pipedream-connect-component";

export default async function ConnectPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    return <PipedreamConnect userId={userId} />;
} 