import React, { useState } from 'react';

interface BottomBarProps {
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({ onTogglePanel, isPanelOpen }) => {
  const [message, setMessage] = useState('');

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30">
        <div className="p-3">
          <div className="flex items-center gap-3">
            {/* Toggle Panel Button */}
            <button
              onClick={onTogglePanel}
              className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            
            {/* Input field */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask anything..."
                className="w-full px-5 py-3 pr-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-full text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:bg-white/70 dark:focus:bg-gray-800/70 transition-all duration-200"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-purple-500 hover:text-purple-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Attachment button */}
              <button className="p-2.5 text-gray-500 hover:text-purple-500 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              
              {/* Microphone button */}
              <button className="p-2.5 text-gray-500 hover:text-purple-500 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-full transition-all duration-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};