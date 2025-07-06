import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createActionBus } from '@/lib/EventBus';
import { SettingsManager } from '@/lib/SettingsManager';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

interface ChatProps {
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onMessagesUpdate }) => {
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionBus = createActionBus();
  const settingsManager = SettingsManager.getInstance();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listen for chat events
    const handleChatEvent = async (event: any) => {
      if (event.message && event.userId === 'user') {
        // Add user message
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          text: event.message,
          sender: 'user',
          timestamp: event.timestamp
        };
        
        const updatedMessages = [...messages, userMessage];
        onMessagesUpdate(updatedMessages);

        // Show typing indicator
        setIsTyping(true);

        // Mock API call
        setTimeout(async () => {
          try {
            // In real implementation, this would call:
            // const response = await fetch(settingsManager.get('backendUrl'), {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ message: event.message, token: 'user-token' })
            // });

            // Mock response
            const aiResponses = [
              "I understand you're working with Gmail. How can I help you today?",
              "That's an interesting question! Let me help you with that.",
              "I've analyzed your request. Here's what I suggest...",
              "Based on your Gmail context, I can assist you with email management.",
              "I'm here to help! What specific task would you like to accomplish?"
            ];

            const aiMessage: Message = {
              id: `msg-${Date.now()}-ai`,
              text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
              sender: 'ai',
              timestamp: Date.now()
            };

            setIsTyping(false);
            onMessagesUpdate([...updatedMessages, aiMessage]);
          } catch (error) {
            console.error('Chat error:', error);
            setIsTyping(false);
          }
        }, 1000 + Math.random() * 1000); // Random delay for realism
      }
    };

    const unsubscribe = actionBus.on('chat', handleChatEvent);
    return () => unsubscribe();
  }, [messages, onMessagesUpdate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                    : 'bg-gray-100/70 dark:bg-gray-800/70 text-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100/70 dark:bg-gray-800/70 px-4 py-2 rounded-2xl">
              <div className="flex space-x-1">
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                />
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 bg-gray-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};