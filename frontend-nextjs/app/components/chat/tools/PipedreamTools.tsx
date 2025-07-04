'use client';

export const PipedreamTools = {
  ConnectedServices: ({ result }: { result: any[] }) => {
    const services = result || [];
    
    return (
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          🔗 Connected Services ({services.length})
        </h3>
        {services.length > 0 ? (
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
  },

  ConnectionDetails: ({ result, showJson, toggleJson }: { result: any; showJson: Record<string, boolean>; toggleJson?: (id: string) => void }) => {
    const connection = result;
    
    return (
      <div className="mb-4">
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
          {toggleJson && (
            <>
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
            </>
          )}
        </div>
      </div>
    );
  },

  SearchApps: ({ result, args }: { result: any[]; args: any }) => {
    const apps = result || [];
    
    return (
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          🔎 Found {apps.length} apps for "{args.query}"
        </h3>
        {apps.length > 0 ? (
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
            <p className="text-gray-600">No apps found for "{args.query}"</p>
            <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    );
  },

  GmailMessages: ({ result }: { result: any }) => {
    const messages = result || [];
    
    return (
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          📧 Gmail Messages ({messages.length})
        </h3>
        {messages.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {messages.map((message: any) => (
              <div key={message.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{message.subject}</h4>
                    <p className="text-sm text-gray-500">{message.from}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-gray-400 text-4xl mb-2">📧</div>
            <p className="text-gray-600">No messages found</p>
          </div>
        )}
      </div>
    );
  }
};