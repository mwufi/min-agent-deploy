'use client';

import { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { useNotionAccounts } from '@/lib/hooks/useNotionAccounts';

interface NotionAccountSelectorProps {
  selectedAccountId: string | null;
  onAccountChange: (accountId: string | null, accountName: string | null) => void;
}

export function NotionAccountSelector({ selectedAccountId, onAccountChange }: NotionAccountSelectorProps) {
  const { data, isLoading, error } = useNotionAccounts();
  const accounts = data?.accounts || [];

  // Add "All workspaces" option
  const options = [
    { id: null, name: 'All workspaces', email: null },
    ...accounts
  ];

  const selectedOption = options.find(opt => opt.id === selectedAccountId) || options[0];

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-9 bg-gray-200 rounded-lg w-48"></div>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return null; // Don't show selector if no accounts
  }

  return (
    <Listbox 
      value={selectedOption} 
      onChange={(option) => onAccountChange(option.id, option.name)}
    >
      <div className="relative">
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white border border-gray-300 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm">
          <span className="flex items-center">
            <div className="w-6 h-6 bg-gradient-to-br from-gray-800 to-gray-600 rounded flex items-center justify-center text-white text-xs font-bold mr-2">
              N
            </div>
            <span className="block truncate">{selectedOption.name}</span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {options.map((option) => (
              <Listbox.Option
                key={option.id || 'all'}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-purple-100 text-purple-900' : 'text-gray-900'
                  }`
                }
                value={option}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.name}
                      {option.workspace_name && option.workspace_name !== option.name && (
                        <span className="text-xs text-gray-500 ml-1">({option.workspace_name})</span>
                      )}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-purple-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}