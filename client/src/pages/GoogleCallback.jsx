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
      const redirect = searchParams.get('redirect');
      const message = searchParams.get('message');

      if (status === 'success') {
        // ✅ Check authentication with backend to get user data
        const isAuthenticated = await checkAuth();
        
        if (isAuthenticated) {
          if (redirect === 'dashboard') {
            // ✅ User has no workspace, show workspace list
            navigate('/dashboard', { replace: true });
          } else {
            // ✅ User might have a workspace, let dashboard handle routing
            navigate('/dashboard', { replace: true });
          }
        } else {
          // ✅ Authentication failed
          navigate('/login?error=Authentication failed', { replace: true });
        }
      } else {
        // ✅ OAuth failed
        const errorMessage = message || 'Google authentication failed';
        navigate(`/login?error=${encodeURIComponent(errorMessage)}`, { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg mb-4">Processing Google authentication...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default GoogleCallback;