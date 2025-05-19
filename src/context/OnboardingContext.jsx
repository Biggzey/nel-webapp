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
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingActive, setOnboardingActive] = useState(true);
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
          if (data.hasSeenOnboarding) {
            setOnboardingActive(false);
          }
        } else {
          setHasSeenOnboarding(false);
          setOnboardingActive(true);
        }
      } catch (error) {
        console.error('Error fetching onboarding status:', error);
        setHasSeenOnboarding(false);
        setOnboardingActive(true);
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
        setOnboardingActive(false);
      }
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const value = {
    hasSeenOnboarding,
    markOnboardingComplete,
    onboardingStep,
    setOnboardingStep,
    onboardingActive,
    setOnboardingActive,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}; 