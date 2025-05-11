import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from './Toast';

export default function AdminSidebar({ onUserSelect, selectedUserId }) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRef = useRef(null);

  // Load users
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to load users');
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error('Error loading users:', error);
        addToast({
          type: 'error',
          message: 'Failed to load users',
          duration: 5000
        });
      }
    }
    loadUsers();
  }, [token, addToast]);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Click-away handler for context menu
  useEffect(() => {
    if (openMenuIndex === null) return;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuIndex(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuIndex]);

  // Quick action handlers
  const handleResetPassword = async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to reset password');
      addToast({
        type: 'success',
        message: 'Password reset email sent',
        duration: 3000
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      addToast({
        type: 'error',
        message: 'Failed to reset password',
        duration: 5000
      });
    }
    setOpenMenuIndex(null);
  };

  const handleToggleBlock = async (userId, isBlocked) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ blocked: !isBlocked })
      });
      if (!res.ok) throw new Error('Failed to update block status');
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, blocked: !isBlocked } : u
      ));
      addToast({
        type: 'success',
        message: `User ${isBlocked ? 'unblocked' : 'blocked'}`,
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating block status:', error);
      addToast({
        type: 'error',
        message: 'Failed to update block status',
        duration: 5000
      });
    }
    setOpenMenuIndex(null);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(prev => prev.filter(u => u.id !== userId));
      addToast({
        type: 'success',
        message: 'User deleted',
        duration: 3000
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast({
        type: 'error',
        message: 'Failed to delete user',
        duration: 5000
      });
    }
    setOpenMenuIndex(null);
  };

  // Helper to get a valid avatar URL
  function getValidAvatarUrl(avatar) {
    if (!avatar || typeof avatar !== 'string' || avatar.trim() === '' || avatar === 'null') return '/user-avatar.png';
    // Accept data URLs, absolute URLs, or fallback
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return '/user-avatar.png';
  }

  return (
    <aside className="w-72 md:w-80 flex-shrink-0 h-full flex flex-col bg-background-container-light dark:bg-background-container-dark border-r border-border-light dark:border-border-dark">
      {/* Search bar */}
      <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center gap-2">
        <div className="relative flex-grow flex-shrink">
          <input
            type="text"
            placeholder={t('admin.searchUsers')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-8 rounded-lg bg-background-container-light dark:bg-background-container-dark border-2 border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary text-sm text-text-light dark:text-text-dark placeholder:text-text-secondary-light dark:placeholder:text-text-secondary-dark"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark" />
        </div>
        {/* Home icon button to return to overview */}
        <button
          className="ml-2 p-2 rounded-full bg-background-container-light dark:bg-background-container-dark border-2 border-container-border-light dark:border-container-border-dark hover:bg-primary/10 focus:outline-none flex items-center justify-center transition-colors"
          title="Return to Overview"
          onClick={() => onUserSelect(null)}
        >
          <i className="fas fa-home text-primary text-lg" />
        </button>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.map((user, index) => (
          <div
            key={user.id}
            className={`relative group px-4 py-3 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark cursor-pointer ${
              selectedUserId === user.id ? 'bg-background-container-hover-light dark:bg-background-container-hover-dark' : ''
            }`}
          >
            <div
              className="flex items-center space-x-3"
              onClick={() => onUserSelect(user.id)}
            >
              <img
                src={getValidAvatarUrl(user.avatar)}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
                key={user.avatar || user.id}
                onError={e => {
                  if (!e.target.src.endsWith('/user-avatar.png')) {
                    e.target.onerror = null;
                    e.target.src = '/user-avatar.png';
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-medium truncate">{user.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    user.role === 'admin' ? 'bg-red-500/20 text-red-500' :
                    user.role === 'moderator' ? 'bg-blue-500/20 text-blue-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <div className="text-sm text-gray-500 truncate">{user.email}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuIndex(openMenuIndex === index ? null : index);
                }}
                className="p-2 text-gray-400 hover:text-primary focus:outline-none"
              >
                <i className="fas fa-ellipsis-v" />
              </button>
            </div>

            {/* Context menu */}
            {openMenuIndex === index && (
              <div
                ref={menuRef}
                className="absolute right-0 top-12 z-50 min-w-[180px] bg-background-container-light dark:bg-background-container-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg py-2"
              >
                <button
                  onClick={() => handleResetPassword(user.id)}
                  className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark"
                >
                  <i className="fas fa-key mr-2" /> {t('admin.resetPassword')}
                </button>
                <button
                  onClick={() => handleToggleBlock(user.id, user.blocked)}
                  className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark"
                >
                  <i className={`fas fa-${user.blocked ? 'unlock' : 'lock'} mr-2`} />
                  {user.blocked ? t('admin.unblockUser') : t('admin.blockUser')}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark"
                >
                  <i className="fas fa-trash mr-2" /> {t('admin.deleteUser')}
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark">
                  {t('admin.removeDuplicatesUser')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky Back to Home button at the bottom */}
      <div className="sticky bottom-0 left-0 w-full bg-background-container-light dark:bg-background-container-dark border-t border-border-light dark:border-border-dark p-4 z-10">
        <button
          onClick={() => window.location.href = '/'}
          className="w-full bg-background-container-light dark:bg-background-container-dark rounded-xl border-2 border-container-border-light dark:border-container-border-dark shadow-lg shadow-container-shadow-light dark:shadow-container-shadow-dark p-2 transition-all duration-300 hover:border-primary/40 hover:shadow-xl flex items-center justify-center"
        >
          <span className="text-primary mr-1 text-base">
            <i className="fas fa-arrow-left" />
          </span>
          <span className="font-medium text-sm">Back to Chats</span>
        </button>
      </div>
    </aside>
  );
} 