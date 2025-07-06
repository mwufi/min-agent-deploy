import React from 'react';
import { motion } from 'framer-motion';
import { AttachmentCardProps, AttachmentType } from './types';

const getAttachmentIcon = (type: AttachmentType) => {
  switch (type) {
    case 'email':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case 'image':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'document':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'code':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      );
  }
};

const getTypeColor = (type: AttachmentType) => {
  switch (type) {
    case 'email':
      return 'from-blue-500 to-indigo-500';
    case 'image':
      return 'from-green-500 to-emerald-500';
    case 'document':
      return 'from-orange-500 to-red-500';
    case 'code':
      return 'from-purple-500 to-pink-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export const AttachmentCard: React.FC<AttachmentCardProps> = ({ attachment, onRemove, onClick }) => {
  const { id, type, name, metadata } = attachment;
  const typeColor = getTypeColor(type);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative group inline-block"
    >
      <div
        onClick={() => onClick?.(attachment)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 cursor-pointer hover:border-purple-400/50 transition-all duration-200"
      >
        {/* Icon with gradient background */}
        <div className={`p-1 rounded bg-gradient-to-br ${typeColor} text-white flex-shrink-0`}>
          {React.cloneElement(getAttachmentIcon(type), { className: 'w-3 h-3' })}
        </div>

        {/* Content - much more compact */}
        <div className="flex-1 min-w-0 max-w-[120px]">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
            {type === 'email' && metadata?.subject ? metadata.subject : name}
          </p>
        </div>

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all duration-200"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  );
};