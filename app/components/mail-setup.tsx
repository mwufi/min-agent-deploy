"use client";

import { useState } from "react";
import { useAccounts, useDeployTrigger, useGmailTriggers } from "@/lib/hooks/use-pipedream";
import {
    EnvelopeIcon,
    Cog6ToothIcon,
    BoltIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import GmailTrigger from "./triggers/GmailTrigger";

interface MailTemplate {
    id: string;
    name: string;
    description: string;
    category: "auto-reply" | "filtering" | "forwarding" | "analytics";
    icon: React.ComponentType<any>;
    enabled: boolean;
}

const mailTemplates: MailTemplate[] = [
    {
        id: "auto-reply",
        name: "Smart Auto-Reply",
        description: "Automatically reply to emails based on content and sender",
        category: "auto-reply",
        icon: EnvelopeIcon,
        enabled: false,
    },
    {
        id: "priority-filter",
        name: "Priority Email Filter",
        description: "Filter and categorize emails by importance automatically",
        category: "filtering",
        icon: BoltIcon,
        enabled: false,
    },
    {
        id: "smart-forward",
        name: "Smart Forwarding",
        description: "Forward specific emails to team members or other accounts",
        category: "forwarding",
        icon: Cog6ToothIcon,
        enabled: false,
    },
];

export default function MailSetup({ userId }: { userId: string }) {
    const { data: accounts = [] } = useAccounts(userId);
    const [templates, setTemplates] = useState(mailTemplates);
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [deployedTriggers, setDeployedTriggers] = useState<Record<string, any>>({});
    const deployTriggerMutation = useDeployTrigger();
    const { data: gmailTriggers = [] } = useGmailTriggers(userId);
    console.log("gmailTriggers", gmailTriggers);

    const gmailAccounts = accounts.filter(acc => acc.app.name_slug === "gmail");

    const toggleTemplate = (templateId: string) => {
        setTemplates(prev =>
            prev.map(template =>
                template.id === templateId
                    ? { ...template, enabled: !template.enabled }
                    : template
            )
        );
    };

    const deployGmailTrigger = async (gmailAccountId: string) => {
        try {
            const result = await deployTriggerMutation.mutateAsync({
                externalUserId: userId,
                gmailAccountId: gmailAccountId,
                triggerType: "gmail-new-email-received"
            });

            // Store the deployed trigger info
            setDeployedTriggers(prev => ({
                ...prev,
                [gmailAccountId]: result.data
            }));

            console.log("Gmail trigger deployed successfully:", result.message);
        } catch (error) {
            console.error("Failed to deploy Gmail trigger:", error);
        }
    };

    const deployForAllGmailAccounts = async () => {
        for (const account of gmailAccounts) {
            if (!deployedTriggers[account.id]) {
                await deployGmailTrigger(account.id);
                // Add small delay between deployments
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    };

    const deployForAnyGmailAccount = async () => {
        try {
            // Let backend pick the first Gmail account automatically
            const result = await deployTriggerMutation.mutateAsync({
                externalUserId: userId,
                triggerType: "gmail-new-email-received"
                // No gmailAccountId specified - backend will use first account
            });

            // Store the deployed trigger info using the account ID returned from backend
            if (result.data.accountId) {
                setDeployedTriggers(prev => ({
                    ...prev,
                    [result.data.accountId]: result.data
                }));
            }

            console.log("Gmail trigger deployed successfully:", result.message);
        } catch (error) {
            console.error("Failed to deploy Gmail trigger:", error);
        }
    };

    if (gmailAccounts.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">No Gmail Account Connected</h1>
                        <p className="text-gray-600 mb-6">
                            You need to connect a Gmail account first to access mail setup features.
                        </p>
                        <a
                            href="/connect"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <BoltIcon className="w-5 h-5 mr-2" />
                            Connect Gmail
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="bg-white rounded-lg shadow-sm">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Mail Setup</h1>
                                <p className="mt-2 text-gray-600">
                                    Configure automated workflows for your connected Gmail accounts
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                    <span className="text-sm font-medium text-green-700">
                                        {gmailAccounts.length} Gmail account{gmailAccounts.length > 1 ? 's' : ''} connected
                                    </span>
                                </div>
                                {gmailTriggers.length > 0 && (
                                    <div className="flex items-center space-x-2">
                                        <BoltIcon className="w-5 h-5 text-blue-500" />
                                        <span className="text-sm font-medium text-blue-700">
                                            {gmailTriggers.length} trigger{gmailTriggers.length > 1 ? 's' : ''} active
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {deployTriggerMutation.error && (
                        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">
                                Failed to deploy trigger: {deployTriggerMutation.error.message}
                            </p>
                        </div>
                    )}

                    {/* Connected Gmail Accounts */}
                    <div className="p-6 bg-blue-50 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-900">Connected Gmail Accounts</h2>
                            <div className="flex gap-2">
                                {gmailAccounts.length === 1 && !deployedTriggers[gmailAccounts[0].id] && (
                                    <button
                                        onClick={deployForAnyGmailAccount}
                                        disabled={deployTriggerMutation.isPending}
                                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                    >
                                        {deployTriggerMutation.isPending ? 'Deploying...' : 'Quick Deploy'}
                                    </button>
                                )}
                                {gmailAccounts.length > 1 && (
                                    <button
                                        onClick={deployForAllGmailAccounts}
                                        disabled={deployTriggerMutation.isPending || gmailAccounts.every(acc => deployedTriggers[acc.id])}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                                    >
                                        {deployTriggerMutation.isPending ? 'Deploying...' : 'Deploy All Triggers'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="grid gap-3">
                            {gmailAccounts.map((account) => {
                                const isDeployed = deployedTriggers[account.id];
                                const isDeployingTrigger = deployTriggerMutation.isPending;

                                return (
                                    <div
                                        key={account.id}
                                        className="bg-white p-4 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <img
                                                    src={account.app.img_src}
                                                    alt="Gmail"
                                                    className="w-8 h-8 rounded"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900">{account.name}</p>
                                                    <p className="text-sm text-gray-500">Gmail Account</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                <span className="text-sm text-green-700">Connected</span>
                                            </div>
                                        </div>

                                        {/* Gmail Trigger Section */}
                                        <div className="border-t pt-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Email Monitoring</p>
                                                    <p className="text-xs text-gray-500">
                                                        {isDeployed
                                                            ? "Trigger deployed - monitoring new emails"
                                                            : "Deploy trigger to monitor new emails"
                                                        }
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => deployGmailTrigger(account.id)}
                                                    disabled={isDeployed || isDeployingTrigger}
                                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${isDeployed
                                                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                        : isDeployingTrigger
                                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                            : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {isDeployingTrigger ? 'Deploying...' : isDeployed ? 'Deployed' : 'Deploy Trigger'}
                                                </button>
                                            </div>

                                            {isDeployed && (
                                                <div className="mt-2 p-3 bg-green-50 rounded border border-green-200">
                                                    <div className="space-y-1">
                                                        <p className="text-xs text-green-700">
                                                            ✓ Trigger ID: <code className="bg-green-100 px-1 rounded text-xs">{isDeployed.id}</code>
                                                        </p>
                                                        {isDeployed.webhookUrl && (
                                                            <p className="text-xs text-green-700">
                                                                📡 Webhook: <code className="bg-green-100 px-1 rounded text-xs break-all">{isDeployed.webhookUrl}</code>
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-green-600 mt-2">
                                                            ✉️ New emails will be automatically sent to your webhook endpoint
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Gmail Triggers */}
                    {gmailTriggers.length > 0 && (
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Active Gmail Triggers</h2>
                                <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                    {gmailTriggers.length} trigger{gmailTriggers.length > 1 ? 's' : ''} running
                                </span>
                            </div>
                            <div className="grid gap-4">
                                {gmailTriggers.map((trigger: any) => (
                                    <GmailTrigger key={trigger.id} trigger={trigger} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mail Automation Templates */}
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-6 text-gray-900">
                            Available Mail Automations
                        </h2>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {templates.map((template) => {
                                const Icon = template.icon;
                                return (
                                    <div
                                        key={template.id}
                                        className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg ${template.enabled ? 'bg-blue-100' : 'bg-gray-100'
                                                    }`}>
                                                    <Icon className={`w-6 h-6 ${template.enabled ? 'text-blue-600' : 'text-gray-600'
                                                        }`} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${template.category === 'auto-reply' ? 'bg-green-100 text-green-800' :
                                                        template.category === 'filtering' ? 'bg-blue-100 text-blue-800' :
                                                            template.category === 'forwarding' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {template.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleTemplate(template.id)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${template.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${template.enabled ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-4">
                                            {template.description}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-medium ${template.enabled ? 'text-green-700' : 'text-gray-500'
                                                }`}>
                                                {template.enabled ? 'Active' : 'Inactive'}
                                            </span>
                                            <button
                                                onClick={() => setActiveTemplate(template.id)}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                            >
                                                Configure
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    {activeTemplate && (
                        <div className="border-t border-gray-200 p-6 bg-gray-50">
                            <div className="max-w-2xl">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Configure {templates.find(t => t.id === activeTemplate)?.name}
                                </h3>
                                <div className="bg-white rounded-lg p-6 border border-gray-200">
                                    <p className="text-gray-600 mb-4">
                                        Configuration options for this automation will be available soon.
                                        This feature is currently in development.
                                    </p>
                                    <div className="flex space-x-3">
                                        <button
                                            onClick={() => setActiveTemplate(null)}
                                            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            disabled
                                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                                        >
                                            Save Configuration
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <p>User ID: <code className="bg-gray-100 px-2 py-1 rounded">{userId}</code></p>
                            <p>Active Automations: {templates.filter(t => t.enabled).length}/{templates.length}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 