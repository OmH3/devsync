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

        console.log('🔍 === GOOGLE CALLBACK DEBUG ===');
        console.log('🔍 Status:', status);
        console.log('🔍 Browser:', navigator.userAgent);
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Current cookies:', document.cookie);

        if (status === 'success') {
          console.log('✅ OAuth successful');
          
          // ✅ Test cookie setting manually
          console.log('🔧 Testing manual cookie setting...');
          
          // Test if we can set a cross-origin cookie
          document.cookie = "test-cross-origin=test-value; path=/; secure; samesite=none";
          console.log('🔍 After manual cookie test:', document.cookie);
          
          // ✅ Browser-specific waiting
          const isBrave = navigator.userAgent.includes('Brave');
          const isFirefox = navigator.userAgent.includes('Firefox');
          const waitTime = isBrave ? 4000 : isFirefox ? 3000 : 2000;
          
          console.log(`⏳ Waiting ${waitTime}ms for ${navigator.userAgent.includes('Chrome') ? 'Chrome' : isFirefox ? 'Firefox' : isBrave ? 'Brave' : 'browser'}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          console.log('🔍 Cookies after wait:', document.cookie);
          
          // ✅ Test API call manually first
          console.log('🔧 Testing manual API call...');
          try {
            const testResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/user/current`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            console.log('🔍 Manual API test status:', testResponse.status);
            
            if (testResponse.ok) {
              const testData = await testResponse.json();
              console.log('✅ Manual API test success:', testData.user?.email);
            }
          } catch (apiError) {
            console.log('❌ Manual API test failed:', apiError);
          }
          
          console.log('✅ Checking authentication via store...');
          const result = await checkAuth();
          
          if (result?.isAuthenticated) {
            console.log('✅ Authentication verified, redirecting to dashboard');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('❌ Authentication verification failed');
            console.log('🔍 Final cookies:', document.cookie);
            
            // ✅ If current setup fails, suggest Firebase
            console.log('🚨 Consider switching to Firebase Auth for better cross-origin support');
            navigate('/login?error=Session not established - Consider Firebase Auth', { replace: true });
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
          Testing cross-origin authentication...
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;