// Utility to format chat text for display in chat bubbles
// - *text* => <em>text</em>
// - **text** => <strong>text</strong>
// - __text__ => <u>text</u>
// - {{user}} => displayName or username
// - "quoted text" => normal (no special styling)
// - Handles multiple asterisks, bold, underline, and user tags per message
import React from 'react';

export function formatChatText(text, user, fontFamily) {
  if (!text) return null;
  // Replace {{user}} and {{char}} with displayName or username
  const userName = user?.displayName || user?.username || 'User';
  let replaced = text.replace(/\{\{user\}\}/gi, userName)
                     .replace(/\{\{char\}\}/gi, userName);

  // Handle underline (__text__)
  replaced = replaced.replace(/__(.+?)__/g, '<u>$1</u>');
  // Handle bold (**text**)
  replaced = replaced.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Handle italics (*text*)
  replaced = replaced.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Return as React element with dangerouslySetInnerHTML for formatting
  return (
    <span style={fontFamily ? { fontFamily } : undefined} dangerouslySetInnerHTML={{ __html: replaced }} />
  );
} 