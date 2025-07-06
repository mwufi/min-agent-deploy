import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsManager } from '@/lib/SettingsManager';
import { Chat } from './Chat';

interface PanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
  onMessagesUpdate: (messages: any[]) => void;
}

type TabType = 'chats' | 'memory' | 'settings';

export const Panel: React.FC<PanelProps> = ({ isOpen, onClose, messages, onMessagesUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const settingsManager = SettingsManager.getInstance();

  const [darkMode, setDarkMode] = useState(settingsManager.get('darkMode'));
  const [notifications, setNotifications] = useState(settingsManager.get('notifications'));
  const [autoComplete, setAutoComplete] = useState(settingsManager.get('autoComplete'));

  useEffect(() => {
    const unsubDark = settingsManager.subscribe('darkMode', setDarkMode);
    const unsubNotif = settingsManager.subscribe('notifications', setNotifications);
    const unsubAuto = settingsManager.subscribe('autoComplete', setAutoComplete);

    return () => {
      unsubDark();
      unsubNotif();
      unsubAuto();
    };
  }, []);

  // Different heights for different tabs
  const tabHeights = {
    chats: 'h-96',
    memory: 'h-[500px]',
    settings: 'h-80'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <motion.div
            layout
            transition={{ layout: { duration: 0.3 } }}
            className="relative backdrop-blur-xl bg-gray-900/60 dark:bg-gray-900/70 rounded-2xl shadow-2xl ring-1 ring-white/10 border border-white/10 dark:border-gray-700/20 overflow-hidden"
          >
            {/* Decorative blurred ellipses */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Header with tabs */}
            <div className="relative border-b border-gray-200/10 dark:border-gray-700/20 backdrop-blur-sm bg-transparent">
              <div className="flex items-center justify-between p-4">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'chats'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 backdrop-blur-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20'
                      }`}
                  >
                    Chats
                  </button>
                  <button
                    onClick={() => setActiveTab('memory')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'memory'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 backdrop-blur-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20'
                      }`}
                  >
                    Memory
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'settings'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 backdrop-blur-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-700/20'
                      }`}
                  >
                    Settings
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/20 dark:hover:bg-gray-700/20 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <motion.div
              layout
              className={`relative p-4 overflow-y-auto transition-all duration-300 ${tabHeights[activeTab]}`}
            >
              {activeTab === 'chats' && (
                <Chat messages={messages} onMessagesUpdate={onMessagesUpdate} />
              )}

              {activeTab === 'memory' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-white/20 dark:bg-gray-800/20 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Context Memory</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      I remember your preferences and context from our conversations to provide better assistance.
                    </p>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>• Gmail integration active</p>
                    <p>• Learning your communication style</p>
                    <p>• Tracking important emails</p>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <button
                      onClick={() => settingsManager.set('darkMode', !darkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</span>
                    <button
                      onClick={() => settingsManager.set('notifications', !notifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-white/20 dark:hover:bg-gray-800/20 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-complete</span>
                    <button
                      onClick={() => settingsManager.set('autoComplete', !autoComplete)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoComplete ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoComplete ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};