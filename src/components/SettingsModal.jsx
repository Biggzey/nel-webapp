import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';

// Tab components
function Profile({ user, onSave }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    avatar: user?.avatar || null
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);
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
                {formData.username.charAt(0).toUpperCase()}
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

        <div>
          <label className="block text-sm font-medium mb-1">{t('profile.username')}</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="w-full p-3 rounded-lg bg-background-container-hover-light dark:bg-background-container-hover-dark border border-container-border-light dark:border-container-border-dark focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={t('profile.enterUsername')}
            maxLength={20}
          />
          <div className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60 text-right">{formData.username.length}/20</div>
        </div>

        <button
          onClick={() => onSave(formData)}
          className="w-full p-3 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          {t('settings.saveChanges')}
        </button>
      </div>
    </div>
  );
}

function Preferences() {
  const { dark, setTheme, chatColor, setChatColor } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [tempColor, setTempColor] = useState(chatColor);

  // Reset temp color when modal opens
  useEffect(() => {
    setTempColor(chatColor);
  }, [chatColor]);

  const handleSave = () => {
    setIsSaving(true);
    setChatColor(tempColor);
    setIsSaving(false);
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
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();
  const { t } = useLanguage();

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: 'user' },
    { id: 'preferences', label: t('settings.preferences'), icon: 'cog' }
  ];

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
            {activeTab === 'profile' && <Profile user={user} onSave={() => {}} />}
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