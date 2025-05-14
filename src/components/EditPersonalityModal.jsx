import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * EditPersonalityModal is a wrapper for PersonalityModal that enforces edit-only mode.
 * Use this for editing existing private characters (e.g., from CharacterPane).
 */
export default function EditPersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  // Ensure we have an ID for editing
  if (!initialData.id) {
    console.error('EditPersonalityModal requires an ID in initialData');
    return null;
  }

  return (
    <PersonalityModal
      isOpen={isOpen}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
      editOnly={true}
      publicOnly={false}
    />
  );
} 