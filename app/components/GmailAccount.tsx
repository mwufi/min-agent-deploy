import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import GmailTrigger from "./triggers/GmailTrigger";

interface GmailAccountProps {
    account: any;
    triggers: any[];
    onDeployTrigger: (accountId: string) => void;
    isDeployingTrigger: boolean;
}

export default function GmailAccount({
    account,
    triggers,
    onDeployTrigger,
    isDeployingTrigger
}: GmailAccountProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Find triggers that belong to this account
    const accountTriggers = triggers.filter(trigger =>
        trigger.configured_props?.gmail?.authProvisionId === account.id
    );

    const hasTriggers = accountTriggers.length > 0;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Account Header */}
            <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            {isOpen ? (
                                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                            )}
                            <img
                                src={account.app.img_src}
                                alt="Gmail"
                                className="w-8 h-8 rounded"
                            />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            <p className="text-sm text-gray-500">Gmail Account</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {hasTriggers && (
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-green-700 font-medium">
                                    {accountTriggers.length} trigger{accountTriggers.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-700">Connected</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable Content */}
            {isOpen && (
                <div className="border-t border-gray-200 bg-gray-50">
                    {/* Email Monitoring Section */}
                    <div className="p-4 border-b border-gray-200 bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Email Monitoring</p>
                                <p className="text-xs text-gray-500">
                                    {hasTriggers
                                        ? `${accountTriggers.length} trigger${accountTriggers.length > 1 ? 's' : ''} deployed - monitoring new emails`
                                        : "Deploy trigger to monitor new emails"
                                    }
                                </p>
                            </div>
                            {!hasTriggers && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeployTrigger(account.id);
                                    }}
                                    disabled={isDeployingTrigger}
                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${isDeployingTrigger
                                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {isDeployingTrigger ? 'Deploying...' : 'Deploy Trigger'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Active Triggers */}
                    {hasTriggers && (
                        <div className="p-4 space-y-3">
                            {accountTriggers.map((trigger) => (
                                <GmailTrigger key={trigger.id} trigger={trigger} />
                            ))}
                        </div>
                    )}

                    {/* Account Details */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>
                                <span className="font-medium">Account ID:</span>
                                <code className="block bg-white px-2 py-1 rounded mt-1 break-all">{account.id}</code>
                            </div>
                            <div>
                                <span className="font-medium">Status:</span>
                                <span className="block mt-1 text-green-600">✓ Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 