import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import Toast from './Toast';
import { useNavigate } from 'react-router-dom';

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
  const { navigate } = useNavigate();
  const [toast, setToast] = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file size before processing
    const maxSizeMB = 5; // 5MB max for original file
    if (file.size > maxSizeMB * 1024 * 1024) {
      setToast({
        type: 'error',
        message: `Image file too large. Maximum size is ${maxSizeMB}MB. Please choose a smaller image.`,
        duration: 5000
      });
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
        setToast({
          type: 'success',
          message: 'Image uploaded and resized successfully',
          duration: 3000
        });
      };
    };
    
    reader.onerror = () => {
      setToast({
        type: 'error',
        message: 'Failed to read image file. Please try again with a different image.',
        duration: 5000
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
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

      // Handle different HTTP status codes
      if (profileRes.status === 404) {
        throw new Error('Server endpoint not found. Please try again later or contact support if the issue persists.');
      } else if (profileRes.status === 401) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const data = await profileRes.json().catch(() => ({
        error: 'Failed to parse server response',
        code: 'PARSE_ERROR'
      }));

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
          case 'PARSE_ERROR':
            throw new Error('Failed to process server response. Please try again.');
          default:
            throw new Error(data.error || 'An unexpected error occurred. Please try again.');
        }
      }

      // If password fields are filled, update password
      if (formData.oldPassword && formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          setToast({
            type: 'error',
            message: t('profile.passwordMismatch'),
            duration: 5000
          });
          return;
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

        const pwData = await passwordRes.json().catch(() => ({}));

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

        // Clear password fields
        setFormData(prev => ({
          ...prev,
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));

        setToast({
          type: 'success',
          message: t('profile.passwordChanged'),
          duration: 3000
        });
      }

      // Show success toast with specific message
      setToast({
        type: 'success',
        message: data.message || t('settings.profileUpdated'),
        duration: 3000
      });

      // Update parent component with the response data
      onSave(data);
    } catch (error) {
      console.error('Error updating profile:', error);
      setToast({
        type: 'error',
        message: error.message || 'An unexpected error occurred. Please try again.',
        duration: 5000
      });

      // If session expired, redirect to login
      if (error.message.includes('session has expired')) {
        logout();
        navigate('/login');
      }
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('settings.profile')}</h2>
      
      {/* Profile picture */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full bg-primary overflow-hidden">
            {formData.avatar ? (
              <img 
                src={formData.avatar} 
                alt={t('profile.profilePicture')} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-5xl font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-opacity">
            <i className="fas fa-camera text-2xl" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <p className="text-sm text-text-light/60 dark:text-text-dark/60">
          {t('profile.uploadPicture')}
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.displayName')}</label>
          <input
            type="text"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('profile.enterDisplayName')}
            maxLength={50}
          />
          <div className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60 text-right">{formData.displayName.length}/50</div>
        </div>

        {/* Password Change Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium">{t('profile.changePassword')}</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.currentPassword')}</label>
            <input
              type="password"
              value={formData.oldPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, oldPassword: e.target.value }))}
              className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.newPassword')}</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
              className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('profile.confirmPassword')}</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full p-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          {t('settings.saveChanges')}
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function Preferences() {
  const { dark, setTheme, chatColor, setChatColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [tempColor, setTempColor] = useState(chatColor);
  const [toast, setToast] = useState(null);

  // Reset temp color when modal opens
  useEffect(() => {
    setTempColor(chatColor);
  }, [chatColor]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setChatColor(tempColor);
      
      // Show success toast
      setToast({
        type: 'success',
        message: t('settings.preferencesUpdated'),
        duration: 3000
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setToast({
        type: 'error',
        message: error.message || t('errors.serverError'),
        duration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('settings.preferences')}</h2>
      
      {/* Theme selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-3">{t('settings.theme')}</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('system')}
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
            onClick={() => setTheme('light')}
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
            onClick={() => setTheme('dark')}
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

      {/* Language selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      {/* Chat color picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-2">{t('settings.chatColor')}</label>
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={tempColor}
            onChange={(e) => setTempColor(e.target.value)}
            className="w-16 h-16 rounded-lg cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              value={tempColor}
              onChange={(e) => setTempColor(e.target.value)}
              className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="pt-4 border-t border-container-border-light/10 dark:border-container-border-dark/10">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full p-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSaving ? t('settings.saving') : t('settings.saveChanges')}
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: 'user' },
    { id: 'preferences', label: t('settings.preferences'), icon: 'cog' }
  ];

  const handleProfileSave = async (data) => {
    await refreshUser(); // Refresh user data after profile update
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl bg-background-light dark:bg-background-dark rounded-xl shadow-xl flex overflow-hidden border-2 border-container-border-light dark:border-container-border-dark shadow-container-shadow-light dark:shadow-container-shadow-dark transition-all duration-300 hover:border-primary/40 hover:shadow-2xl">
        {/* Sidebar with container styling */}
        <div className="w-48 bg-background-container-light dark:bg-background-container-dark border-r border-container-border-light dark:border-container-border-dark p-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

        {/* Content area with container styling */}
        <div className="flex-1 bg-background-container-light dark:bg-background-container-dark">
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {activeTab === 'profile' && <Profile user={user} onSave={handleProfileSave} />}
            {activeTab === 'preferences' && <Preferences />}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-text-light/60 dark:text-text-dark/60 hover:bg-background-container-hover-light dark:hover:bg-background-container-hover-dark transition-colors"
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
} 