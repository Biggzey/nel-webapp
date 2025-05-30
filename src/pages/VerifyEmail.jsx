import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

console.log("[VerifyEmail] component loaded");

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    console.log("[VerifyEmail] useEffect running. Token:", token);
    
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setError('No verification token provided');
        console.error('[VerifyEmail] No verification token provided');
        return;
      }

      try {
        // Get the API URL from environment or use the current origin
        const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
        const fetchUrl = `${apiUrl}/api/verify-email?token=${encodeURIComponent(token)}`;
        console.log("[VerifyEmail] About to fetch:", fetchUrl);
        
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        console.log("[VerifyEmail] Response status:", response.status);
        const data = await response.json();
        console.log("[VerifyEmail] Response data:", data);

        if (response.ok) {
          setStatus('success');
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('error');
          setError(data.error || 'Failed to verify email');
          console.error('[VerifyEmail] Verification failed:', data.error || 'Failed to verify email');
        }
      } catch (err) {
        console.error('[VerifyEmail] Verification error:', err);
        setStatus('error');
        setError('An unexpected error occurred while verifying your email');
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