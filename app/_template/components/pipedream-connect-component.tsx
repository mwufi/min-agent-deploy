"use client";

import { useState } from "react";
import { App, Component } from "./pipedream_connect/types";
import {
  useApps,
  useComponents,
  useAccounts,
  useConnectApp,
  useDisconnectAccount,
  useComponentDefinition
} from "@/lib/hooks/use-pipedream";
import ComponentDefinitionView from "./ComponentDefinitionView";

export default function PipedreamConnect({ userId }: { userId: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);

  // TanStack Query hooks
  const { data: apps = [], isLoading: appsLoading, error: appsError } = useApps(searchQuery);
  const { data: components = [], isLoading: componentsLoading } = useComponents(selectedApp?.name_slug || null);
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts(userId);
  const { data: componentDefinition, isLoading: definitionLoading } = useComponentDefinition(selectedComponent?.key || null);
  const connectAppMutation = useConnectApp(userId);
  const disconnectAccountMutation = useDisconnectAccount(userId);

  // Handlers
  const handleSearch = () => {
    // The query will automatically refetch with the new searchQuery
    // No manual fetching needed!
  };

  const handleSelectApp = (app: App) => {
    setSelectedApp(app);
    setSelectedComponent(null); // Clear selected component when switching apps
    // Components will automatically load due to the useComponents hook
  };

  const handleSelectComponent = (component: Component) => {
    setSelectedComponent(component);
    // Component definition will automatically load due to the useComponentDefinition hook
  };

  const handleConnectApp = async (app: App) => {
    try {
      await connectAppMutation.mutateAsync(app);
    } catch (error) {
      // Error is handled by the mutation itself
      console.error("Connection failed:", error);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) {
      return;
    }

    try {
      await disconnectAccountMutation.mutateAsync(accountId);
    } catch (error) {
      // Error is handled by the mutation itself
      console.error("Disconnection failed:", error);
    }
  };

  const getConnectedAccounts = (appSlug: string) => {
    return accounts.filter(account => account.app.name_slug === appSlug);
  };

  // Combined error state
  const error = appsError || connectAppMutation.error || disconnectAccountMutation.error;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900">Connect to Services</h1>
            <p className="mt-2 text-gray-600">
              Discover and connect to thousands of services through Pipedream
            </p>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {error instanceof Error ? error.message : "An error occurred"}
              </p>
            </div>
          )}

          {/* Connected Accounts Summary */}
          {!accountsLoading && accounts.length > 0 && (
            <div className="p-6 bg-blue-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Connected Accounts</h2>
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-sm"
                  >
                    <img
                      src={account.app.img_src}
                      alt={account.app.name}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium">{account.app.name}</span>
                    <span className="text-xs text-gray-500">({account.name})</span>
                    <button
                      onClick={() => handleDisconnectAccount(account.id)}
                      disabled={disconnectAccountMutation.isPending}
                      className="text-red-500 hover:text-red-700 text-xs ml-1 disabled:opacity-50"
                      title="Disconnect"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search for services (e.g., Slack, Gmail, Notion, Airtable...)"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={appsLoading || !searchQuery.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {appsLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* Apps Grid */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Popular Services"}
            </h2>

            {appsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading services...</span>
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
                <p className="mt-1 text-sm text-gray-500">Try searching for a different service name.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.map((app) => {
                  const connectedAccounts = getConnectedAccounts(app.name_slug);
                  const hasConnections = connectedAccounts.length > 0;
                  const isConnecting = connectAppMutation.isPending && connectAppMutation.variables?.name_slug === app.name_slug;

                  return (
                    <div
                      key={app.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {app.img_src && (
                          <img
                            src={app.img_src}
                            alt={app.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                          <p className="text-sm text-gray-500 mb-1">{app.name_slug}</p>
                          {hasConnections && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {connectedAccounts.length} connected
                            </span>
                          )}
                        </div>
                      </div>

                      {app.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {app.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-4">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {app.auth_type}
                        </span>
                        {app.categories?.slice(0, 2).map((cat, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSelectApp(app)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          View Actions
                        </button>
                        <button
                          onClick={() => handleConnectApp(app)}
                          disabled={isConnecting}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                          {isConnecting ? "Connecting..." : hasConnections ? "Add Another" : "Connect"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected App Components */}
          {selectedApp && (
            <div className="border-t border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                {selectedApp.img_src && (
                  <img
                    src={selectedApp.img_src}
                    alt={selectedApp.name}
                    className="w-8 h-8 rounded"
                  />
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  Available Actions for {selectedApp.name}
                </h2>
              </div>

              {componentsLoading ? (
                <div className="flex items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading actions...</span>
                </div>
              ) : components.length === 0 ? (
                <div className="text-gray-500 py-8">No actions found for this service</div>
              ) : (
                <div className="grid gap-3">
                  {components.map((component) => (
                    <div
                      key={component.key}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleSelectComponent(component)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{component.name}</h4>
                          <p className="text-sm text-gray-500 font-mono">{component.key}</p>
                          {component.description && (
                            <p className="text-sm text-gray-600 mt-2">
                              {component.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-400">
                            v{component.version}
                          </span>
                          {component.type && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {component.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectComponent(component);
                          }}
                        >
                          View Configuration →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Component Definition */}
          {selectedComponent && (
            <ComponentDefinitionView
              selectedComponent={selectedComponent}
              componentDefinition={componentDefinition}
              definitionLoading={definitionLoading}
              onClose={() => setSelectedComponent(null)}
            />
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>User ID: <code className="bg-gray-100 px-2 py-1 rounded">{userId}</code></p>
              <p>Total Connected: {accounts.length} accounts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
