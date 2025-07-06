import React, { useState, useEffect } from 'react';
import { BottomBar } from './BottomBar';
import { Panel } from './Panel';
import { Attachment } from './types';
import { GmailContext } from '@/lib/GmailContext';

interface BottomPanelProps {
  onClose: () => void;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ onClose }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Listen to Gmail context changes
  useEffect(() => {
    const checkSelection = () => {
      // @ts-ignore
      const gmailContext = window.gmailContext;
      if (!gmailContext) return;
      
      const context = gmailContext.getContext();
      const selectedEmails = context.selectedEmails || [];
      
      // Convert selected emails to attachments
      if (selectedEmails.length > 0) {
        const emailAttachments: Attachment[] = selectedEmails.map((email, index) => ({
          id: `email-${email.threadId || index}`,
          type: 'email' as const,
          name: email.from?.name || 'Unknown sender',
          metadata: {
            subject: email.subject || 'No subject',
            from: email.from?.email || email.from?.name,
            date: email.date,
            size: 1024 // Mock size
          }
        }));
        setAttachments(emailAttachments);
      } else {
        setAttachments([]);
      }
    };

    // Check every 500ms for selection changes
    const interval = setInterval(checkSelection, 500);
    
    // Initial check
    checkSelection();

    return () => clearInterval(interval);
  }, []);

  const handleTogglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleSendMessage = (message: string) => {
    // Open panel when sending a message
    if (!isPanelOpen && (message.trim() || attachments.length > 0)) {
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
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </>
  );
};