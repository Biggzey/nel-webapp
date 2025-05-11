import React from 'react';

export default function ExplorePage({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-to-b from-blue-900 via-black to-gray-900 text-white animate-fade-in-up">
      <h1 className="text-4xl font-bold mb-6">Explore Characters</h1>
      <p className="mb-8 text-lg max-w-xl text-center">
        Discover and add new characters created by the community!<br />
        (This is a placeholder. Search, browse, and import features coming soon.)
      </p>
      <button
        className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all duration-200"
        onClick={onClose}
      >
        Back to Chat
      </button>
    </div>
  );
} 