import React, { useState } from 'react';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';

export default function RegenerateButton({ message, onRegenerate }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { token } = useAuth();

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      // Call backend to regenerate the AI response for this message
      const res = await fetch(`/api/chat/message/${message.id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to regenerate response');
      }
      const newMsg = await res.json();
      onRegenerate(newMsg);
      addToast({
        type: 'success',
        message: 'AI response regenerated!',
        duration: 4000,
      });
      setShowModal(false);
    } catch (error) {
      addToast({
        type: 'error',
        message: error.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Regenerate button, only visible on hover (same as reaction picker) */}
      <button
        className="absolute bottom-full -right-7 -top-3 mb-1 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-primary rounded-full"
        title="Regenerate AI response"
        onClick={() => setShowModal(true)}
        style={{ zIndex: 31 }}
      >
        <i className="fas fa-sync-alt" />
      </button>
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl p-6 max-w-md w-full mx-4 border-2 border-container-border-light dark:border-container-border-dark shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">Regenerate this AI response?</h3>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-text-light dark:text-text-dark transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 