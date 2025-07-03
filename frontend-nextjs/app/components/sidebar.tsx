"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useAccounts } from "@/lib/hooks/use-pipedream";
import {
    HomeIcon,
    Cog6ToothIcon,
    EnvelopeIcon,
    PlusIcon,
    BoltIcon,
    ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";
import {
    HomeIcon as HomeIconSolid,
    Cog6ToothIcon as Cog6ToothIconSolid,
    EnvelopeIcon as EnvelopeIconSolid,
    BoltIcon as BoltIconSolid,
    ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid
} from "@heroicons/react/24/solid";
import clsx from "clsx";

const navigation = [
    { name: "Home", href: "/", icon: HomeIcon, activeIcon: HomeIconSolid },
    { name: "AI Assistant", href: "/ai", icon: ChatBubbleLeftRightIcon, activeIcon: ChatBubbleLeftRightIconSolid },
    { name: "Connect Services", href: "/connect", icon: BoltIcon, activeIcon: BoltIconSolid },
];

const conditionalNavigation = [
    {
        name: "Mail Setup",
        href: "/mail",
        icon: EnvelopeIcon,
        activeIcon: EnvelopeIconSolid,
        condition: (accounts: any[]) => accounts.some(acc => acc.app.name_slug === "gmail")
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user } = useUser();
    const { data: accounts = [] } = useAccounts(user?.id || "");

    // Filter conditional navigation based on connected accounts
    const visibleConditionalNav = conditionalNavigation.filter(item =>
        item.condition ? item.condition(accounts) : true
    );

    const allNavigation = [...navigation, ...visibleConditionalNav];

    return (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
                <Link href="/" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <BoltIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900">Minimal Agent</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
                {allNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={clsx(
                                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Connected Services Summary */}
            {accounts.length > 0 && (
                <div className="p-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Connected Services</h3>
                    <div className="space-y-2">
                        {accounts.slice(0, 3).map((account) => (
                            <div key={account.id} className="flex items-center space-x-2">
                                <img
                                    src={account.app.img_src}
                                    alt={account.app.name}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm text-gray-600 truncate">
                                    {account.app.name}
                                </span>
                            </div>
                        ))}
                        {accounts.length > 3 && (
                            <div className="text-xs text-gray-500">
                                +{accounts.length - 3} more services
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User Info */}
            {user && (
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                        <img
                            className="w-8 h-8 rounded-full"
                            src={user.imageUrl}
                            alt={user.fullName || "User avatar"}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user.fullName || user.emailAddresses[0]?.emailAddress}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user.emailAddresses[0]?.emailAddress}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 