import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * PrivatePersonalityModal is a wrapper for PersonalityModal that always enforces private mode.
 * Use this for private character creation (e.g., Sidebar).
 */
export default function PrivatePersonalityModal({ isOpen, initialData = {}, onClose, onSave }) {
  return (
    <PersonalityModal
      isOpen={isOpen}
      initialData={initialData}
      onClose={onClose}
      onSave={onSave}
      publicOnly={false}
      editOnly={false}
    />
  );
} 