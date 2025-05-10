import React from 'react';
import { useCharacter } from '../context/CharacterContext';
import { useLanguage } from '../context/LanguageContext';

export default function CharacterPaneMobile({ onClose, onEdit }) {
  const { current } = useCharacter();
  const { t } = useLanguage();
  if (!current) return null;

  // Helper function to format and limit likes/dislikes
  const formatList = (text) => {
    if (!text) return "";
    const items = text.split(',').map(item => item.trim()).filter(Boolean);
    if (items.length <= 3) return items.join(', ');
    return items.slice(0, 3).join(', ') + '...';
  };

  const hasInfo = !!(current?.age || current?.gender || current?.race || current?.occupation || current?.likes || current?.dislikes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="w-full max-w-md bg-background-container-light dark:bg-background-container-dark rounded-xl p-4 relative overflow-y-auto max-h-[90vh] z-10"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-xl"
          onClick={onClose}
          aria-label="Close character pane"
        >
          <i className="fas fa-times" />
        </button>
        <button
          className="absolute top-2 left-2 text-xl text-primary hover:text-primary/80"
          onClick={onEdit}
          aria-label="Edit character"
        >
          <i className="fas fa-edit" />
        </button>
        <div className="flex flex-col items-center space-y-3">
          <img
            src={current.avatar}
            alt={current.name + ' avatar'}
            className="w-24 h-24 rounded-full object-cover border-2 border-primary mb-2"
          />
          <h2 className="text-2xl font-bold text-center">{current.name}</h2>
          {current.personality && (
            <div className="text-sm text-gray-700 dark:text-gray-300 text-center mb-2">{current.personality}</div>
          )}
          {hasInfo && (
            <div className="w-full space-y-2 text-sm bg-background-light dark:bg-background-dark rounded-xl border border-border-light dark:border-border-dark shadow p-3">
              {current.age && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-birthday-cake w-5 text-text-light dark:text-text-dark" />
                  <span>{current.age} {t('character.metadata.yearsOld') || 'years old'}</span>
                </div>
              )}
              {current.gender && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-venus-mars w-5 text-text-light dark:text-text-dark" />
                  <span>{current.gender}</span>
                </div>
              )}
              {current.race && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-users w-5 text-text-light dark:text-text-dark" />
                  <span>{current.race}</span>
                </div>
              )}
              {current.occupation && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-briefcase w-5 text-text-light dark:text-text-dark" />
                  <span>{current.occupation}</span>
                </div>
              )}
              {current.likes && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-heart w-5 text-pink-500" />
                  <span>{formatList(current.likes)}</span>
                </div>
              )}
              {current.dislikes && (
                <div className="flex items-center space-x-2">
                  <i className="fas fa-thumbs-down w-5 text-yellow-500" />
                  <span>{formatList(current.dislikes)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 