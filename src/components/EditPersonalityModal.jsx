import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * EditPersonalityModal is a wrapper for PersonalityModal that enforces edit-only mode.
 * Use this for editing existing private characters (e.g., from CharacterPane).
 */
export default function EditPersonalityModal(props) {
  return (
    <PersonalityModal
      {...props}
      editOnly={true}
    />
  );
} 