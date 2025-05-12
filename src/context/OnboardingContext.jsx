import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const OnboardingContext = createContext();

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export const OnboardingProvider = ({ children }) => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const { user, token } = useAuth();

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!user || !token) return;

      try {
        const response = await fetch('/api/user/onboarding', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setHasSeenOnboarding(data.hasSeenOnboarding);
        } else {
          // If there's an error, default to showing onboarding
          setHasSeenOnboarding(false);
        }
      } catch (error) {
        console.error('Error fetching onboarding status:', error);
        setHasSeenOnboarding(false);
      }
    };

    fetchOnboardingStatus();
  }, [user, token]);

  const markOnboardingComplete = async () => {
    if (!user || !token) return;

    try {
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setHasSeenOnboarding(true);
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const value = {
    hasSeenOnboarding,
    markOnboardingComplete,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}; 