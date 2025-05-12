import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const steps = [
  {
    id: 'sidebar',
    title: 'Character Management',
    description: 'Here you\'ll find all your characters. Nelliel is your default companion, and you can create or import more characters here.',
    selector: '.sidebar',
    tooltipPosition: { left: 32, top: 32 }, // top left
  },
  {
    id: 'newCharacter',
    title: 'Create & Import',
    description: 'Create new characters or import existing ones from various formats.',
    selector: '.new-character-button',
    tooltipPosition: { left: 180, top: 32 }, // top left, below new character button
  },
  {
    id: 'explore',
    title: 'Explore',
    description: 'Discover trending characters and find new companions to chat with.',
    selector: '.explore-button',
    tooltipPosition: { left: 180, top: 80 }, // below explore button
  },
  {
    id: 'chat',
    title: 'Chat Window',
    description: 'This is where the magic happens! Chat with your characters and build meaningful connections.',
    selector: '.chat-window',
    tooltipPosition: { left: 400, top: 200 }, // center of chat window
  },
  {
    id: 'characterPane',
    title: 'Character Details',
    description: 'View and edit your character\'s personality, likes, dislikes, and more.',
    selector: '.character-pane',
    tooltipPosition: { right: 32, top: 100 }, // top right, near character pane
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Access your settings, preferences, and account information.',
    selector: '.profile-button',
    tooltipPosition: { right: 32, top: 32 }, // top right
  },
];

function getSpotlightRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

export default function SpotlightOnboarding({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const tooltipRef = useRef();
  const [viewport, setViewport] = useState({ width: 1920, height: 1080 });

  // Prevent scrollbars when onboarding is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function updateRect() {
      const rect = getSpotlightRect(steps[currentStep].selector);
      setSpotlightRect(rect);
    }
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStep]);

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  if (!isOpen || !spotlightRect) return null;

  // Use fixed tooltip position for each step, but clamp to viewport
  let tooltipStyle = {
    position: 'fixed',
    zIndex: 10001,
    maxWidth: 320,
    ...steps[currentStep].tooltipPosition,
  };
  // Clamp left/right
  if (tooltipStyle.left !== undefined) {
    tooltipStyle.left = Math.max(16, Math.min(tooltipStyle.left, (viewport.width || window.innerWidth) - 340));
  }
  if (tooltipStyle.right !== undefined) {
    tooltipStyle.right = Math.max(16, Math.min(tooltipStyle.right, (viewport.width || window.innerWidth) - 340));
  }
  // Clamp top
  if (tooltipStyle.top !== undefined) {
    tooltipStyle.top = Math.max(16, Math.min(tooltipStyle.top, (viewport.height || window.innerHeight) - 180));
  }

  // SVG mask for spotlight effect (subtle)
  const maskId = 'onboarding-spotlight-mask';
  const mask = (
    <svg width={viewport.width} height={viewport.height} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 10000, width: viewport.width, height: viewport.height }}>
      <defs>
        <mask id={maskId}>
          <rect x={0} y={0} width={viewport.width} height={viewport.height} fill="white" />
          <rect
            x={spotlightRect.left - 8}
            y={spotlightRect.top - 8}
            width={spotlightRect.width + 16}
            height={spotlightRect.height + 16}
            rx={12}
            fill="black"
          />
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={viewport.width}
        height={viewport.height}
        fill="rgba(0,0,0,0.25)"
        mask={`url(#${maskId})`}
      />
    </svg>
  );

  function handleSkip() {
    localStorage.setItem('hasSeenSpotlightOnboarding', 'true');
    onClose();
  }

  function handleNext() {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else {
      localStorage.setItem('hasSeenSpotlightOnboarding', 'true');
      onClose();
    }
  }

  return createPortal(
    <>
      {mask}
      <div style={tooltipStyle} ref={tooltipRef} className="rounded-xl bg-background-container-light dark:bg-background-container-dark p-6 shadow-2xl border-2 border-primary/40 animate-fade-in-up text-text-light dark:text-text-dark">
        <h3 className="text-xl font-bold mb-2">{steps[currentStep].title}</h3>
        <p className="mb-6 text-text-light/80 dark:text-text-dark/80">{steps[currentStep].description}</p>
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
    </>,
    document.body
  );
} 