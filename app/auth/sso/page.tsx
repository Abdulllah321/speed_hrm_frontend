'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export default function SSOPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const status = searchParams.get('status');
    const token = searchParams.get('token');
    const errorMessage = searchParams.get('message');

    // Scenario 1: Third-party sends user directly with token
    if (token && !status) {
      setMessage('Verifying your credentials...');
      setState('loading');
      
      // Call backend SSO API and wait for response
      const backendUrl = 'http://api.localtest.me:5000';
      fetch(`${backendUrl}/api/auth/sso?token=${token}`, {
        method: 'GET',
        credentials: 'include', // Important: include cookies
      })
        .then(async (response) => {
          if (response.ok) {
            // Success - cookies should be set by backend
            setState('success');
            setMessage('Authentication successful! Redirecting to dashboard...');
            
            // Start countdown
            const interval = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  clearInterval(interval);
                  router.push('/hr/dashboard');
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            // Error response from backend
            const data = await response.json().catch(() => ({ message: 'Authentication failed' }));
            setState('error');
            setMessage(data.message || 'Authentication failed. Please try again.');
          }
        })
        .catch((error) => {
          console.error('SSO API call failed:', error);
          setState('error');
          setMessage('Failed to connect to authentication server. Please try again.');
        });
      
      return;
    }

    // Scenario 2: Backend redirected with status=success
    if (status === 'success') {
      // Verify cookies are set
      const hasAccessToken = document.cookie.includes('accessToken=');
      const hasUser = document.cookie.includes('user=');

      if (hasAccessToken && hasUser) {
        setState('success');
        setMessage('Authentication successful! Redirecting to dashboard...');
        
        // Start countdown
        const interval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              router.push('/hr/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      } else {
        setState('error');
        setMessage('Authentication cookies not found. Please try again.');
      }
    } else if (status === 'error') {
      // Scenario 3: Backend redirected with status=error
      setState('error');
      setMessage(errorMessage || 'Authentication failed. Please try again.');
    } else if (!token) {
      // Scenario 4: Direct access without parameters
      setState('error');
      setMessage('No authentication credentials provided. Please use the proper SSO link.');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Loading State */}
          {state === 'loading' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Verifying Authentication
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we verify your credentials...
              </p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Login Successful!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Redirecting in <span className="font-bold text-lg">{countdown}</span> seconds...
                </p>
              </div>

              <button
                onClick={() => router.push('/hr/dashboard')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Go to Dashboard Now
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Authentication Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {message}
              </p>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 dark:text-red-300">
                  If this problem persists, please contact your system administrator.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.location.href = '/auth/login'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Go to Login Page
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors duration-200"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            SpeedHRM - Human Resource Management System
          </p>
        </div>
      </div>
    </div>
  );
}
