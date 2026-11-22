import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { acquireSocket, releaseSocket } from '../realtime/sharedSocket.js';

// Returns the tab-wide shared socket while a user is signed in.
// Subscribes only to the user id so profile edits do not reconnect the socket.
export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const userId = useAuthStore((state) => state.user?._id ?? state.user?.id ?? null);

  useEffect(() => {
    if (!userId) return undefined;
    setSocket(acquireSocket());
    return () => {
      releaseSocket();
      setSocket(null);
    };
  }, [userId]);

  return socket;
};
