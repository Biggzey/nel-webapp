import React from 'react';
import PersonalityModal from './PersonalityModal';

/**
 * PublicPersonalityModal is a wrapper for PersonalityModal that always enforces publicOnly mode.
 * Use this for public character creation (e.g., ExplorePage).
 */
export default function PublicPersonalityModal(props) {
  return (
    <PersonalityModal
      {...props}
      publicOnly={true}
    />
  );
} 