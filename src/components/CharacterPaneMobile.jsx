import React from 'react';

export default function CharacterPaneMobile({ onClose, character, onEdit }) {
  if (!character) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="w-full max-w-md bg-background-container-light dark:bg-background-container-dark rounded-xl p-4 relative">
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
            src={character.avatar}
            alt={character.name + ' avatar'}
            className="w-24 h-24 rounded-full object-cover border-2 border-primary mb-2"
          />
          <h2 className="text-2xl font-bold text-center">{character.name}</h2>
          {character.personality && (
            <div className="text-sm text-gray-700 dark:text-gray-300 text-center mb-2">{character.personality}</div>
          )}
          {/* Add more fields as needed */}
          {character.age && <div className="text-xs">Age: {character.age}</div>}
          {character.gender && <div className="text-xs">Gender: {character.gender}</div>}
          {character.race && <div className="text-xs">Race: {character.race}</div>}
          {character.occupation && <div className="text-xs">Occupation: {character.occupation}</div>}
        </div>
      </div>
    </div>
  );
} 