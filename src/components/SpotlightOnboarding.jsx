import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const steps = [
  {
    id: 'sidebar',
    title: 'Character Selection',
    description: 'Browse and select from our collection of AI characters. Each has a unique personality and backstory.',
    position: 'left'
  },
  {
    id: 'chat',
    title: 'Chat Interface',
    description: 'Engage in natural conversations with your chosen character. The chat history is automatically saved.',
    position: 'right'
  },
  {
    id: 'character',
    title: 'Character Details',
    description: 'View and customize your character\'s personality, appearance, and background story.',
    position: 'right'
  }
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
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      });

      // Calculate tooltip position
      const position = steps[currentStep].position;
      const tooltipX = position === 'left' ? rect.left - 300 : rect.right + 20;
      const tooltipY = rect.top + (rect.height / 2);

      setTooltipPosition({ x: tooltipX, y: tooltipY });
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
      >
        <div className="absolute inset-0 bg-black/50" />
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <mask id="spotlight">
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
            fill="black"
            mask="url(#spotlight)"
            opacity="0.5"
          />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateY(-50%)',
            maxWidth: '280px',
            zIndex: 51
          }}
        >
          <div className="bg-white rounded-lg shadow-xl p-4">
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
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default SpotlightOnboarding; 
