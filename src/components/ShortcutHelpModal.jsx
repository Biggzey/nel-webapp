import React, { useEffect, useRef } from 'react';

const shortcuts = [
  { combo: <><kbd className="kbd">Enter</kbd></>, desc: 'Send message (when input focused)' },
  { combo: <><kbd className="kbd">Shift</kbd> + <kbd className="kbd">Enter</kbd></>, desc: 'New line in chat input' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">/</kbd></>, desc: 'Show keyboard shortcut help' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">S</kbd></>, desc: 'Focus chat search' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">C</kbd></>, desc: 'Toggle sidebar' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">B</kbd></>, desc: 'Toggle character pane' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">R</kbd></>, desc: 'Regenerate last AI response' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">ArrowUp</kbd>/<kbd className="kbd">ArrowDown</kbd></>, desc: 'Navigate chats/characters' },
  { combo: <><kbd className="kbd">Alt</kbd> + <kbd className="kbd">,</kbd></>, desc: 'Open settings' },
  { combo: <><kbd className="kbd">Esc</kbd></>, desc: 'Close modals/unfocus input' },
];

export default function ShortcutHelpModal({ isOpen, onClose }) {
  const modalRef = useRef();

  useEffect(() => {
    if (!isOpen) return;
    function handleEsc(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleBackdropClick}>
      <div ref={modalRef} className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-8 max-w-lg w-full mx-4 border-2 border-container-border-light dark:border-container-border-dark shadow-xl relative animate-fade-in-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-primary text-2xl focus:outline-none"
          title="Close"
        >
          <i className="fas fa-times" />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-center text-text-light dark:text-text-dark">Keyboard Shortcuts</h2>
        <ul className="space-y-3">
          {shortcuts.map((s, i) => (
            <li key={i} className="flex items-center space-x-4">
              <span className="flex space-x-1 text-base">{s.combo}</span>
              <span className="text-text-secondary-light dark:text-text-secondary-dark text-sm">{s.desc}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Tailwind for .kbd (if not already in your global styles):
// .kbd { @apply inline-block px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600; } 