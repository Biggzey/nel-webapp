import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * PublicPersonalityModal is a wrapper for PersonalityModal that always enforces publicOnly mode.
 * Use this for public character creation (e.g., ExplorePage).
 */
export default function PublicPersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  return (
    <PersonalityModal
      isOpen={isOpen}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
      publicOnly={true}
      editOnly={false}
    />
  );
} 