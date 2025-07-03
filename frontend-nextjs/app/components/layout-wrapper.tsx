"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";

const publicRoutes = ["/sign-in", "/sign-up"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isSignedIn, isLoaded } = useUser();
    const pathname = usePathname();

    // Don't show sidebar on public routes or while loading
    const shouldShowSidebar = isLoaded && isSignedIn && !publicRoutes.some(route => pathname.startsWith(route));

    if (!shouldShowSidebar) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-auto">
                {children}
            </main>
        </div>
    );
} 