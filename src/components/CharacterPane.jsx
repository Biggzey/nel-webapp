import React from "react";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";

export default function CharacterPane() {
  const { current, handleOpenModal } = useCharacter();
  const { t } = useLanguage();

  // Helper function to format and limit likes/dislikes
  const formatList = (text) => {
    if (!text) return "";
    const items = text.split(',').map(item => item.trim()).filter(Boolean);
    if (items.length <= 3) return items.join(', ');
    return items.slice(0, 3).join(', ') + '...';
  };

  return (
    <aside className="hidden md:flex flex-col w-72 bg-gradient-to-b from-background-gradient-light-start via-background-gradient-light-mid to-background-gradient-light-end dark:bg-gradient-to-b dark:from-background-gradient-dark-start dark:via-background-gradient-dark-mid dark:to-background-gradient-dark-end rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-4">
      <div className="flex items-center justify-between mb-4 bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-3">
        <h2 className="text-2xl font-semibold text-text-light dark:text-text-dark">
          {current?.name}
        </h2>
        <button
          onClick={handleOpenModal}
          className="p-2 text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-all duration-200 hover:scale-110 transform group"
          title={t('character.edit')}
        >
          <i className="fas fa-edit group-hover:rotate-12 transition-transform duration-200" />
        </button>
      </div>
      
      {/* Character Info Section - Now using grid for dynamic sizing */}
      <div className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden">
        {/* Metadata section that will push the image down */}
        <div className="space-y-2 text-sm bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-3 mb-4">
          {current?.age && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-birthday-cake w-5 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{current.age} {t('character.metadata.yearsOld')}</span>
            </div>
          )}
          {current?.gender && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-venus-mars w-5 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{current.gender}</span>
            </div>
          )}
          {current?.race && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-users w-5 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{current.race}</span>
            </div>
          )}
          {current?.occupation && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-briefcase w-5 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{current.occupation}</span>
            </div>
          )}
          {current?.likes && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-heart w-5 mt-1 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{formatList(current.likes)}</span>
            </div>
          )}
          {current?.dislikes && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-thumbs-down w-5 mt-1 text-text-light dark:text-text-dark" />
              <span className="text-text-light dark:text-text-dark">{formatList(current.dislikes)}</span>
            </div>
          )}
        </div>

        {/* Full Image - will always take remaining space */}
        <div className="mt-4 min-h-0">
          <img
            src={current?.fullImage || current?.avatar}
            alt={`${current?.name} full`}
            className="w-full h-full object-cover rounded"
          />
        </div>
      </div>
    </aside>
  );
} 