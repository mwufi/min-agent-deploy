import React, { useState, useEffect } from 'react';
import { BottomBar } from './BottomBar';
import { Panel } from './Panel';
import { Attachment } from './types';
import { GmailContext } from '@/lib/GmailContext';
import { createActionBus } from '@/lib/EventBus';

interface BottomPanelProps {
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
  attachments?: Attachment[];
}

export const BottomPanel: React.FC<BottomPanelProps> = ({ onClose }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const actionBus = createActionBus();

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

    // Add user message immediately
    if (message.trim() || attachments.length > 0) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        text: message,
        sender: 'user',
        timestamp: Date.now(),
        attachments: attachments.length > 0 ? [...attachments] : undefined
      };

      setMessages(prev => [...prev, userMessage]);

      // Clear attachments after sending
      setAttachments([]);

      // Generate AI response after a delay
      setTimeout(() => {
        generateAIResponse(message, attachments);
      }, 1000);
    }
  };

  const generateAIResponse = (userMessage: string, userAttachments: Attachment[]) => {
    let responseText = '';

    if (userAttachments.length > 0) {
      const emailCount = userAttachments.filter(a => a.type === 'email').length;
      if (emailCount > 0) {
        responseText = `I see you've attached ${emailCount} email${emailCount > 1 ? 's' : ''}. Let me analyze ${emailCount > 1 ? 'them' : 'it'} for you...\n\n`;
        responseText += `Based on the email${emailCount > 1 ? 's' : ''} from ${userAttachments[0].metadata?.from || 'the sender'}, `;
        responseText += `I can help you draft a response, summarize the content, or extract action items.`;
      } else {
        responseText = `I've received your attachment${userAttachments.length > 1 ? 's' : ''}. How would you like me to help with ${userAttachments.length > 1 ? 'them' : 'it'}?`;
      }
    } else {
      const aiResponses = [
        "I understand you're working with Gmail. How can I help you today?",
        "That's an interesting question! Let me help you with that.",
        "I've analyzed your request. Here's what I suggest...",
        "Based on your Gmail context, I can assist you with email management.",
        "I'm here to help! What specific task would you like to accomplish?"
      ];
      responseText = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    }

    const aiMessage: Message = {
      id: `msg-${Date.now()}-ai`,
      text: responseText,
      sender: 'ai',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, aiMessage]);
  };

  return (
    <>
      {/* Subtle scrim for contrast on light backgrounds */}
      {isPanelOpen && (
        <div className="fixed inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-40" />
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Container for both panel and bar */}
        <div className="relative">
          {/* Panel - positioned above the bar */}
          {isPanelOpen && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 mb-1">
              <Panel
                isOpen={isPanelOpen}
                onClose={handleClosePanel}
                messages={messages}
                onMessagesUpdate={setMessages}
              />
            </div>
          )}

          {/* Bar - at the bottom */}
          <div className="pb-6">
            <BottomBar
              onTogglePanel={handleTogglePanel}
              isPanelOpen={isPanelOpen}
              onSendMessage={handleSendMessage}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>
      </div>
    </>
  );
};