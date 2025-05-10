import React, { useState, useRef } from 'react';
import ProfileDropdown from './ProfileDropdown';

export default function SidebarMobile({ onClose, characters = [], selectedIndex = 0, onSelect, onNewCharacter, onImportCharacter, onClearChat, onDeleteCharacter, onProfile, onSettings }) {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);
  const defaultCharacterName = 'Nelliel';

  // Click-away handler for context menu
  React.useEffect(() => {
    if (openMenuIndex === null) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuIndex]);

  // Handler for settings click
  const handleSettingsClick = () => {
    setShowProfileMenu(false);
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('openSettingsModal');
      window.dispatchEvent(event);
    }
  };

  return (
    <div className="w-64 bg-background-container-light dark:bg-background-container-dark h-full p-4 flex flex-col relative">
      <button
        className="mb-4 text-xl self-end"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <i className="fas fa-times" />
      </button>
      {/* Top action buttons */}
      <div className="flex space-x-2 mb-6">
        <button
          className="flex-1 py-2 rounded-lg bg-primary text-white font-semibold text-base hover:bg-primary/80"
          onClick={onNewCharacter}
        >
          <i className="fas fa-plus mr-2" /> New Character
        </button>
        <button
          className="flex-1 py-2 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark text-primary font-semibold text-base border border-primary hover:bg-primary/10"
          onClick={onImportCharacter}
        >
          <i className="fas fa-file-import mr-2" /> Import
        </button>
      </div>
      <div className="mb-2 text-lg font-bold">Characters</div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {characters.map((c, i) => {
          const isNelliel = c.name === defaultCharacterName;
          return (
            <div key={c.id} className="relative flex items-center group">
              <button
                onClick={() => onSelect(i)}
                className={`flex-1 flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${i === selectedIndex ? 'bg-primary text-white' : 'hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark'}`}
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="font-medium truncate">{c.name}</span>
              </button>
              <button
                className="ml-2 p-1 text-gray-400 hover:text-primary focus:outline-none"
                onClick={e => {
                  e.stopPropagation();
                  setOpenMenuIndex(openMenuIndex === i ? null : i);
                }}
                title="More"
              >
                <i className="fas fa-ellipsis-v" />
              </button>
              {/* Context menu */}
              {openMenuIndex === i && (
                <div ref={menuRef} className="absolute right-0 top-10 z-50 min-w-[160px] bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark rounded-lg shadow-lg py-2 flex flex-col">
                  <button
                    onClick={() => {
                      setOpenMenuIndex(null);
                      onClearChat(c);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
                  >
                    <i className="fas fa-trash mr-2" /> Clear Chat
                  </button>
                  {!isNelliel && (
                    <button
                      onClick={() => {
                        setOpenMenuIndex(null);
                        setConfirmDelete({ character: c, idx: i });
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark text-red-500 transition-colors"
                    >
                      <i className="fas fa-user-times mr-2" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              Are you sure you want to delete {confirmDelete.character.name}? This cannot be undone.
            </h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCharacter(confirmDelete.idx);
                  setConfirmDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Profile button at the bottom */}
      <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark flex flex-col items-center relative">
        <button
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-all duration-200 ${showProfileMenu ? 'bg-background-container-hover-light dark:bg-background-container-hover-dark' : ''}`}
          onClick={() => setShowProfileMenu((v) => !v)}
        >
          <span className="flex items-center space-x-3">
            <span className="text-primary">
              <i className="fas fa-user-circle text-2xl" />
            </span>
            <span className="font-medium">Profile</span>
          </span>
          <span className={`transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}>
            <i className="fas fa-chevron-up text-text-light/60 dark:text-text-dark/60" />
          </span>
        </button>
        {/* ProfileDropdown as absolute menu above button */}
        {showProfileMenu && (
          <div className="absolute bottom-14 left-0 w-full z-50">
            <ProfileDropdown
              isOpen={showProfileMenu}
              onClose={() => setShowProfileMenu(false)}
              onSettingsClick={() => {
                setShowProfileMenu(false);
                if (onSettings) onSettings();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 