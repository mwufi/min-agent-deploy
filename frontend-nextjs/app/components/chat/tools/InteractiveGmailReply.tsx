'use client';

import { useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';

interface InteractiveGmailReplyProps {
  threadId: string;
  messages: any[];
  onReplySuccess?: () => void;
}

export function InteractiveGmailReply({ threadId, messages, onReplySuccess }: InteractiveGmailReplyProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyType, setReplyType] = useState<'reply' | 'replyAll'>('reply');
  const { append } = useChat({
    api: '/api/ai/chat',
  });

  const lastMessage = messages[messages.length - 1];

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim()) return;

    // Construct the AI command to send the reply
    const command = `Reply to the email thread ${threadId} with this message: "${replyText}". ${replyType === 'replyAll' ? 'Reply to all recipients.' : 'Reply only to the sender.'}`;
    
    // Send the command to the AI
    await append({
      role: 'user',
      content: command,
    });

    // Reset form
    setShowReplyForm(false);
    setReplyText('');
    
    if (onReplySuccess) {
      onReplySuccess();
    }
  }, [replyText, threadId, replyType, append, onReplySuccess]);

  const suggestedReplies = [
    { text: "Thanks for reaching out. I'll review this and get back to you soon.", tone: "professional" },
    { text: "Got it, thanks! I'll take care of this.", tone: "casual" },
    { text: "I need more information to proceed. Could you please provide additional details?", tone: "inquiry" },
    { text: "This looks good to me. Let's move forward with this approach.", tone: "approval" },
    { text: "I have some concerns about this. Can we schedule a call to discuss?", tone: "concern" },
  ];

  if (!lastMessage) return null;

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      {!showReplyForm ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowReplyForm(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Reply to Thread
          </button>
          <button
            onClick={() => {
              setReplyType('replyAll');
              setShowReplyForm(true);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
          >
            Reply All
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              {replyType === 'replyAll' ? 'Reply to All' : 'Reply'}: {lastMessage.subject}
            </h4>
            <button
              onClick={() => {
                setShowReplyForm(false);
                setReplyText('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Suggested replies:</p>
            <div className="space-y-2">
              {suggestedReplies.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setReplyText(suggestion.text)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm text-gray-700">{suggestion.text}</p>
                  <p className="text-xs text-gray-500 mt-1">Tone: {suggestion.tone}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or write your own reply:
            </label>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowReplyForm(false);
                setReplyText('');
              }}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              Send via AI Assistant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}