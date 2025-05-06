import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export function SettingsProvider({ children }) {
  // Load settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('app_settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      language: 'en',
      chatStyle: 'default',
      chatColor: '#7C3AED',
      aiModel: 'gpt-3.5'
    };
  });

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
} 