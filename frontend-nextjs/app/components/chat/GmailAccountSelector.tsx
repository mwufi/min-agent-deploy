'use client';

import { useState, useEffect } from 'react';
import { useGmailAccounts } from '@/lib/hooks/use-gmail-accounts';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { CheckIcon } from '@heroicons/react/24/outline';

interface GmailAccountSelectorProps {
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null, accountEmail: string | null) => void;
}

export function GmailAccountSelector({ selectedAccountId, onAccountChange }: GmailAccountSelectorProps) {
  const { data: accounts, isLoading, error } = useGmailAccounts();
  const [isOpen, setIsOpen] = useState(false);

  // Auto-select first account if none selected
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) {
      onAccountChange(accounts[0].id, accounts[0].email);
    }
  }, [accounts, selectedAccountId, onAccountChange]);

  const selectedAccount = accounts?.find(acc => acc.id === selectedAccountId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg animate-pulse">
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        <div className="w-32 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (error || !accounts || accounts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <span className="text-sm text-red-700">No Gmail accounts connected</span>
        <a
          href="/connect"
          className="text-sm text-red-700 underline hover:text-red-800"
        >
          Connect Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xs font-medium">G</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {selectedAccount?.email || 'Select account'}
            </p>
            {selectedAccount?.name && (
              <p className="text-xs text-gray-500">{selectedAccount.name}</p>
            )}
          </div>
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <p className="text-xs font-medium text-gray-500 px-2 py-1">Gmail Accounts</p>
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    onAccountChange(account.id, account.email);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                    account.id === selectedAccountId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-600 text-sm font-medium">G</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.email}
                    </p>
                    {account.name && (
                      <p className="text-xs text-gray-500 truncate">{account.name}</p>
                    )}
                  </div>
                  {account.id === selectedAccountId && (
                    <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  {account.healthy === false && (
                    <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" title="Connection issue" />
                  )}
                </button>
              ))}
              
              {/* Option to work with all accounts */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={() => {
                    onAccountChange(null, null);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                    selectedAccountId === null ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 text-sm font-medium">∞</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">All accounts</p>
                    <p className="text-xs text-gray-500">Work across all Gmail accounts</p>
                  </div>
                  {selectedAccountId === null && (
                    <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}