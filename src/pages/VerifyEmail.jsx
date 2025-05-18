import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }
    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();
        if (response.ok) {
          setStatus('success');
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to verify email');
        }
      } catch (err) {
        setStatus('error');
        setError('An unexpected error occurred');
      }
    };
    verifyEmail();
  }, [searchParams, navigate]);

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
              <p className="mt-2 text-sm text-gray-400">
                {t('auth.emailVerification.redirecting')}
              </p>
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