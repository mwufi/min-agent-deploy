'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

interface EmailThread {
  id: string;
  messageCount: number;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  participants: string[];
  accountEmail?: string;
}

interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
}

interface GmailAccount {
  id: string;
  email: string;
  name?: string;
}

export function ListRecentThreads({ result }: { result: any }) {
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const threads = result.threads || [];

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
        📧 Recent Email Threads ({threads.length})
      </h3>
      {threads.length > 0 ? (
        <div className="space-y-2">
          {threads.map((thread: EmailThread) => (
            <div key={thread.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggleThread(thread.id)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {expandedThreads.has(thread.id) ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-900 truncate flex-1">
                      {thread.subject || '(No subject)'}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate mt-1">{thread.from}</p>
                  <p className="text-sm text-gray-500 truncate mt-1">{thread.snippet}</p>
                  {thread.accountEmail && (
                    <p className="text-xs text-gray-400 mt-1">Account: {thread.accountEmail}</p>
                  )}
                </div>
              </button>
              {expandedThreads.has(thread.id) && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Thread ID: {thread.id}</p>
                  <p className="text-sm text-gray-600">Date: {thread.date}</p>
                  {thread.participants && thread.participants.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">Participants:</p>
                      <ul className="mt-1 space-y-1">
                        {thread.participants.map((participant, idx) => (
                          <li key={idx} className="text-sm text-gray-600">{participant}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-gray-400 text-4xl mb-2">📭</div>
          <p className="text-gray-600">No email threads found</p>
        </div>
      )}
    </div>
  );
}

export function ViewThreadDetails({ result }: { result: any }) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messages = result.messages || [];

  const toggleMessage = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        📧 Thread Details ({messages.length} messages)
      </h3>
      <div className="space-y-3">
        {messages.map((message: EmailMessage, idx: number) => (
          <div key={message.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <button
              onClick={() => toggleMessage(message.id)}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-shrink-0 mt-0.5">
                {expandedMessages.has(message.id) ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    Message {idx + 1}
                  </span>
                  {message.labels.includes('UNREAD') && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Unread</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-2">From: {message.from}</p>
                <p className="text-sm text-gray-600">To: {message.to}</p>
                <p className="text-sm text-gray-500 truncate mt-1">{message.snippet}</p>
              </div>
            </button>
            {expandedMessages.has(message.id) && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm text-gray-700">
                    {message.body || message.snippet}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Date: {message.date}</p>
                  <p className="text-xs text-gray-500">Message ID: {message.id}</p>
                  {message.labels.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {message.labels.map((label) => (
                        <span key={label} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FindEmails({ result }: { result: any }) {
  const messages = result.messages || [];
  
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        🔍 Search Results for "{result.query}" ({messages.length} found)
      </h3>
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message: EmailMessage) => (
            <div key={message.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">
                    {message.subject || '(No subject)'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">From: {message.from}</p>
                  <p className="text-sm text-gray-500 truncate mt-2">{message.snippet}</p>
                </div>
                <div className="flex-shrink-0">
                  {message.labels.includes('UNREAD') && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Unread</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-gray-400 text-4xl mb-2">🔍</div>
          <p className="text-gray-600">No emails found matching your search</p>
        </div>
      )}
    </div>
  );
}

export function ArchiveMessage({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">✓</span>
        <p className="text-sm text-green-800">
          Message archived successfully (ID: {result.messageId})
        </p>
      </div>
    </div>
  );
}

export function DeleteMessage({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-red-600">🗑️</span>
        <p className="text-sm text-red-800">
          Message {result.action === 'permanently_deleted' ? 'permanently deleted' : 'moved to trash'} 
          (ID: {result.messageId})
        </p>
      </div>
    </div>
  );
}

export function MarkAsRead({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">{result.markedAs === 'read' ? '📖' : '📘'}</span>
        <p className="text-sm text-blue-800">
          Message marked as {result.markedAs} (ID: {result.messageId})
        </p>
      </div>
    </div>
  );
}

export function DraftMessage({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600">📝</span>
        <p className="text-sm text-yellow-800">
          Draft created successfully (ID: {result.draftId})
        </p>
      </div>
    </div>
  );
}

export function SendEmail({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">📤</span>
        <p className="text-sm text-green-800">
          Email sent successfully!
        </p>
        <p className="text-xs text-green-600">
          Message ID: {result.messageId}
        </p>
      </div>
    </div>
  );
}

export function ReplyInThread({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">↩️</span>
        <p className="text-sm text-green-800">
          Reply sent successfully to thread!
        </p>
        <p className="text-xs text-green-600">
          Message ID: {result.messageId}
        </p>
      </div>
    </div>
  );
}

export function ForwardEmail({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">➡️</span>
        <p className="text-sm text-blue-800">
          Email forwarded successfully!
        </p>
        <p className="text-xs text-blue-600">
          Message ID: {result.messageId}
        </p>
      </div>
    </div>
  );
}

export function ListGmailAccounts({ result }: { result: any }) {
  const accounts = result.accounts || [];
  
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        📧 Connected Gmail Accounts ({accounts.length})
      </h3>
      {accounts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((account: GmailAccount) => (
            <div key={account.id} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">G</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{account.email}</p>
                  {account.name && <p className="text-sm text-gray-500">{account.name}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="text-gray-400 text-4xl mb-2">📧</div>
          <p className="text-gray-600">No Gmail accounts connected</p>
        </div>
      )}
    </div>
  );
}

export function ListLabels({ result }: { result: any }) {
  const labels = result.labels || [];
  const systemLabels = labels.filter((l: any) => l.type === 'system');
  const userLabels = labels.filter((l: any) => l.type === 'user');
  
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        🏷️ Gmail Labels ({labels.length})
      </h3>
      <div className="space-y-3">
        {userLabels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">User Labels</h4>
            <div className="flex flex-wrap gap-2">
              {userLabels.map((label: any) => (
                <span key={label.id} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {systemLabels.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">System Labels</h4>
            <div className="flex flex-wrap gap-2">
              {systemLabels.map((label: any) => (
                <span key={label.id} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AddLabel({ result }: { result: any }) {
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">🏷️</span>
        <p className="text-sm text-blue-800">
          Labels added successfully to message {result.messageId}
        </p>
        <div className="flex gap-1 ml-2">
          {result.labelsAdded.map((label: string) => (
            <span key={label} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}