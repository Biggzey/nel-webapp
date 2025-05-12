import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useToast } from './Toast';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCharacter } from '../context/CharacterContext';

// Tab components
function Profile({ user, onSave }) {
  const { t } = useLanguage();
  const { token, logout } = useAuth();
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    avatar: user?.avatar || null,
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Update form data when user prop changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      displayName: user?.displayName || '',
      avatar: user?.avatar || null
    }));
  }, [user]);

  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size before processing
    const maxSizeMB = 5; // 5MB max for original file
    if (file.size > maxSizeMB * 1024 * 1024) {
      console.error('Image file too large. Maximum size is 5MB. Please choose a smaller image.');
      return;
    }

    // Create an image element to resize the file
    const img = document.createElement('img');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target.result;
      
      img.onload = () => {
        // Max width and height for the avatar
        const maxWidth = 256;
        const maxHeight = 256;
        
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        // Create canvas and resize image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get resized image as base64 string
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        setFormData(prev => ({ ...prev, avatar: resizedDataUrl }));
      };
    };
    
    reader.onerror = () => {
      console.error('Failed to read image file. Please try again with a different image.');
    };
    
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Save button clicked, preventing default behavior');
    
    try {
      console.log('Starting profile save with data:', {
        displayName: formData.displayName,
        hasAvatar: !!formData.avatar
      });

      // Update profile
      const profileRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          avatar: formData.avatar
        })
      });

      let data;
      try {
        data = await profileRes.json();
        console.log('Profile update response:', data);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error('Failed to process server response. Please try again.');
      }

      if (!profileRes.ok) {
        // Show specific error messages based on error code
        switch (data.code) {
          case 'IMAGE_TOO_LARGE':
            throw new Error('Avatar image too large. Please choose a smaller image or reduce its dimensions.');
          case 'NAME_TOO_LONG':
            throw new Error('Display name too long. Maximum length is 50 characters.');
          case 'AUTH_REQUIRED':
            throw new Error('Please log in to update your profile.');
          case 'INVALID_TOKEN':
            throw new Error('Your session has expired. Please log in again.');
          case 'UPDATE_FAILED':
            throw new Error('Failed to update profile. Please try again.');
          default:
            throw new Error(data.error || 'An unexpected error occurred. Please try again.');
        }
      }

      // If we got here, the profile update was successful
      // Update parent component with the response data
      if (onSave && data.user) {
        await onSave(data);
      }

      // If password fields are filled, update password
      if (formData.oldPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('New passwords do not match.');
        }

        const passwordRes = await fetch('/api/user/password', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword
          })
        });

        let pwData;
        try {
          pwData = await passwordRes.json();
        } catch (parseError) {
          console.error('Failed to parse password response:', parseError);
          throw new Error('Failed to process server response. Please try again.');
        }

        if (!passwordRes.ok) {
          // Show specific error messages based on error code
          switch (pwData.code) {
            case 'PASSWORD_MISMATCH':
              throw new Error('New passwords do not match.');
            case 'INVALID_PASSWORD':
              throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.');
            case 'INVALID_CURRENT_PASSWORD':
              throw new Error('Current password is incorrect.');
            default:
              throw new Error(pwData.error || t('errors.serverError'));
          }
        }

        // Show success toast for password update
        console.log('Password update response:', pwData);
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  };

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-semibold">{t('settings.profile')}</h2>
      
      {/* Profile picture and display name in a row */}
      <div className="flex items-start space-x-6">
        {/* Profile picture */}
        <div className="flex flex-col items-center space-y-2">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-primary overflow-hidden">
              {formData.avatar ? (
                <img 
                  src={formData.avatar || '/default-avatar.png'} 
                  alt={t('profile.profilePicture')} 
                  className="w-full h-full object-cover"
                  onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
                />
              ) : (
                <img 
                  src={'/default-avatar.png'} 
                  alt={t('profile.profilePicture')} 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
              <i className="fas fa-camera text-xl" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
          </div>
          <p className="text-xs text-text-light/60 dark:text-text-dark/60">
            {t('profile.uploadPicture')}
          </p>
        </div>

        {/* Display name */}
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">{t('profile.displayName')}</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full p-2 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('profile.enterDisplayName')}
            maxLength={50}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60 text-right">{formData.displayName.length}/50</div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-medium">{t('profile.changePassword')}</h3>
        
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={formData.oldPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
              className="w-full p-2 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">{t('profile.newPassword')}</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full p-2 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">{t('profile.confirmPassword')}</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full p-2 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full p-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {t('settings.saveChanges')}
      </button>
    </div>
  );
}

function Preferences() {
  const { dark, setTheme, chatColor, setChatColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { addToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const [model, setModel] = useState('openai');
  const { characters, handleDeleteCharacter, reloadCharacters, setSelectedIndex, setSelectedIndexRaw } = useCharacter();
  const { token } = useAuth();
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [showDeleteNelConfirm, setShowDeleteNelConfirm] = useState(false);
  const [showRestoreNelConfirm, setShowRestoreNelConfirm] = useState(false);

  const fontOptions = [
    { label: 'Default', value: 'inherit' },
    { label: 'Sans-serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, Comic Sans, cursive' },
    { label: 'Cursive', value: 'cursive' },
  ];

  const handleModelChange = (e) => {
    e.stopPropagation();
    const value = e.target.value;
    setModel(value);
    if (value !== 'openai') {
      addToast({
        type: 'error',
        message: 'This model is not available yet.',
        duration: 4000
      });
    }
  };

  // Helper: find Nelliel index
  const nelIndex = characters.findIndex(c => c.name === 'Nelliel');
  const hasNel = nelIndex !== -1;

  // Delete Nel handler
  const handleDeleteNel = async () => {
    if (!hasNel) {
      addToast({ type: 'error', message: 'No Nel character exists.', duration: 4000 });
      setShowDeleteNelConfirm(false);
      return;
    }
    await handleDeleteCharacter(nelIndex);
    addToast({ type: 'success', message: 'Nel character deleted.', duration: 3000 });
    await reloadCharacters();
    setSelectedIndexRaw(0);
    setShowDeleteNelConfirm(false);
  };

  // Restore Nel handler
  const handleRestoreNel = async () => {
    if (hasNel) {
      addToast({ type: 'error', message: 'Nel character already exists.', duration: 4000 });
      setShowRestoreNelConfirm(false);
      return;
    }
    // Use default Nelliel definition
    const defaultNel = {
      name: "Nelliel",
      personality: "Your custom AI companion.",
      avatar: "/nel-avatar.png",
      bookmarked: false,
      systemPrompt: "You are Nelliel, a helpful and friendly AI companion. You are knowledgeable, empathetic, and always eager to assist users with their questions and tasks.",
      customInstructions: "",
    };
    // Create Nel at the top of the list
    const res = await fetch("/api/characters", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(defaultNel),
      credentials: 'include',
    });
    if (!res.ok) {
      addToast({ type: 'error', message: 'Failed to restore Nel.', duration: 4000 });
      setShowRestoreNelConfirm(false);
      return;
    }
    addToast({ type: 'success', message: 'Nel character restored.', duration: 3000 });
    await reloadCharacters();
    // After reload, select Nel at the top
    setSelectedIndexRaw(0);
    setShowRestoreNelConfirm(false);
  };

  return (
    <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-2xl font-semibold">{t('settings.preferences')}</h2>
      {/* Theme selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-3">{t('settings.theme')}</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme('system');
            }}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
              dark === null 
                ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                : 'border-container-border-light dark:border-container-border-dark hover:border-primary/40'
            }`}
          >
            <i className="fas fa-laptop text-2xl mb-2" />
            <span className="text-sm font-medium">{t('settings.system')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme('light');
            }}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
              dark === false 
                ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                : 'border-container-border-light dark:border-container-border-dark hover:border-primary/40'
            }`}
          >
            <i className="fas fa-sun text-2xl mb-2" />
            <span className="text-sm font-medium">{t('settings.light')}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTheme('dark');
            }}
            className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
              dark === true 
                ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                : 'border-container-border-light dark:border-container-border-dark hover:border-primary/40'
            }`}
          >
            <i className="fas fa-moon text-2xl mb-2" />
            <span className="text-sm font-medium">{t('settings.dark')}</span>
          </button>
        </div>
      </div>

      {/* Language and Model selectors in a row */}
      <div className="flex space-x-4">
        <div className="space-y-2" style={{ minWidth: '8rem' }}>
          <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
          <select
            value={language}
            onChange={(e) => {
              e.stopPropagation();
              setLanguage(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-40 p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="flex-1 space-y-2 min-w-[12rem] max-w-md">
          <label className="block text-sm font-medium mb-2">Model</label>
          <select
            value={model || 'openai'}
            onChange={handleModelChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="openai">OpenAI API</option>
            <option value="custom">Custom Model (coming soon)</option>
            <option value="other">Other (coming soon)</option>
          </select>
        </div>
      </div>

      {/* Chat color picker and font selector */}
      <div className="space-y-2">
        <div className="flex flex-row items-end space-x-28">
        <label className="block text-sm font-medium mb-2">{t('settings.chatColor')}</label>
          <label className="block text-sm font-medium mb-2">Font</label>
        </div>
        <div className="flex flex-row items-start space-x-4">
          <div className="flex flex-col items-center">
          <input
            type="color"
            value={chatColor}
            onChange={(e) => {
              e.stopPropagation();
              setChatColor(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-16 h-16 rounded-lg cursor-pointer"
          />
          </div>
          <div className="flex flex-col">
            <input
              type="text"
              value={chatColor}
              onChange={(e) => {
                e.stopPropagation();
                setChatColor(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
              style={{ width: '14ch', minWidth: '14ch', maxWidth: '14ch' }}
            />
          </div>
          <div className="flex flex-col">
            <select
              value={settings.chatFont || 'inherit'}
              onChange={e => updateSettings({ chatFont: e.target.value })}
              className="p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ minWidth: 120 }}
            >
              {fontOptions.map(opt => (
                <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value }}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Move Advanced Options Toggle to the bottom */}
      <div className="mt-8">
        <div className="flex items-center space-x-3 mt-2">
          <label className="block text-sm font-medium">Advanced Options</label>
          <button
            type="button"
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${advancedOptions ? 'bg-primary' : 'bg-gray-400'}`}
            onClick={() => setAdvancedOptions(v => !v)}
            aria-pressed={advancedOptions}
          >
            <span
              className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${advancedOptions ? 'translate-x-6' : ''}`}
            />
          </button>
        </div>
        {/* Advanced Options Content */}
        {advancedOptions && (
          <div className="space-y-4 border border-container-border-light dark:border-container-border-dark rounded-lg p-4 mt-2 bg-background-container-light dark:bg-background-container-dark">
            <div className="flex space-x-4 mb-2">
              <button
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-semibold"
                onClick={() => setShowDeleteNelConfirm(true)}
              >
                Delete Nel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-semibold"
                onClick={() => setShowRestoreNelConfirm(true)}
              >
                Restore Nel
              </button>
      </div>
      {/* Auto-regenerate after edit toggle */}
            <div className="flex items-center space-x-3 mt-2">
        <label className="block text-sm font-medium">Auto-regenerate AI response after editing user message</label>
        <button
          type="button"
          className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${settings.autoRegenerateAfterEdit ? 'bg-primary' : 'bg-gray-400'}`}
          onClick={() => updateSettings({ autoRegenerateAfterEdit: !settings.autoRegenerateAfterEdit })}
          aria-pressed={settings.autoRegenerateAfterEdit}
        >
          <span
            className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${settings.autoRegenerateAfterEdit ? 'translate-x-6' : ''}`}
          />
        </button>
      </div>
          </div>
        )}
      </div>
      {/* Delete Nel Confirmation Modal */}
      {showDeleteNelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Are you sure you want to delete Nel?</h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteNelConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteNel}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Restore Nel Confirmation Modal */}
      {showRestoreNelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Are you sure you want to restore Nel?</h3>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowRestoreNelConfirm(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreNel}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const modalRef = useRef(null);
  const isMobile = useIsMobile();

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: 'user' },
    { id: 'preferences', label: t('settings.preferences'), icon: 'cog' }
  ];

  const handleProfileSave = async (data) => {
    try {
      console.log('Profile save response:', data);
      if (data && data.user) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error in handleProfileSave:', error);
    }
  };

  // Handle clicks on the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Prevent closing when clicking inside the modal
  const handleModalClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isMobile ? 'p-0' : ''}`}
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropClick}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div 
        ref={modalRef}
        className={`relative bg-background-container-light dark:bg-background-container-dark shadow-xl flex overflow-hidden border-2 border-container-border-light dark:border-container-border-dark shadow-container-shadow-light dark:shadow-container-shadow-dark transition-all duration-300 hover:border-primary/40 hover:shadow-2xl ${isMobile ? 'w-full h-full max-w-none max-h-none rounded-none flex-col' : 'w-full max-w-4xl rounded-xl'}`}
        onClick={handleModalClick}
      >
        {/* Tabs as top nav on mobile, sidebar on desktop */}
        {isMobile ? (
          <div className="flex w-full border-b border-container-border-light dark:border-container-border-dark bg-background-light dark:bg-background-dark">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 px-1 text-base font-medium transition-all duration-200 ${activeTab === tab.id ? 'text-primary border-b-2 border-primary bg-background-container-light dark:bg-background-container-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
              >
                <i className={`fas fa-${tab.icon} mb-1`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        ) : (
        <div 
          className="w-48 bg-gradient-to-b from-background-gradient-light-start via-background-gradient-light-mid to-background-gradient-light-end dark:bg-gradient-to-b dark:from-background-gradient-dark-start dark:via-background-gradient-dark-mid dark:to-background-gradient-dark-end border-r border-container-border-light dark:border-container-border-dark p-2"
          onClick={handleModalClick}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab(tab.id);
              }}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark'
              }`}
            >
              <i className={`fas fa-${tab.icon}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        )}

        {/* Content area */}
        <div 
          className={`flex-1 bg-gradient-to-b from-background-gradient-light-start via-background-gradient-light-mid to-background-gradient-light-end dark:bg-gradient-to-b dark:from-background-gradient-dark-start dark:via-background-gradient-dark-mid dark:to-background-gradient-dark-end ${isMobile ? 'overflow-y-auto max-h-full p-4' : 'p-6 overflow-y-auto max-h-[80vh]'}`}
          onClick={handleModalClick}
        >
            {activeTab === 'profile' && (
              <Profile 
                user={user} 
                onSave={handleProfileSave}
              />
            )}
            {activeTab === 'preferences' && <Preferences />}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className={`absolute ${isMobile ? 'top-3 right-3' : 'top-4 right-4'} w-8 h-8 flex items-center justify-center rounded-full text-text-light/60 dark:text-text-dark/60 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors`}
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
} 