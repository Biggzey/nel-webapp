import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

// Onboarding steps with selectors and custom tooltip placement logic
const steps = [
  {
    id: 'nelliel-row',
    title: 'Meet Nelliel',
    description: 'This is where all your characters will appear. You can reorder them, delete, clear chat, and manage your companions. Nelliel is your default AI companion and always appears at the top.',
    selector: '.nelliel-row-onboarding-anchor',
    getTooltipStyle: (rect) => ({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
      maxWidth: rect.width,
    })
  },
  {
    id: 'explore-button',
    title: 'Explore Characters',
    description: 'Discover trending and new characters. Click here to explore more AI companions.',
    selector: '.sidebar .explore-button',
    getTooltipStyle: (rect) => ({
      left: rect.left + 16,
      top: rect.bottom + 8,
      width: rect.width - 32,
      maxWidth: rect.width - 32,
    })
  },
  {
    id: 'new-character',
    title: 'Create or Import',
    description: 'Create a new character or import one from a file. Use these buttons to expand your collection.',
    selector: '.sidebar .new-character-button',
    getTooltipStyle: (rect) => ({
      left: rect.left + 16,
      top: rect.bottom + 8,
      width: Math.max(rect.width - 32, 220),
      maxWidth: Math.max(rect.width - 32, 220),
    })
  },
  {
    id: 'chat-window',
    title: 'Chat Window',
    description: 'This is where you chat with your selected character. Type your message below and press send.',
    selector: '.chat-window',
    getTooltipStyle: (rect) => ({
      left: rect.left + rect.width / 2 - 180,
      top: rect.top + rect.height / 2 - 80,
      width: 360,
      maxWidth: 360,
    })
  },
  {
    id: 'character-pane-info',
    title: 'Character Details',
    description: 'View and edit your character\'s details, such as age, gender, and personality. This pane gives you full control over your companion.',
    selector: '.character-pane .character-name-onboarding-anchor',
    getTooltipStyle: (rect) => ({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
      maxWidth: rect.width,
    }),
    isFinal: true
  }
];

function getRect(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect;
}

const SpotlightOnboarding = ({ onFinish, markOnboardingComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [active, setActive] = useState(true);
  const prevHtmlOverflow = useRef();
  const prevBodyOverflow = useRef();

  // Only set overflow: hidden when overlay is visible, and always clean up
  useEffect(() => {
    if (!active) return;
    prevHtmlOverflow.current = document.documentElement.style.overflow;
    prevBodyOverflow.current = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow.current || '';
      document.body.style.overflow = prevBodyOverflow.current || '';
    };
  }, [active]);

  // Update rect and viewport on step change/resize/scroll
  useEffect(() => {
    if (!active) return;
    function update() {
      const r = getRect(steps[currentStep].selector);
      setRect(r);
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [currentStep, active]);

  if (!active) return null;
  if (!rect) return null;

  // SVG mask for spotlight effect
  const maskId = 'onboarding-spotlight-mask';
  const mask = (
    <svg width={viewport.width} height={viewport.height} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 10000, width: viewport.width, height: viewport.height }}>
      <defs>
        <mask id={maskId}>
          <rect x={0} y={0} width={viewport.width} height={viewport.height} fill="white" />
          <rect
            x={rect.left - 8}
            y={rect.top - 8}
            width={rect.width + 16}
            height={rect.height + 16}
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

  // Tooltip style for this step
  const tooltipStyle = steps[currentStep].getTooltipStyle(rect);

  function handleSkip() {
    setActive(false);
    if (markOnboardingComplete) markOnboardingComplete();
    if (onFinish) onFinish();
  }

  function handleNext() {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else {
      setActive(false);
      if (markOnboardingComplete) markOnboardingComplete();
      if (onFinish) onFinish();
    }
  }

  return createPortal(
    <>
      {mask}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed z-[10001] bg-white dark:bg-gray-900 border border-primary/40 shadow-2xl rounded-xl p-6"
        style={{
          ...tooltipStyle,
          position: 'fixed',
          boxSizing: 'border-box',
        }}
      >
        <h3 className="text-xl font-bold mb-2">{steps[currentStep].title}</h3>
        <p className="mb-6 text-gray-700 dark:text-gray-200">{steps[currentStep].description}</p>
        <div className="flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            Skip
          </button>
          {steps[currentStep].isFinal ? (
            <button
              onClick={handleNext}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              End
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Next
            </button>
          )}
        </div>
      </motion.div>
    </>,
    document.body
  );
};

export default SpotlightOnboarding; 
