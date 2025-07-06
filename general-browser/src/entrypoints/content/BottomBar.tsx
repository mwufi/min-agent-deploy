import React from 'react';
import { createActionBus } from '@/lib/EventBus';
import { AssistantInput } from './AssistantInput';
import { Attachment } from './types';

interface BottomBarProps {
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  onSendMessage: (message: string) => void;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({ 
  onTogglePanel, 
  isPanelOpen, 
  onSendMessage,
  attachments,
  onAttachmentsChange
}) => {
  const actionBus = createActionBus();

  const handleSendMessage = (message: string, attachments: Attachment[]) => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message);
      actionBus.emit('chat', { 
        message, 
        attachments,
        timestamp: Date.now(),
        userId: 'user'
      });
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4">
      <div className="flex items-end gap-3">
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
        
        {/* Assistant Input Component */}
        <div className="flex-1">
          <AssistantInput
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
};