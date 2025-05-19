import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < 8) {
      addToast({ type: 'error', message: 'Password must be at least 8 characters.', duration: 4000 });
      return;
    }
    if (password !== confirm) {
      addToast({ type: 'error', message: 'Passwords do not match.', duration: 4000 });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      addToast({ type: 'success', message: 'Password reset successful! You can now log in.', duration: 4000 });
      navigate('/login');
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to reset password.', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
      <div className="bg-background-container-light dark:bg-background-container-dark rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
        <h2 className="text-xl font-bold mb-4">Reset Your Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            className="w-full px-4 py-2 rounded border border-primary/30 bg-white dark:bg-gray-800"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            className="w-full px-4 py-2 rounded border border-primary/30 bg-white dark:bg-gray-800"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded hover:bg-primary/90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
} 