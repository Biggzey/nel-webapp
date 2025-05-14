import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * PrivatePersonalityModal is a wrapper for PersonalityModal that always enforces private mode.
 * Use this for private character creation (e.g., Sidebar).
 */
export default function PrivatePersonalityModal(props) {
  return (
    <PersonalityModal
      {...props}
      publicOnly={false}
      editOnly={false}
    />
  );
} 