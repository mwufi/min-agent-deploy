import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AttachmentCard } from './AttachmentCard';
import { AttachmentSectionProps } from './types';

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({ 
  attachments, 
  onRemove, 
  onAttachmentClick 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (attachments.length === 0) return null;

  const maxVisible = 2;
  const hasMore = attachments.length > maxVisible;
  const visibleAttachments = expanded ? attachments : attachments.slice(0, maxVisible);
  const remainingCount = attachments.length - maxVisible;

  return (
    <div className="border-b border-gray-200/20 dark:border-gray-700/20">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AnimatePresence mode="popLayout">
            {visibleAttachments.map((attachment) => (
              <div key={attachment.id} className="flex-shrink-0">
                <AttachmentCard
                  attachment={attachment}
                  onRemove={onRemove}
                  onClick={onAttachmentClick}
                />
              </div>
            ))}
          </AnimatePresence>
          
          {hasMore && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            >
              +{remainingCount} other{remainingCount > 1 ? 's' : ''}
            </button>
          )}
          
          {expanded && hasMore && (
            <button
              onClick={() => setExpanded(false)}
              className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Show less
            </button>
          )}
          
          {onRemove && attachments.length > 1 && (
            <button
              onClick={() => attachments.forEach(a => onRemove(a.id))}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
};