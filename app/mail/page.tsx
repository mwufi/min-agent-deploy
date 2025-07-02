import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MailSetup from "@/app/components/mail-setup";

export default async function MailPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    return <MailSetup userId={userId} />;
} 