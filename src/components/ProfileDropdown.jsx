import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../context/NotificationContext';
import Notifications from './Notifications';

export default function ProfileDropdown({ isOpen, onClose, onSettingsClick }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
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
          {/* Dropdown trigger button */}
          <button
            className="absolute bottom-full mb-2 right-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark shadow-lg z-50 overflow-hidden hover:bg-primary/10 transition-colors focus:outline-none"
            aria-haspopup="true"
            aria-expanded={isOpen}
            style={{ minWidth: '140px' }}
          >
            <i className="fas fa-user-circle text-2xl text-primary" />
            <span className="font-semibold text-primary">{t('settings.profile', 'Profile')}</span>
          </button>
          {/* Dropdown menu */}
          <div className="profile-dropdown-content absolute bottom-full mb-2 right-0 w-56 rounded-xl bg-background-container-light dark:bg-background-container-dark border border-container-border-light dark:border-container-border-dark shadow-lg z-50 overflow-hidden">
            {/* Profile section */}
            <div className="p-3 border-b border-container-border-light/10 dark:border-container-border-dark/10 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary overflow-hidden flex items-center justify-center text-white font-semibold text-lg">
                {user?.avatar ? (
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.username} 
                    className="w-full h-full object-cover"
                    onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                  />
                ) : (
                  <img 
                    src={'/default-avatar.png'} 
                    alt={user.username} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="font-medium truncate">{user?.displayName || user?.username}</div>
                <button
                  className="relative ml-2 p-1 text-gray-600 hover:text-primary focus:outline-none"
                  onClick={() => setShowNotifications(true)}
                  aria-label="Show notifications"
                >
                  <i className="fas fa-bell text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
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
          {/* Notifications Modal/Portal */}
          {showNotifications && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowNotifications(false)}>
              <div className="bg-white dark:bg-background-container-dark rounded-xl shadow-lg max-w-lg w-full p-6 relative" onClick={e => e.stopPropagation()}>
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-primary"
                  onClick={() => setShowNotifications(false)}
                  aria-label="Close notifications"
                >
                  <i className="fas fa-times" />
                </button>
                <Notifications modalMode />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
} 