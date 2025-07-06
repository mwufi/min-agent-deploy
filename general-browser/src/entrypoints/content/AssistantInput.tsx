import React, { useState } from 'react';
import { AttachmentSection } from './AttachmentSection';
import { InputSection } from './InputSection';
import { AssistantInputProps, Attachment } from './types';

export const AssistantInput: React.FC<AssistantInputProps> = ({
  attachments,
  onAttachmentsChange,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSendMessage(message, attachments);
      setMessage('');
      onAttachmentsChange([]); // Clear attachments after sending
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
  };

  const handleAttachmentClick = (attachment: Attachment) => {
    // Could open a preview modal or perform other actions
    console.log('Attachment clicked:', attachment);
  };

  return (
    <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
      <AttachmentSection
        attachments={attachments}
        onRemove={handleRemoveAttachment}
        onAttachmentClick={handleAttachmentClick}
      />
      
      <InputSection
        value={message}
        onChange={setMessage}
        onSend={handleSend}
        placeholder={attachments.length > 0 ? "Add a message..." : "Ask anything..."}
      />
    </div>
  );
};