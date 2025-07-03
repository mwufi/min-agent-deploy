'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, addToolResult } = useChat({
    api: '/api/ai/chat',
    maxSteps: 10,
  });

  const [showJson, setShowJson] = useState<Record<string, boolean>>({});

  const toggleJson = (id: string) => {
    setShowJson(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col w-full max-w-2xl py-24 mx-auto stretch">
      <h1 className="text-2xl font-bold mb-4">AI Pipedream Assistant</h1>
      {messages?.map(message => (
        <div key={message.id} className="whitespace-pre-wrap py-2">
          <strong>{`${message.role}: `}</strong>
          {message.parts.map((part, index) => {
            switch (part.type) {
              // render text parts as simple text:
              case 'text':
                return <span key={index}>{part.text}</span>;

              // for tool invocations, distinguish between the tools and the state:
              case 'tool-invocation': {
                const callId = part.toolInvocation.toolCallId;

                switch (part.toolInvocation.toolName) {
                  case 'getConnectedServices': {
                    switch (part.toolInvocation.state) {
                      case 'call':
                        return <div key={callId}>Getting connected services...</div>;
                      case 'result':
                        return (
                          <div key={callId} className="py-2">
                            <p>Here are your connected services:</p>
                            <ul className="list-disc list-inside">
                              {(part.toolInvocation.result as any)?.map((service: any) => (
                                <li key={service.id}>{service.name}</li>
                              ))}
                            </ul>
                          </div>
                        );
                    }
                    break;
                  }

                  case 'getConnectionDetails': {
                    switch (part.toolInvocation.state) {
                      case 'call':
                        return (
                          <div key={callId}>
                            Getting connection details for {part.toolInvocation.args.id}...
                          </div>
                        );
                      case 'result':
                        const result = part.toolInvocation.result as any;
                        return (
                          <div key={callId} className="py-2">
                            <p>Connection details for {result?.id}:</p>
                            <button
                              onClick={() => toggleJson(result?.id)}
                              className="text-blue-500"
                            >
                              {showJson[result?.id] ? 'Hide' : 'Show'} JSON
                            </button>
                            {showJson[result?.id] && (
                              <pre className="bg-gray-100 p-2 rounded">
                                {JSON.stringify(result, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                    }
                    break;
                  }

                  case 'searchForPipedreamApps': {
                    switch (part.toolInvocation.state) {
                      case 'call':
                        return (
                          <div key={callId}>
                            Searching for apps: {part.toolInvocation.args.query}...
                          </div>
                        );
                      case 'result':
                        const apps = part.toolInvocation.result as any;
                        return (
                          <div key={callId} className="py-2">
                            <p>I found the following apps:</p>
                            <ul className="list-disc list-inside">
                              {apps?.map((app: any) => (
                                <li key={app.app} className="flex items-center">
                                  {app.name}
                                  <button
                                    onClick={() => alert(`Connecting to ${app.name}...`)}
                                    className="ml-2 bg-blue-500 text-white px-2 py-1 rounded"
                                  >
                                    Connect
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                    }
                    break;
                  }
                }
                return null;
              }

              default:
                return null;
            }
          })}
          <br />
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-2xl p-2 mb-8 border border-gray-300 rounded shadow-xl"
          value={input}
          placeholder="Ask about your Pipedream connections..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}
