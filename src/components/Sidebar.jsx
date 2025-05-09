// src/components/Sidebar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import ProfileDropdown from "./ProfileDropdown";
import { useChat } from "../hooks/useChat";
import PersonalityModal from "./PersonalityModal";
import CharacterImportModal from "./CharacterImportModal";
import { useToast } from "./Toast";

export default function Sidebar({ className = "", onLinkClick = () => {}, onSettingsClick, onClearChat, sidebarReloadKey, setSidebarReloadKey }) {
  const navigate = useNavigate();
  const { isModerator, token } = useAuth();
  const { t } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { clearChat } = useChat();
  const {
    characters,
    selectedIndex,
    bookmarks,
    current,
    setSelectedIndex,
    setSelectedIndexRaw,
    handleNewCharacter,
    handleOpenModal,
    handleSaveCharacter,
    handleDeleteCharacter,
    toggleBookmark,
    setCurrent,
    setCharacters,
  } = useCharacter();
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const menuRef = useRef(null);
  const { addToast } = useToast();
  const [showImportModal, setShowImportModal] = useState(false);

  const isBookmarked = bookmarks.includes(selectedIndex);

  // Click-away handler for context menu
  useEffect(() => {
    if (openMenuIndex === null) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuIndex]);

  // Add file upload handler
  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      // Save the character with the new avatar
      handleSaveCharacter({
        ...current,
        avatar: reader.result
      });
    };
    reader.readAsDataURL(file);
  }

  const handleClearChat = (character) => {
    setOpenMenuIndex(null);
    onClearChat(character);
  };

  const handleDeleteCharacterWithConfirm = (character, idx) => {
    setOpenMenuIndex(null);
    setConfirmDelete({ character, idx });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    await handleDeleteCharacter(confirmDelete.idx);
    setConfirmDelete(null);
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  // Add a useEffect to reload characters when sidebarReloadKey changes (must be before return!)
  useEffect(() => {
    async function reloadCharacters() {
      try {
        const res = await fetch("/api/characters", {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (res.ok) {
          const userChars = await res.json();
          setCharacters(userChars);
        }
      } catch (err) {
        // Optionally handle error
      }
    }
    if (sidebarReloadKey > 0) reloadCharacters();
  }, [sidebarReloadKey, setCharacters, token]);

  return (
    <aside className={`${className} flex flex-col items-center p-4 relative overflow-hidden bg-gradient-to-b from-background-gradient-light-start via-background-gradient-light-mid to-background-gradient-light-end dark:from-background-gradient-dark-start dark:via-background-gradient-dark-mid dark:to-background-gradient-dark-end text-text-light dark:text-text-dark border-r border-border-light dark:border-border-dark`}>
      {/* Decorative background patterns */}
      <div className="absolute inset-0 opacity-70">
        {/* Top right decorative circle */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-accent-primary-light dark:bg-accent-primary-dark blur-3xl" />
        {/* Bottom left decorative circle */}
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent-secondary-light dark:bg-accent-secondary-dark blur-3xl" />
        {/* Animated dots pattern */}
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(123, 104, 238, 0.05) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* Content container with backdrop blur */}
      <div className="relative w-full h-full flex flex-col items-center">
        {/* Top controls section */}
        <div className="w-full flex flex-row space-x-2 mb-6">
          {/* New Character button (50%) */}
          <button
            onClick={() => {
              handleNewCharacter();
              onLinkClick();
            }}
            className="w-1/2 bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center justify-center"
          >
            <span className="text-primary mr-1 text-base">
              <i className="fas fa-plus" />
            </span>
            <span className="font-medium text-sm">{t('sidebar.newCharacter')}</span>
          </button>
          {/* Import Character button (50%) */}
          <button
            onClick={() => setShowImportModal(true)}
            className="w-1/2 bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center justify-center"
          >
            <span className="text-primary mr-1 text-base">
              <i className="fas fa-file-import" />
            </span>
            <span className="font-medium text-sm">Import</span>
          </button>
        </div>

        {/* Character list directly on background */}
        <div className="w-full flex-1 space-y-2 mb-6 px-2">
          {/* Time indicator */}
          <div className="text-xl font-bold text-white-500 dark:text-white-500 px-2 mb-4 [text-shadow:0.1px_0.1px_0_#000,0_0.1px_0_#000,0.1px_0_0_#000,0_-0.1px_0_#000]">{t('sidebar.characters')}</div>
          
          {characters.map((c, i) => {
            const isNelliel = c.name === "Nelliel";
            return (
              <div
                key={c.id}
                className="group flex items-center justify-between px-3 py-2 rounded-lg bg-background-container-hover-light/20 dark:bg-background-container-hover-dark/20 transition-all duration-200 hover:bg-background-container-hover-light/100 dark:hover:bg-background-container-hover-dark/100 relative"
              >
                <button
                  onClick={() => {
                    setSelectedIndex(i);
                    onLinkClick();
                  }}
                  className={`flex-1 text-left flex items-center space-x-3 ${
                    i === selectedIndex
                      ? "text-text-light dark:text-text-dark"
                      : "text-text-light/80 dark:text-text-dark/80 hover:text-text-light dark:hover:text-text-dark"
                  }`}
                >
                  <img
                    src={c.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <span className="font-medium">{c.name}</span>
                </button>
                {/* Ellipsis/context menu for all characters */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuIndex(openMenuIndex === i ? null : i);
                  }}
                  className="ml-2 p-1 text-gray-400 hover:text-primary focus:outline-none"
                  title={t('common.more')}
                >
                  <i className="fas fa-ellipsis-v" />
                </button>
                {/* Context menu */}
                {openMenuIndex === i && (
                  <div ref={menuRef} className="absolute right-0 top-10 z-50 min-w-[160px] bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark rounded-lg shadow-lg py-2 flex flex-col">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearChat(c);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
                    >
                      <i className="fas fa-trash mr-2" /> {t('chat.clearChat')}
                    </button>
                    {!isNelliel && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          handleDeleteCharacterWithConfirm(c, i);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark text-red-500 transition-colors"
                      >
                        <i className="fas fa-user-times mr-2" /> {t('common.delete')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom controls in container */}
        <div className="w-full mt-auto">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-xl">
            {isModerator && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark group"
              >
                <span className="text-primary group-hover:scale-110 transition-transform">
                  <i className="fas fa-shield-alt" />
                </span>
                <span>Admin Panel</span>
              </button>
            )}
            
            {/* Profile section with dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark group"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-primary group-hover:scale-110 transition-transform">
                    <i className="fas fa-user-circle" />
                  </span>
                  <span>{t('settings.profile')}</span>
                </div>
                <i className={`fas fa-chevron-${isProfileOpen ? 'up' : 'down'} text-text-light/60 dark:text-text-dark/60`} />
              </button>
              
              <ProfileDropdown
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                onSettingsClick={() => {
                  setIsProfileOpen(false);
                  onSettingsClick();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent" />
      </div>

      {/* Confirmation Modal for Delete Character */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">
              {t('chat.confirmDeleteCharacter', { name: confirmDelete.character.name }) !== 'chat.confirmDeleteCharacter'
                ? t('chat.confirmDeleteCharacter', { name: confirmDelete.character.name })
                : `Are you sure you want to delete ${confirmDelete.character.name}? This cannot be undone.`}
            </h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CharacterImportModal */}
      <CharacterImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (characterData) => {
          try {
            const res = await fetch("/api/characters", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : undefined,
              },
              body: JSON.stringify(characterData),
            });
            if (!res.ok) {
              const errorData = await res.json().catch(() => ({}));
              throw new Error(errorData.error || "Failed to import character");
            }
            await res.json();
            addToast({ type: "success", message: "Character imported! Reloading...", duration: 4000 });
            setShowImportModal(false);
            setTimeout(() => {
              setSidebarReloadKey(k => k + 1);
            }, 2000); // 2 seconds delay
          } catch (err) {
            addToast({ type: "error", message: err.message, duration: 5000 });
          }
        }}
      />
    </aside>
  );
}
