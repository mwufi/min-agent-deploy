'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/20/solid';

export function FindEmailsByLabel({ result }: { result: any }) {
  const [showLabels, setShowLabels] = useState(false);
  
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-2">
              {result.error}
            </p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mb-3">{result.suggestion}</p>
            )}
            {result.availableLabels && (
              <div>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mb-2"
                >
                  {showLabels ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  Show available labels ({result.availableLabels.length})
                </button>
                {showLabels && (
                  <div className="bg-white rounded-md p-3 border border-red-100">
                    <div className="flex flex-wrap gap-2">
                      {result.availableLabels.map((label: string, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const messages = result.messages || [];

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        🏷️ Emails in "{result.labelName}"
        <span className="text-sm font-normal text-gray-500">({messages.length} found)</span>
      </h3>
      
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message: any) => (
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
          <div className="text-gray-400 text-4xl mb-2">📭</div>
          <p className="text-gray-600">{result.suggestion || 'No emails found in this label'}</p>
        </div>
      )}
    </div>
  );
}

export function SearchEmailsSmartly({ result }: { result: any }) {
  const [showAttempts, setShowAttempts] = useState(false);
  const messages = result.messages || [];
  
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        🔍 Smart Search Results for "{result.originalQuery || result.query}"
      </h3>
      
      {result.alternativeSearchesAttempted && result.alternativeSearchesAttempted.length > 0 && (
        <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600">💡</span>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                No results found for original query. Tried {result.alternativeSearchesAttempted.length} alternative searches.
              </p>
              <button
                onClick={() => setShowAttempts(!showAttempts)}
                className="text-sm text-yellow-600 hover:text-yellow-800 font-medium flex items-center gap-1 mt-1"
              >
                {showAttempts ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                Show search attempts
              </button>
              {showAttempts && (
                <div className="mt-2 space-y-1">
                  {result.alternativeSearchesAttempted.map((attempt: any, idx: number) => (
                    <div key={idx} className="text-xs text-yellow-700">
                      • "{attempt.query}" - {attempt.resultCount} results
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message: any) => (
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-3">🔍</div>
            <p className="text-gray-600 font-medium mb-3">No emails found</p>
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="text-left max-w-md mx-auto">
                <p className="text-sm text-gray-700 font-medium mb-2">Try these suggestions:</p>
                <ul className="space-y-1">
                  {result.suggestions.map((suggestion: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AddLabelByName({ result }: { result: any }) {
  const [showLabels, setShowLabels] = useState(false);
  
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-2">
              {result.error}
            </p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mb-3">{result.suggestion}</p>
            )}
            {result.availableLabels && (
              <div>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 mb-2"
                >
                  {showLabels ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  Show available labels
                </button>
                {showLabels && (
                  <div className="bg-white rounded-md p-3 border border-red-100">
                    <div className="flex flex-wrap gap-2">
                      {result.availableLabels.map((label: string, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-blue-600">🏷️</span>
        <p className="text-sm text-blue-800">
          Label "{result.labelAdded}" added successfully to message
        </p>
        <p className="text-xs text-blue-600">
          (ID: {result.messageId})
        </p>
      </div>
    </div>
  );
}

export function RemoveLabelByName({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-2">
              {result.error}
            </p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600">🏷️</span>
        <p className="text-sm text-yellow-800">
          Label "{result.labelRemoved}" removed from message
        </p>
        <p className="text-xs text-yellow-600">
          (ID: {result.messageId})
        </p>
      </div>
    </div>
  );
}

// Enhanced versions of existing tools with better error handling
export function ListRecentThreadsEnhanced({ result }: { result: any }) {
  if (result.error) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600 text-xl">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 mb-2">
              {result.error}
            </p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const threads = result.threads || [];

  if (threads.length === 0 && result.suggestions) {
    return (
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          📧 Email Search - No Results
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <div className="text-gray-400 text-4xl mb-3">📭</div>
            <p className="text-gray-600 font-medium mb-3">No emails found matching your search</p>
            <div className="text-left max-w-md mx-auto">
              <p className="text-sm text-gray-700 font-medium mb-2">Suggestions:</p>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal thread display
  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
        📧 Recent Email Threads ({threads.length})
        {result.accountEmail && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            from {result.accountEmail}
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {threads.map((thread: any) => (
          <div key={thread.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
            <h4 className="font-medium text-gray-900 truncate">
              {thread.subject || '(No subject)'}
            </h4>
            <p className="text-sm text-gray-600 mt-1">{thread.from}</p>
            <p className="text-sm text-gray-500 truncate mt-1">{thread.snippet}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-gray-400">
                {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
              </span>
              {thread.accountEmail && (
                <span className="text-xs text-gray-400">
                  {thread.accountEmail}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}