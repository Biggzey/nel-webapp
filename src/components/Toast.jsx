import React, { useEffect, createContext, useContext, useState, useCallback } from 'react';

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

// ToastContext for global access
const ToastContext = createContext({ addToast: () => {}, removeToast: () => {} });
export const useToast = () => useContext(ToastContext);

// ToastProvider to wrap the app
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    if (toast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

// ToastContainer component to manage multiple toasts
export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 min-w-[300px] max-w-[400px]">
      {Array.isArray(toasts) && toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => {
            onClose(toast.id);
          }}
        />
      ))}
    </div>
  );
}

function Toast({ id, message, type = 'info', duration = 3000, onClose }) {
  useEffect(() => {
    let timeoutId;
    if (duration && onClose) {
      timeoutId = setTimeout(() => {
        onClose(id);
      }, duration);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [duration, onClose, id, message, type]);

  const toastStyle = TOAST_TYPES[type] || TOAST_TYPES.info;

  return (
    <div className="transform transition-all duration-300 ease-in-out">
      <div
        data-testid="toast"
        className={`flex items-center justify-between px-4 py-3 rounded-lg shadow-lg ${toastStyle.bgColor} ${toastStyle.textColor}`}
      >
        <div className="flex items-center space-x-2">
          <i className={`fas ${toastStyle.icon}`} />
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={() => onClose(id)}
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

export default Toast; 