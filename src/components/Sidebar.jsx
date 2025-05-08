// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCharacter } from "../context/CharacterContext";
import { useLanguage } from "../context/LanguageContext";
import ProfileDropdown from "./ProfileDropdown";
import { useChat } from "../hooks/useChat";
import { ToastContainer } from "./Toast";

export default function Sidebar({ className = "", onLinkClick = () => {}, onSettingsClick }) {
  const navigate = useNavigate();
  const { isModerator, token } = useAuth();
  const { t } = useLanguage();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const { clearChat } = useChat();
  const {
    characters,
    selectedIndex,
    bookmarks,
    current,
    setSelectedIndex,
    handleNewCharacter,
    handleOpenModal,
    handleSaveCharacter,
    handleDeleteCharacter,
    toggleBookmark,
    setCurrent,
  } = useCharacter();
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null);

  const isBookmarked = bookmarks.includes(selectedIndex);

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

  // Add toast management functions
  const addToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    
    if (toast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleClearChat = async (character) => {
    setOpenMenuIndex(null);
    setConfirmClear(character);
  };

  const handleConfirmClear = async () => {
    if (!confirmClear) return;

    await clearChat(
      confirmClear.id,
      // Success callback
      (toastData) => {
        addToast(toastData);
        // Force a reload of the chat window by triggering a state change
        setCurrent({ ...current, id: confirmClear.id });
        // Close the confirmation modal
        setConfirmClear(null);
        // Force reload to ensure chat is cleared
        window.location.reload();
      },
      // Error callback
      (toastData) => {
        addToast(toastData);
        setConfirmClear(null);
      }
    );
  };

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
        <div className="w-full space-y-3 mb-6">
          {/* New Character button */}
          <button
            onClick={() => {
              handleNewCharacter();
              onLinkClick();
            }}
            className="w-full bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-3 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center"
          >
            <span className="text-primary mr-2">
              <i className="fas fa-plus" />
            </span>
            <span className="font-medium">{t('sidebar.newCharacter')}</span>
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
                  <div className="absolute right-0 top-10 z-50 min-w-[160px] bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark rounded-lg shadow-lg py-2 flex flex-col">
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
                          setOpenMenuIndex(null);
                          handleDeleteCharacter(i);
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
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-lg transition-all duration-200 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark group"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-primary group-hover:scale-110 transition-transform">
                    <i className="fas fa-shield-alt" />
                  </span>
                  <span>Admin Panel</span>
                </div>
              </Link>
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

      {/* Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">{t('chat.confirmClear')}</h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setConfirmClear(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </aside>
  );
}
