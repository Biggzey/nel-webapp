import React, { useState } from 'react';
import { useToast } from './Toast';

export default function AdminPasswordResetModal({ isOpen, onClose, user, onPasswordGenerated }) {
  const { addToast } = useToast();
  const [randomPassword, setRandomPassword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !user) return null;

  const handleGenerateRandom = async () => {
    setIsGenerating(true);
    try {
      // Call backend to generate a random password
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.temporaryPassword) throw new Error(data.error || 'Failed to generate password');
      setRandomPassword(data.temporaryPassword);
      addToast({ type: 'success', message: 'Random password generated.', duration: 4000 });
      onPasswordGenerated && onPasswordGenerated(data.temporaryPassword);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to generate password.', duration: 5000 });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendResetEmail = async () => {
    setIsSending(true);
    try {
      // Call backend to send reset email (to be implemented)
      const res = await fetch(`/api/admin/users/${user.id}/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset email');
      addToast({ type: 'success', message: 'Password reset email sent.', duration: 4000 });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to send reset email.', duration: 5000 });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
        <h2 className="text-xl font-bold mb-4">Reset Password for {user.username}</h2>
        <div className="space-y-4">
          <button
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:opacity-50"
            onClick={handleGenerateRandom}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Random Password'}
          </button>
          {randomPassword && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-center font-mono text-lg border border-primary/30">
              {randomPassword}
            </div>
          )}
          <button
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleSendResetEmail}
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send Email Reset Link'}
          </button>
        </div>
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-primary text-2xl focus:outline-none"
          onClick={onClose}
        >
          <i className="fas fa-times" />
        </button>
      </div>
    </div>
  );
} 