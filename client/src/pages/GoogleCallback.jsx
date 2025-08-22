import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const status = searchParams.get('status');
      const message = searchParams.get('message');

      console.log('🔍 Google callback status:', status);
      console.log('🔍 Current URL:', window.location.href);

      if (status === 'success') {
        try {
          // ✅ Check authentication with backend
          const isAuthenticated = await checkAuth();
          
          if (isAuthenticated) {
            console.log('✅ Authentication verified, redirecting to dashboard');
            // ✅ ALWAYS go to dashboard, never to workspace
            navigate('/dashboard', { replace: true });
          } else {
            console.log('❌ Authentication verification failed');
            navigate('/login?error=Authentication verification failed', { replace: true });
          }
        } catch (error) {
          console.error('❌ Error during auth check:', error);
          navigate('/login?error=Authentication error', { replace: true });
        }
      } else {
        // ✅ OAuth failed
        const errorMessage = message || 'Google authentication failed';
        console.log('❌ OAuth failed:', errorMessage);
        navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-lg mb-4 text-gray-700">Processing Google authentication...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default GoogleCallback;