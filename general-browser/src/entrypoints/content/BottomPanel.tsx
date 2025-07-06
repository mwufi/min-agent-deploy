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
    let gmailContext: GmailContext | null = null;
    
    const setupGmailListener = () => {
      // @ts-ignore
      const gmail = window.gmail;
      if (!gmail || gmailContext) return;

      // Create a single instance
      gmailContext = new GmailContext(gmail);
      
      // Check for updates periodically
      const checkSelection = () => {
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

      // Initial check
      checkSelection();
      
      // Set up periodic check
      const interval = setInterval(checkSelection, 1000);
      
      return () => {
        clearInterval(interval);
      };
    };

    // Try to set up listener, retry if gmail not ready
    const retryTimer = setInterval(() => {
      // @ts-ignore
      if (window.gmail) {
        setupGmailListener();
        clearInterval(retryTimer);
      }
    }, 500);

    return () => {
      clearInterval(retryTimer);
    };
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