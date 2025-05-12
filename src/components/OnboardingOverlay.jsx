import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const steps = [
  {
    id: 'sidebar',
    title: 'Character Management',
    description: 'Here you\'ll find all your characters. Nelliel is your default companion, and you can create or import more characters here.',
    position: 'left',
    target: '.sidebar',
    arrow: 'right',
  },
  {
    id: 'newCharacter',
    title: 'Create & Import',
    description: 'Create new characters or import existing ones from various formats.',
    position: 'left',
    target: '.new-character-button',
    arrow: 'right',
  },
  {
    id: 'explore',
    title: 'Explore',
    description: 'Discover trending characters and find new companions to chat with.',
    position: 'left',
    target: '.explore-button',
    arrow: 'right',
  },
  {
    id: 'chat',
    title: 'Chat Window',
    description: 'This is where the magic happens! Chat with your characters and build meaningful connections.',
    position: 'center',
    target: '.chat-window',
    arrow: 'bottom',
  },
  {
    id: 'characterPane',
    title: 'Character Details',
    description: 'View and edit your character\'s personality, likes, dislikes, and more.',
    position: 'right',
    target: '.character-pane',
    arrow: 'left',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Access your settings, preferences, and account information.',
    position: 'right',
    target: '.profile-button',
    arrow: 'left',
  },
];

export default function OnboardingOverlay({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
      {/* Highlight overlay */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/50" />
        <div 
          className={`absolute transition-all duration-500 ease-in-out ${
            currentStepData.position === 'left' ? 'left-0 w-1/4' :
            currentStepData.position === 'right' ? 'right-0 w-1/4' :
            'left-1/4 w-1/2'
          } h-full`}
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
        </div>
      </div>

      {/* Tooltip */}
      <div 
        className={`absolute transition-all duration-500 ease-in-out ${
          currentStepData.position === 'left' ? 'left-[30%]' :
          currentStepData.position === 'right' ? 'right-[30%]' :
          'left-1/2 -translate-x-1/2'
        } top-1/2 -translate-y-1/2 w-80 bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 shadow-2xl border-2 border-primary/40 animate-fade-in-up`}
      >
        <h3 className="text-xl font-bold mb-2 text-text-light dark:text-text-dark">
          {currentStepData.title}
        </h3>
        <p className="text-text-light/80 dark:text-text-dark/80 mb-6">
          {currentStepData.description}
        </p>
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-text-light/60 dark:text-text-dark/60 hover:text-text-light dark:hover:text-text-dark transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center space-x-4">
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-primary'
                      : 'bg-text-light/20 dark:bg-text-dark/20'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div 
        className={`absolute transition-all duration-500 ease-in-out ${
          currentStepData.position === 'left' ? 'left-[25%]' :
          currentStepData.position === 'right' ? 'right-[25%]' :
          'left-1/2'
        } top-1/2 -translate-y-1/2 ${
          currentStepData.arrow === 'right' ? 'rotate-0' :
          currentStepData.arrow === 'left' ? 'rotate-180' :
          'rotate-90'
        }`}
      >
        <div className="w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-l-[20px] border-primary" />
      </div>
    </div>
  );
} 