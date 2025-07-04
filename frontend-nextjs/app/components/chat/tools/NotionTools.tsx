'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, FolderIcon } from '@heroicons/react/20/solid';

interface NotionPage {
  id: string;
  title: string;
  url?: string;
  created?: string;
  lastEdited?: string;
  properties?: Record<string, any>;
}

interface NotionDatabase {
  id: string;
  title: string;
  url?: string;
  properties?: string[];
}

// Get Notion Page
export function GetNotionPage({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const page = result.page;
  return (
    <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <DocumentTextIcon className="w-5 h-5 text-gray-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{page.title}</h3>
          {page.url && (
            <a 
              href={page.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-flex items-center gap-1"
            >
              Open in Notion
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <div className="mt-2 text-xs text-gray-500">
            <span>Created: {new Date(page.created).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>Updated: {new Date(page.lastEdited).toLocaleDateString()}</span>
          </div>
          {page.properties && Object.keys(page.properties).length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Properties:</h4>
              <div className="space-y-1">
                {Object.entries(page.properties).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="text-gray-600">{key}:</span>{' '}
                    <span className="text-gray-900">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Get Notion Page Content
export function GetNotionPageContent({ result }: { result: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const content = result.content;
  const isMarkdown = result.format === 'markdown';

  return (
    <div className="mb-4">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <DocumentTextIcon className="w-5 h-5 text-gray-600" />
            <div className="text-left">
              <h3 className="font-medium text-gray-900">{result.title}</h3>
              <p className="text-sm text-gray-500">
                {isMarkdown ? 'Markdown' : 'Blocks'} format
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 py-3 border-t border-gray-200">
            {result.url && (
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 mb-3 inline-flex items-center gap-1"
              >
                Open in Notion
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <div className="bg-gray-50 rounded-md p-4 overflow-auto max-h-96">
              {isMarkdown ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-700">{content}</pre>
              ) : (
                <pre className="text-xs text-gray-700">
                  {JSON.stringify(content, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Create Notion Page
export function CreateNotionPage({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-green-600 text-xl">✅</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            Page "{result.title}" created successfully!
          </p>
          {result.url && (
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-green-700 hover:text-green-900 mt-2 inline-flex items-center gap-1"
            >
              Open in Notion
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <p className="text-xs text-green-600 mt-1">ID: {result.pageId}</p>
        </div>
      </div>
    </div>
  );
}

// Find Notion Database
export function FindNotionDatabase({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const db = result.database;
  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <FolderIcon className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-900">Found Database: {db.title}</h3>
          {db.url && (
            <a 
              href={db.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-700 hover:text-blue-900 mt-1 inline-flex items-center gap-1"
            >
              Open in Notion
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <p className="text-xs text-blue-600 mt-1">ID: {db.id}</p>
          {db.properties && db.properties.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-blue-800">Properties: {db.properties.join(', ')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Query Notion Database
export function QueryNotionDatabase({ result }: { result: any }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        📊 Database Query Results ({result.count} items)
      </h3>
      {result.results.length > 0 ? (
        <div className="space-y-2">
          {result.results.map((item: any) => (
            <div key={item.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {expandedItems.has(item.id) ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">
                    {Object.values(item.properties).find(v => typeof v === 'string') || 'Untitled'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(item.lastEdited).toLocaleDateString()}
                  </p>
                </div>
              </button>
              {expandedItems.has(item.id) && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  {item.url && (
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center gap-1"
                    >
                      Open in Notion
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <div className="space-y-1">
                    {Object.entries(item.properties).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-700">{key}:</span>{' '}
                        <span className="text-gray-900">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600">No results found</p>
        </div>
      )}
      {result.hasMore && (
        <p className="text-sm text-gray-500 text-center mt-3">
          More results available...
        </p>
      )}
    </div>
  );
}

// Add Notion Database Record
export function AddNotionDatabaseRecord({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-green-600 text-xl">✅</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">
            {result.message}
          </p>
          {result.url && (
            <a 
              href={result.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-green-700 hover:text-green-900 mt-2 inline-flex items-center gap-1"
            >
              Open in Notion
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <p className="text-xs text-green-600 mt-1">ID: {result.recordId}</p>
        </div>
      </div>
    </div>
  );
}

// Search Notion
export function SearchNotion({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        🔍 Search Results ({result.count} items)
      </h3>
      {result.results.length > 0 ? (
        <div className="space-y-3">
          {result.results.map((item: any) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.type === 'page' ? (
                      <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <FolderIcon className="w-4 h-4 text-gray-500" />
                    )}
                    <h4 className="font-medium text-gray-900">{item.title}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last edited: {new Date(item.lastEdited).toLocaleDateString()}
                  </p>
                </div>
                {item.url && (
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Open →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600">No results found</p>
        </div>
      )}
    </div>
  );
}

// Smart Notion Assistant
export function SmartNotionAssistant({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-red-600">❌</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{result.error}</p>
            {result.suggestion && (
              <p className="text-sm text-red-700 italic mt-1">{result.suggestion}</p>
            )}
            {result.supportedActions && (
              <div className="mt-2">
                <p className="text-sm font-medium text-red-800">Supported actions:</p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                  {result.supportedActions.map((action: string, idx: number) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Different displays based on action
  switch (result.action) {
    case 'added_to_database':
      return <AddNotionDatabaseRecord result={result} />;
    case 'created_page':
      return <CreateNotionPage result={result} />;
    case 'search':
      return <SearchNotion result={result} />;
    default:
      return (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600">✨</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">{result.message}</p>
              <pre className="text-xs text-blue-700 mt-2">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
  }
}