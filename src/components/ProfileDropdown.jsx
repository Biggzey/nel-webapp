import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ProfileDropdown({ isOpen, onClose, onSettingsClick }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const initial = user?.username?.charAt(0).toUpperCase() || '?';

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={onClose}
          />
          
          {/* Dropdown menu */}
          <div className="profile-button absolute bottom-full mb-2 right-0 w-56 rounded-xl bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark shadow-lg z-50 overflow-hidden">
            {/* Profile section */}
            <div className="p-3 border-b border-container-border-light/10 dark:border-container-border-dark/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-white font-semibold text-lg">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.username} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {user?.displayName || user?.username}
                  </div>
                  <div className="text-sm text-text-light/60 dark:text-text-dark/60 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <button
                onClick={onSettingsClick}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
              >
                <i className="fas fa-cog text-text-light/60 dark:text-text-dark/60" />
                <span>{t('sidebar.settings')}</span>
              </button>
              
              <button
                onClick={logout}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors text-red-400"
              >
                <i className="fas fa-sign-out-alt" />
                <span>{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
} 