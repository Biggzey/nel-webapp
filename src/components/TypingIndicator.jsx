import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-1 p-3 max-w-[100px] bg-[var(--chat-assistant-bg)] text-[var(--chat-assistant-text)] rounded-lg self-start">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-[bounce_1s_infinite]" />
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-[bounce_1s_infinite_0.2s]" />
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-[bounce_1s_infinite_0.4s]" />
    </div>
  );
} 