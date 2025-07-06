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
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-40"
        >
          <motion.div
            layout
            transition={{ layout: { duration: 0.3 } }}
            className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden"
          >
            {/* Header with tabs */}
            <div className="border-b border-gray-200/20 dark:border-gray-700/20 backdrop-blur-sm bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between p-4">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'chats'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    Chats
                  </button>
                  <button
                    onClick={() => setActiveTab('memory')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'memory'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    Memory
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'settings'
                        ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      }`}
                  >
                    Settings
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200"
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
              className={`p-4 overflow-y-auto transition-all duration-300 ${tabHeights[activeTab]}`}
            >
              {activeTab === 'chats' && (
                <Chat messages={messages} onMessagesUpdate={onMessagesUpdate} />
              )}

              {activeTab === 'memory' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-200/20 dark:border-purple-700/20">
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
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                    <button
                      onClick={() => settingsManager.set('darkMode', !darkMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</span>
                    <button
                      onClick={() => settingsManager.set('notifications', !notifications)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`}></span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
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