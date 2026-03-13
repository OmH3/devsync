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

        if (status === 'success') {
          //Browser-specific waiting for session establishment
          const isBrave = navigator.userAgent.includes('Brave');
          const isFirefox = navigator.userAgent.includes('Firefox');
          const waitTime = isBrave ? 4000 : isFirefox ? 3000 : 2000;
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          //Test API call to verify session
          try {
            const testResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/current`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (!testResponse.ok) {
              throw new Error('API verification failed');
            }
          } catch (apiError) {
            console.error('API verification failed:', apiError);
          }
          
          const result = await checkAuth();
          
          if (result?.isAuthenticated) {
            navigate('/dashboard', { replace: true });
          } else {
            //If current setup fails, suggest Firebase
            console.log(' Consider switching to Firebase Auth for better cross-origin support');
            navigate('/login?error=Session not established - Consider Firebase Auth', { replace: true });
          }
        } else {
          const errorMessage = message || 'Google authentication failed';
          navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
        }
      } catch (error) {
        console.error(' Error in Google callback:', error);
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
          Testing cross-origin authentication...
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;