'use client';

import { useChat } from '@ai-sdk/react';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';
import { redirect } from 'next/navigation';
import { Weather } from '../components/weather';

export default function Chat() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { messages, input, handleInputChange, handleSubmit, addToolResult } = useChat({
    api: 'http://127.0.0.1:8000/api/chat',
    maxSteps: 10,
  });

  const [showJson, setShowJson] = useState<Record<string, boolean>>({});

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    redirect('/sign-in');
  }

  const toggleJson = (id: string) => {
    setShowJson(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderLoadingState = (toolName: string, args?: any) => {
    const icons = {
      getConnectedServices: '🔗',
      getConnectionDetails: '🔍',
      searchForPipedreamApps: '🔎'
    };

    return (
      <div className="flex items-center py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
        <div className="flex-1">
          <span className="text-sm font-medium text-blue-900">
            {icons[toolName as keyof typeof icons]} {' '}
            {toolName === 'getConnectedServices' && 'Getting your connected services...'}
            {toolName === 'getConnectionDetails' && `Getting details for connection ${args?.id}...`}
            {toolName === 'searchForPipedreamApps' && `Searching for "${args?.query}"...`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full max-w-4xl py-24 mx-auto stretch">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Pipedream Assistant</h1>
        <p className="text-gray-600">
          Hi {user?.firstName || 'there'}! Ask me about your connected services, search for new apps, or get connection details.
        </p>
      </div>

      {messages?.map(message => (
        <div key={message.id} className="mb-6">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${message.role === 'user'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
              }`}>
              {message.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>

              {message.parts.map((part, index) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <div key={index} className="prose prose-sm max-w-none text-gray-700 mb-4">
                        {part.text}
                      </div>
                    );

                  case 'tool-invocation': {
                    const callId = part.toolInvocation.toolCallId;

                    switch (part.toolInvocation.toolName) {
                      case 'getConnectedServices': {
                        switch (part.toolInvocation.state) {
                          case 'call':
                            return <div key={callId} className="mb-4">{renderLoadingState('getConnectedServices')}</div>;
                          case 'result':
                            const services = part.toolInvocation.result as any[];
                            return (
                              <div key={callId} className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                  🔗 Connected Services ({services?.length || 0})
                                </h3>
                                {services?.length > 0 ? (
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {services.map((service: any) => (
                                      <div key={service.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                          {service.img_src && (
                                            <img
                                              src={service.img_src}
                                              alt={service.name}
                                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">{service.name}</h4>
                                            <p className="text-sm text-gray-500">{service.app_slug}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                              <div className={`w-2 h-2 rounded-full ${service.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                              <span className={`text-xs ${service.healthy ? 'text-green-700' : 'text-red-700'}`}>
                                                {service.healthy ? 'Connected' : 'Issue'}
                                              </span>
                                              {service.auth_type && (
                                                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                  {service.auth_type}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="text-gray-400 text-4xl mb-2">🔌</div>
                                    <p className="text-gray-600">No services connected yet</p>
                                    <p className="text-sm text-gray-500 mt-1">Try asking me to search for apps to connect</p>
                                  </div>
                                )}
                              </div>
                            );
                        }
                        break;
                      }

                      case 'getConnectionDetails': {
                        switch (part.toolInvocation.state) {
                          case 'call':
                            return <div key={callId} className="mb-4">{renderLoadingState('getConnectionDetails', part.toolInvocation.args)}</div>;
                          case 'result':
                            const connection = part.toolInvocation.result as any;
                            return (
                              <div key={callId} className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                  🔍 Connection Details
                                </h3>
                                <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                  <div className="flex items-start gap-3 mb-4">
                                    {connection?.app?.img_src && (
                                      <img
                                        src={connection.app.img_src}
                                        alt={connection.app.name}
                                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                      />
                                    )}
                                    <div className="flex-1">
                                      <h4 className="font-medium text-gray-900">{connection?.name}</h4>
                                      <p className="text-sm text-gray-500">{connection?.app?.name}</p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <div className={`w-2 h-2 rounded-full ${connection?.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className={`text-xs ${connection?.healthy ? 'text-green-700' : 'text-red-700'}`}>
                                          {connection?.healthy ? 'Healthy' : 'Issue detected'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Created:</span>
                                      <span className="text-gray-900">{new Date(connection?.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Updated:</span>
                                      <span className="text-gray-900">{new Date(connection?.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-500">Connection ID:</span>
                                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">{connection?.id}</code>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleJson(connection?.id)}
                                    className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    {showJson[connection?.id] ? 'Hide' : 'Show'} raw data
                                  </button>
                                  {showJson[connection?.id] && (
                                    <pre className="mt-3 text-xs bg-gray-50 p-3 rounded border overflow-auto">
                                      {JSON.stringify(connection, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            );
                        }
                        break;
                      }

                      case 'searchForPipedreamApps': {
                        switch (part.toolInvocation.state) {
                          case 'call':
                            return <div key={callId} className="mb-4">{renderLoadingState('searchForPipedreamApps', part.toolInvocation.args)}</div>;
                          case 'result':
                            const apps = part.toolInvocation.result as any[];
                            return (
                              <div key={callId} className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                  🔎 Found {apps?.length || 0} apps for "{part.toolInvocation.args.query}"
                                </h3>
                                {apps?.length > 0 ? (
                                  <div className="grid gap-4 md:grid-cols-2">
                                    {apps.map((app: any) => (
                                      <div key={app.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3 mb-3">
                                          {app.img_src && (
                                            <img
                                              src={app.img_src}
                                              alt={app.name}
                                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-gray-900 truncate">{app.name}</h4>
                                            <p className="text-sm text-gray-500 mb-1">{app.name_slug}</p>
                                            <div className="flex flex-wrap gap-1">
                                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {app.auth_type}
                                              </span>
                                              {app.categories?.slice(0, 2).map((cat: string, idx: number) => (
                                                <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                  {cat}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        {app.description && (
                                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {app.description}
                                          </p>
                                        )}
                                        <button
                                          onClick={() => window.open('/connect', '_blank')}
                                          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        >
                                          Connect {app.name}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
                                    <div className="text-gray-400 text-4xl mb-2">🔍</div>
                                    <p className="text-gray-600">No apps found for "{part.toolInvocation.args.query}"</p>
                                    <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                                  </div>
                                )}
                              </div>
                            );
                        }
                        break;
                      }

                      case 'get_current_weather': {
                        switch (part.toolInvocation.state) {
                          case 'call':
                            return <div key={callId} className="mb-4">{renderLoadingState('get_current_weather', part.toolInvocation.args)}</div>;
                          case 'result':
                            const weather = part.toolInvocation.result as any;
                            return (
                              <div key={callId} className="mb-4">
                                <Weather weatherAtLocation={weather} />
                              </div>
                            );
                        }
                        break;
                      }

                      default:
                        return null;
                    }
                  }
                }
              })}
            </div>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white p-4 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={input}
              placeholder="Ask about your connections, search for apps, or get details..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              Send
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleSubmit(undefined, { data: { content: "What services do I have connected?" } })}
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded"
            >
              Show my connections
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(undefined, { data: { content: "Search for Gmail apps" } })}
              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded"
            >
              Search Gmail apps
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
