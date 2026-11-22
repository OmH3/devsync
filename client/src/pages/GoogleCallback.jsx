import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PageLoader from '../components/ui/PageLoader.jsx';

// Finishes the Google sign-in: the server has already set the session cookie, so we only
// need to confirm it and continue (no artificial browser-specific delay).
const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    const failWith = (message) => navigate(`/login?error=${encodeURIComponent(message)}`, { replace: true });

    const finish = async () => {
      if (searchParams.get('status') !== 'success') {
        failWith(searchParams.get('message') || 'Google authentication failed');
        return;
      }
      try {
        const result = await checkAuth();
        if (result?.isAuthenticated) navigate('/dashboard', { replace: true });
        else failWith('Sign-in could not be completed. Please try again.');
      } catch {
        failWith('Authentication error');
      }
    };

    finish();
  }, [searchParams, navigate, checkAuth]);

  return <PageLoader label="Completing Google sign-in" />;
};

export default GoogleCallback;
