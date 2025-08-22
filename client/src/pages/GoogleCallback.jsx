import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const status = searchParams.get('status');
        const message = searchParams.get('message');

        console.log('🔍 Google callback received');
        console.log('🔍 Status:', status);
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Current cookies:', document.cookie); // ✅ Check cookies

        if (status === 'success') {
          console.log('✅ OAuth successful, waiting for session...');
          
          // ✅ Wait longer for session to be established
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('🔍 Cookies after wait:', document.cookie); // ✅ Check again
          
          console.log('✅ Checking authentication...');
          const result = await checkAuth();
          
          if (result.isAuthenticated) {
            console.log('✅ Authentication verified, redirecting to dashboard');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('❌ Authentication verification failed');
            console.log('🔍 Final cookies:', document.cookie);
            navigate('/login?error=Session not established', { replace: true });
          }
        } else {
          const errorMessage = message || 'Google authentication failed';
          console.log('❌ OAuth failed:', errorMessage);
          navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
        }
      } catch (error) {
        console.error('❌ Error in Google callback:', error);
        navigate('/login?error=Authentication error', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-lg mb-4 text-gray-700">
          Processing Google authentication...
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <div className="text-sm text-gray-500 mt-4">
          Please wait while we establish your session
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;