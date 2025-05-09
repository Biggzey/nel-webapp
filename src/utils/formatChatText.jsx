// Utility to format chat text for display in chat bubbles
// - *text* => <em>text</em>
// - {{user}} => displayName or username
// - "quoted text" => normal (no special styling)
// - Handles multiple asterisks and user tags per message
import React from 'react';

export function formatChatText(text, user, fontFamily) {
  if (!text) return null;
  // Replace {{user}} with displayName or username
  const userName = user?.displayName || user?.username || 'User';
  let replaced = text.replace(/\{\{user\}\}/gi, userName);

  // Split by asterisks to alternate between normal and italic
  // e.g. Hello *world* => ["Hello ", "world", ""]
  const parts = replaced.split(/(\*[^*]+\*)/g);

  return (
    <span style={fontFamily ? { fontFamily } : undefined}>
      {parts.map((part, i) => {
        if (/^\*[^*]+\*$/.test(part)) {
          // Remove asterisks and render as <em>
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
} 