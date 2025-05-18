import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      addToast({ type: 'error', message: 'No verification token provided', duration: 5000 });
      return;
    }
    fetch(`/api/verify-email?token=${token}`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok && data.success) {
          setStatus('success');
          addToast({ type: 'success', message: t('auth.emailVerification.success'), duration: 5000 });
        } else {
          setStatus('error');
          setError(data.error || 'Failed to verify email');
          addToast({ type: 'error', message: data.error || 'Failed to verify email', duration: 5000 });
        }
      })
      .catch(() => {
        setStatus('error');
        setError('An unexpected error occurred');
        addToast({ type: 'error', message: 'An unexpected error occurred', duration: 5000 });
      });
  }, [searchParams, addToast, t]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-md p-8">
        <div className="bg-[#2b2b2b] p-8 rounded-lg shadow-xl w-full text-center">
          <h1 className="text-2xl font-semibold mb-6 text-white">
            {t('auth.emailVerification.title')}
          </h1>
          
          {status === 'verifying' && (
            <div className="text-white">
              <p>{t('auth.emailVerification.verifying')}</p>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-green-400">
              <p>{t('auth.emailVerification.success')}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                {t('auth.emailVerification.backToLogin')}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-red-500">
              <p>{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
              >
                {t('auth.emailVerification.backToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 