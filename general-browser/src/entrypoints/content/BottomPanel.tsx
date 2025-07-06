import React, { useState } from 'react';
import { BottomBar } from './BottomBar';
import { Panel } from './Panel';

interface BottomPanelProps {
  onClose: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ onClose }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const handleTogglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleSendMessage = (message: string) => {
    // Open panel when sending a message
    if (!isPanelOpen && message.trim()) {
      setIsPanelOpen(true);
    }
  };

  return (
    <>
      <Panel 
        isOpen={isPanelOpen} 
        onClose={handleClosePanel}
        messages={messages}
        onMessagesUpdate={setMessages}
      />
      <BottomBar 
        onTogglePanel={handleTogglePanel} 
        isPanelOpen={isPanelOpen}
        onSendMessage={handleSendMessage}
      />
    </>
  );
};