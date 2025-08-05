import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', {
        withCredentials: true,
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return socket;
};