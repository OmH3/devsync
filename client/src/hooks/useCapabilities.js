import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api.js';

const DISABLED = { audio: false, googleAuth: false, codeExecution: false };

// Server-owned feature flags (GET /api/capabilities). UI flags only hide controls;
// the server still enforces every operation.
export const useCapabilities = () => {
  const { data } = useQuery({
    queryKey: ['capabilities'],
    queryFn: async () => (await api.get('/capabilities')).data,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  return data ?? DISABLED;
};
