'use client';

import { useChat } from '@ai-sdk/react';
import { useUser } from '@clerk/nextjs';
import { useState, useCallback } from 'react';
import { redirect } from 'next/navigation';
import { MessageContent } from '../components/chat/MessageContent';
import { ToolRenderer } from '../components/chat/tools/ToolRenderer';
import { GmailAccountSelector } from '../components/chat/GmailAccountSelector';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { SparklesIcon } from '@heroicons/react/20/solid';

export default function Chat() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [selectedGmailAccountId, setSelectedGmailAccountId] = useState<string | null>(null);
  const [selectedGmailAccountEmail, setSelectedGmailAccountEmail] = useState<string | null>(null);
  
  const { messages, input, handleInputChange, handleSubmit, addToolResult } = useChat({
    api: '/api/ai/chat',
    maxSteps: 10,
    body: {
      selectedGmailAccountId,
      selectedGmailAccountEmail,
    },
  });

  const [showJson, setShowJson] = useState<Record<string, boolean>>({});

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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

  const handleAccountChange = useCallback((accountId: string | null, accountEmail: string | null) => {
    setSelectedGmailAccountId(accountId);
    setSelectedGmailAccountEmail(accountEmail);
  }, []);

  const quickActions = [
    { label: "📧 Recent emails", prompt: "Show me my recent emails" },
    { label: "🔍 Search emails", prompt: "Search for unread emails" },
    { label: "📮 Send email", prompt: "Help me compose an email" },
    { label: "🔗 My services", prompt: "What services do I have connected?" },
    { label: "🌤️ Weather", prompt: "What's the weather like?" },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Assistant</h1>
                <p className="text-sm text-gray-600">
                  Hi {user?.firstName || 'there'}! I can help with emails, services, and more.
                </p>
              </div>
            </div>
            
            {/* Gmail Account Selector */}
            <div className="flex items-center gap-3">
              <GmailAccountSelector
                selectedAccountId={selectedGmailAccountId}
                onAccountChange={handleAccountChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-600 mb-2">I can assist with emails, connected services, and more.</p>
              
              {selectedGmailAccountEmail && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-700 mb-6">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="text-red-600 text-xs font-medium">G</span>
                  </div>
                  <span>Working with: {selectedGmailAccountEmail}</span>
                </div>
              )}
              
              {selectedGmailAccountId === null && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 mb-6">
                  <span>Working with: All Gmail accounts</span>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(undefined, { data: { content: action.prompt } })}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(message => (
            <div key={message.id} className="mb-6">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                }`}>
                  {message.role === 'user' ? '👤' : '✨'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 mb-1">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </div>

                  <div className={`rounded-lg ${
                    message.role === 'user' 
                      ? 'bg-blue-50 px-4 py-3' 
                      : ''
                  }`}>
                    {message.parts.map((part, index) => {
                      switch (part.type) {
                        case 'text':
                          return message.role === 'user' ? (
                            <div key={index} className="text-gray-700">
                              {part.text}
                            </div>
                          ) : (
                            <MessageContent key={index} content={part.text} />
                          );

                        case 'tool-invocation':
                          return (
                            <div key={part.toolInvocation.toolCallId} className="my-4">
                              <ToolRenderer 
                                toolInvocation={part.toolInvocation} 
                                showJson={showJson}
                                toggleJson={toggleJson}
                              />
                            </div>
                          );
                      }
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              value={input}
              placeholder="Ask me anything..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2 transition-all"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}