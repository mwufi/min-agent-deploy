export type AttachmentType = 'email' | 'image' | 'document' | 'code' | 'text' | 'unknown';

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  content?: string;
  metadata?: {
    size?: number;
    mimeType?: string;
    preview?: string;
    // Email specific
    from?: string;
    to?: string;
    subject?: string;
    date?: string;
    // Image specific
    dimensions?: { width: number; height: number };
    // Code specific
    language?: string;
  };
}

export interface AttachmentCardProps {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  onClick?: (attachment: Attachment) => void;
}

export interface AttachmentSectionProps {
  attachments: Attachment[];
  onRemove?: (id: string) => void;
  onAttachmentClick?: (attachment: Attachment) => void;
}

export interface InputSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface AssistantInputProps {
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onSendMessage: (message: string, attachments: Attachment[]) => void;
}