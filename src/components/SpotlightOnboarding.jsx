import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    id: 'sidebar',
    title: 'Character Selection',
    description: 'Choose from your AI companions or create new ones here.',
    position: 'left',
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    description: 'Engage in conversations with your AI companions in this space.',
    position: 'center',
  },
  {
    id: 'character-pane',
    title: 'Character Details',
    description: 'View and customize your AI companion\'s personality and settings.',
    position: 'right',
  },
];

const SpotlightOnboarding = ({ onFinish }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState(null);
  const [maskPosition, setMaskPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const overlayRef = useRef(null);

  useEffect(() => {
    const element = document.getElementById(steps[currentStep].id);
    if (element) {
      setTargetElement(element);
      const rect = element.getBoundingClientRect();
      setMaskPosition({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });

      // Calculate tooltip position based on step position
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let x, y;

      switch (steps[currentStep].position) {
        case 'left':
          x = Math.min(rect.right + 20, viewportWidth - 300);
          y = Math.min(rect.top + rect.height / 2, viewportHeight - 100);
          break;
        case 'right':
          x = Math.max(rect.left - 320, 20);
          y = Math.min(rect.top + rect.height / 2, viewportHeight - 100);
          break;
        default: // center
          x = Math.max(20, Math.min(rect.left + rect.width / 2 - 150, viewportWidth - 320));
          y = Math.min(rect.bottom + 20, viewportHeight - 100);
      }

      setTooltipPosition({ x, y });
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={maskPosition.x}
                y={maskPosition.y}
                width={maskPosition.width}
                height={maskPosition.height}
                fill="black"
                rx="8"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bg-white rounded-lg shadow-xl p-6 max-w-sm"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateY(-50%)',
          }}
        >
          <h3 className="text-lg font-semibold mb-2">{steps[currentStep].title}</h3>
          <p className="text-gray-600 mb-4">{steps[currentStep].description}</p>
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default SpotlightOnboarding; 