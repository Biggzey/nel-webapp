import React from "react";
import { useCharacter } from "../context/CharacterContext";

export default function CharacterPane() {
  const { current } = useCharacter();

  // Helper function to format and limit likes/dislikes
  const formatList = (text) => {
    if (!text) return "";
    const items = text.split(',').map(item => item.trim()).filter(Boolean);
    if (items.length <= 3) return items.join(', ');
    return items.slice(0, 3).join(', ') + '...';
  };

  return (
    <aside className="hidden md:flex flex-col w-72 bg-background-light dark:bg-background-dark p-4 border-r border-border-light dark:border-border-dark">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
        {current?.name}
      </h2>
      
      {/* Character Info Section - Now using grid for dynamic sizing */}
      <div className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden">
        {/* Metadata section that will push the image down */}
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {current?.age && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-birthday-cake w-5" />
              <span>{current.age} years old</span>
            </div>
          )}
          {current?.gender && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-venus-mars w-5" />
              <span>{current.gender}</span>
            </div>
          )}
          {current?.race && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-users w-5" />
              <span>{current.race}</span>
            </div>
          )}
          {current?.occupation && (
            <div className="flex items-center space-x-2">
              <i className="fas fa-briefcase w-5" />
              <span>{current.occupation}</span>
            </div>
          )}
          {current?.likes && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-heart w-5 mt-1" />
              <span>{formatList(current.likes)}</span>
            </div>
          )}
          {current?.dislikes && (
            <div className="flex items-start space-x-2">
              <i className="fas fa-thumbs-down w-5 mt-1" />
              <span>{formatList(current.dislikes)}</span>
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