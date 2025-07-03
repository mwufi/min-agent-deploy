"use client";

import { BoltIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function GmailTrigger({ trigger }: { trigger: any }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div
            key={trigger.id}
            className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 cursor-pointer"
        >
            <div className="flex items-start justify-between mb-3"
                onClick={handleToggle}
            >
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <BoltIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">
                            {trigger.component?.key || "Gmail Email Trigger"}
                        </p>
                        <p className="text-sm text-gray-600">
                            {trigger.component?.name || "Monitoring new emails"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">Active</span>
                </div>
            </div>

            {isOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            Trigger Details
                        </p>
                        <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                                <span className="font-medium">ID:</span>{' '}
                                <code className="bg-white px-2 py-1 rounded text-xs border">
                                    {trigger.id}
                                </code>
                            </p>
                            {trigger.component?.version && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Version:</span> v{trigger.component.version}
                                </p>
                            )}
                            {trigger.status && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Status:</span>{' '}
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${trigger.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {trigger.status}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            Configuration
                        </p>
                        <div className="space-y-1">
                            {trigger.webhook_url && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Webhook:</span>{' '}
                                    <code className="bg-white px-2 py-1 rounded text-xs border break-all">
                                        {trigger.webhook_url}
                                    </code>
                                </p>
                            )}
                            {trigger.created_at && (
                                <p className="text-sm text-gray-600">
                                    <span className="font-medium">Created:</span>{' '}
                                    {new Date(trigger.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            )}

                            {/* Props preview if available */}
                            {trigger.configured_props && Object.keys(trigger.configured_props).length > 0 && (
                                <div className="mt-4 p-3 bg-white rounded border">
                                    <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto mt-2">
                                        {JSON.stringify(trigger.configured_props, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}