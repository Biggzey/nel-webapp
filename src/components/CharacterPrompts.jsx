import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useIsMobile } from '../hooks/useIsMobile';

export function CharacterPrompts({ systemPrompt, customInstructions, onChange }) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('character.personality.systemPrompt')}
        </label>
        <textarea
          className="w-full min-h-[80px] md:min-h-[100px] p-2 border rounded bg-background-secondary-light dark:bg-background-secondary-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          value={systemPrompt}
          onChange={(e) => onChange('systemPrompt', e.target.value)}
          placeholder={t('character.personality.systemPromptPlaceholder')}
          rows={isMobile ? 3 : 2}
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('character.personality.systemPromptHelp')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {t('character.personality.customInstructions')}
        </label>
        <textarea
          className="w-full min-h-[80px] md:min-h-[100px] p-2 border rounded bg-background-secondary-light dark:bg-background-secondary-dark border-border-light dark:border-border-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary"
          value={customInstructions}
          onChange={(e) => onChange('customInstructions', e.target.value)}
          placeholder={t('character.personality.customInstructionsPlaceholder')}
          rows={isMobile ? 3 : 2}
        />
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {t('character.personality.customInstructionsHelp')}
        </p>
      </div>
    </div>
  );
} 