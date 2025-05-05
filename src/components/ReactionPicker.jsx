// src/components/ReactionPicker.jsx
import React from "react";

const EMOJIS = ["👍", "❤️", "😄", "🎉", "👎"];

export default function ReactionPicker({ onSelect, onClose }) {
  return (
    <div
      className="absolute flex space-x-1 bg-[#f0f2f5] dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-600 rounded shadow-lg p-1"
      style={{ bottom: "-2.5rem", zIndex: 20 }}
      data-testid="reaction-picker"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="px-1 text-xl hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
