'use client';

import { useState, useCallback } from 'react';
import { ChevronDownIcon, ChevronRightIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/20/solid';

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

export function ViewThreadDetails({ result, onReply }: { result: any; onReply?: (threadId: string, replyTo: string, subject: string) => void }) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
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

  const handleReply = useCallback((message: EmailMessage) => {
    setReplyingTo(message.id);
    setReplyText('');
  }, []);

  const sendReply = useCallback(() => {
    if (!replyText.trim() || !replyingTo) return;
    
    const message = messages.find((m: EmailMessage) => m.id === replyingTo);
    if (!message) return;

    setIsReplying(true);
    
    // Call the onReply callback if provided
    if (onReply) {
      onReply(result.id, message.from, message.subject);
    }
    
    // Show success state
    setTimeout(() => {
      setReplyingTo(null);
      setReplyText('');
      setIsReplying(false);
    }, 1000);
  }, [replyText, replyingTo, messages, result.id, onReply]);

  const quickReplies = [
    "Thanks for your email, I'll get back to you soon.",
    "Got it, thanks!",
    "I'll look into this and let you know.",
    "Sounds good to me.",
    "Let me check and get back to you."
  ];

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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Date: {message.date}</p>
                      <p className="text-xs text-gray-500">Message ID: {message.id}</p>
                    </div>
                    {idx === messages.length - 1 && (
                      <button
                        onClick={() => handleReply(message)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Reply
                      </button>
                    )}
                  </div>
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

                {/* Reply Form */}
                {replyingTo === message.id && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Reply to {message.from}</h4>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Quick replies */}
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">Quick replies:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => setReplyText(reply)}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={4}
                    />
                    
                    <div className="flex justify-end gap-2 mt-3">
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                        disabled={isReplying}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendReply}
                        disabled={!replyText.trim() || isReplying}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        {isReplying ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Sending...
                          </>
                        ) : (
                          <>
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Send Reply
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Thread-level reply button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => messages.length > 0 && handleReply(messages[messages.length - 1])}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Reply to Thread
        </button>
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
  const openInGmail = () => {
    // Open Gmail in compose mode with the draft
    window.open('https://mail.google.com/mail/u/0/#drafts', '_blank');
  };

  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-yellow-600 text-xl">📝</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Draft created successfully
              </p>
              
              {/* Draft details */}
              <div className="bg-white rounded-md p-3 border border-yellow-100 space-y-2">
                {result.to && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 w-12">To:</span>
                    <span className="text-sm text-gray-700">{result.to}</span>
                  </div>
                )}
                {result.cc && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 w-12">Cc:</span>
                    <span className="text-sm text-gray-700">{result.cc}</span>
                  </div>
                )}
                {result.subject && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 w-12">Subject:</span>
                    <span className="text-sm text-gray-700 font-medium">{result.subject}</span>
                  </div>
                )}
                {result.accountEmail && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-gray-500 w-12">From:</span>
                    <span className="text-sm text-gray-700">{result.accountEmail}</span>
                  </div>
                )}
                {result.preview && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-1">Preview:</p>
                    <p className="text-sm text-gray-600 line-clamp-3">{result.preview}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={openInGmail}
                  className="text-sm text-yellow-700 hover:text-yellow-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Gmail
                </button>
                <span className="text-xs text-gray-500">
                  Draft ID: {result.draftId}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SendEmail({ result }: { result: any }) {
  const openInGmail = () => {
    // Open Gmail in sent folder
    window.open('https://mail.google.com/mail/u/0/#sent', '_blank');
  };

  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="text-green-600 text-xl">📤</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 mb-2">
              Email sent successfully!
            </p>
            
            {/* Email details */}
            <div className="bg-white rounded-md p-3 border border-green-100 space-y-2">
              {result.to && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 w-12">To:</span>
                  <span className="text-sm text-gray-700">{result.to}</span>
                </div>
              )}
              {result.cc && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 w-12">Cc:</span>
                  <span className="text-sm text-gray-700">{result.cc}</span>
                </div>
              )}
              {result.subject && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 w-12">Subject:</span>
                  <span className="text-sm text-gray-700 font-medium">{result.subject}</span>
                </div>
              )}
              {result.accountEmail && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-gray-500 w-12">From:</span>
                  <span className="text-sm text-gray-700">{result.accountEmail}</span>
                </div>
              )}
              {result.preview && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-1">Message:</p>
                  <p className="text-sm text-gray-600 line-clamp-3">{result.preview}</p>
                </div>
              )}
            </div>
            
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={openInGmail}
                className="text-sm text-green-700 hover:text-green-800 font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View in Gmail
              </button>
              <span className="text-xs text-gray-500">
                Message ID: {result.messageId}
              </span>
            </div>
          </div>
        </div>
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

export function SmartCompose({ result }: { result: any }) {
  const actionIcon = result.action === 'sent' ? '📤' : '📝';
  const actionColor = result.action === 'sent' ? 'green' : 'yellow';
  
  return (
    <div className={`mb-4 bg-${actionColor}-50 border border-${actionColor}-200 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <span className={`text-${actionColor}-600 text-xl`}>{actionIcon}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium text-${actionColor}-800`}>
            Email {result.action === 'sent' ? 'sent' : 'drafted'} successfully!
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">To:</span> {result.recipient}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Subject:</span> {result.subject}
            </p>
            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Preview:</p>
              <p className="text-sm text-gray-700">{result.preview}</p>
            </div>
          </div>
          {result.action === 'sent' && (
            <p className="text-xs text-gray-500 mt-2">
              Message ID: {result.messageId}
            </p>
          )}
          {result.action === 'drafted' && (
            <p className="text-xs text-gray-500 mt-2">
              Draft ID: {result.draftId}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickReply({ result }: { result: any }) {
  const templateNames = {
    acknowledge: 'Acknowledgment',
    schedule_meeting: 'Meeting Request',
    need_more_info: 'Information Request',
    will_review: 'Will Review',
    approved: 'Approval',
    declined: 'Declined',
    out_of_office: 'Out of Office'
  };
  
  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-green-600 text-xl">⚡</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Quick reply sent successfully!
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">To:</span> {result.recipient}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Template:</span> {templateNames[result.template as keyof typeof templateNames]}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Message ID: {result.messageId}
          </p>
        </div>
      </div>
    </div>
  );
}