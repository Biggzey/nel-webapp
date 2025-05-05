import React, { useEffect } from 'react';

const TOAST_TYPES = {
  success: {
    icon: 'fa-check-circle',
    bgColor: 'bg-green-500',
    textColor: 'text-white'
  },
  error: {
    icon: 'fa-exclamation-circle',
    bgColor: 'bg-red-500',
    textColor: 'text-white'
  },
  warning: {
    icon: 'fa-exclamation-triangle',
    bgColor: 'bg-yellow-500',
    textColor: 'text-white'
  },
  info: {
    icon: 'fa-info-circle',
    bgColor: 'bg-blue-500',
    textColor: 'text-white'
  }
};

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
      <div
        data-testid="toast"
        className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${toastStyle.bgColor} ${toastStyle.textColor}`}
      >
        <i className={`fas ${toastStyle.icon}`} />
        <p>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 hover:opacity-80 transition"
            aria-label="Close notification"
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>
    </div>
  );
} 