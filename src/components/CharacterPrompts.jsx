import React from 'react';

export function CharacterPrompts({ systemPrompt, customInstructions, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          System Prompt
        </label>
        <textarea
          className="w-full min-h-[100px] p-2 border rounded bg-background-secondary-light dark:bg-background-secondary-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          value={systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder="Define the core personality and role of your character..."
          rows={2}
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          This is the initial system message that defines your character's core personality and behavior.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Custom Instructions
        </label>
        <textarea
          className="w-full min-h-[100px] p-2 border rounded bg-background-secondary-light dark:bg-background-secondary-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          value={customInstructions}
          onChange={(e) => onChange('customInstructions', e.target.value)}
          placeholder="Add any additional instructions or guidelines..."
          rows={2}
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Additional instructions that will be appended to the system message to further customize behavior.
        </p>
      </div>
    </div>
  );
} 