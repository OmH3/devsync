import { create } from 'zustand';
import { StreamVideoClient } from '@stream-io/video-react-sdk';

export const useVideoCallStore = create((set, get) => ({
  // State
  streamClient: null,
  currentCall: null,
  isInCall: false,
  isInitialized: false,
  error: null,
  participants: [],
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,

  // Actions
  initializeStreamClient: async (apiKey, user, token) => {
    try {
      const client = new StreamVideoClient({ apiKey, user, token });
      
      // Connect the user
      await client.connectUser(user, token);
      
      set({ 
        streamClient: client, 
        isInitialized: true,
        error: null 
      });
      return client;
    } catch (error) {
      console.error('Failed to initialize Stream client:', error);
      set({ error: error.message });
      return null;
    }
  },

  createCall: async (callId) => {
    const { streamClient } = get();
    if (!streamClient) {
      throw new Error('Stream client not initialized');
    }

    try {
      const call = streamClient.call('default', callId);
      await call.getOrCreate();
      
      set({ 
        currentCall: call, 
        isInCall: true,
        error: null 
      });
      
      return call;
    } catch (error) {
      console.error('Failed to create call:', error);
      set({ error: error.message });
      throw error;
    }
  },

  joinCall: async (callId) => {
    const { streamClient } = get();
    if (!streamClient) {
      throw new Error('Stream client not initialized');
    }

    try {
      const call = streamClient.call('default', callId);
      await call.join();
      
      set({ 
        currentCall: call, 
        isInCall: true,
        error: null 
      });
      
      return call;
    } catch (error) {
      console.error('Failed to join call:', error);
      set({ error: error.message });
      throw error;
    }
  },

  leaveCall: async () => {
    const { currentCall } = get();
    if (currentCall) {
      try {
        await currentCall.leave();
        set({ 
          currentCall: null, 
          isInCall: false,
          participants: [],
          error: null 
        });
      } catch (error) {
        console.error('Failed to leave call:', error);
        set({ error: error.message });
      }
    }
  },

  toggleAudio: async () => {
    const { currentCall, isAudioEnabled } = get();
    if (currentCall) {
      try {
        if (isAudioEnabled) {
          await currentCall.microphone.disable();
        } else {
          await currentCall.microphone.enable();
        }
        set({ isAudioEnabled: !isAudioEnabled });
      } catch (error) {
        console.error('Failed to toggle audio:', error);
      }
    }
  },

  toggleVideo: async () => {
    const { currentCall, isVideoEnabled } = get();
    if (currentCall) {
      try {
        if (isVideoEnabled) {
          await currentCall.camera.disable();
        } else {
          await currentCall.camera.enable();
        }
        set({ isVideoEnabled: !isVideoEnabled });
      } catch (error) {
        console.error('Failed to toggle video:', error);
      }
    }
  },

  toggleScreenShare: async () => {
    const { currentCall, isScreenSharing } = get();
    if (currentCall) {
      try {
        if (isScreenSharing) {
          await currentCall.screenShare.disable();
        } else {
          await currentCall.screenShare.enable();
        }
        set({ isScreenSharing: !isScreenSharing });
      } catch (error) {
        console.error('Failed to toggle screen share:', error);
      }
    }
  },

  clearError: () => set({ error: null }),

  reset: async () => {
    const { currentCall, streamClient } = get();
    
    if (currentCall) {
      try {
        await currentCall.leave();
      } catch (error) {
        console.error('Error leaving call:', error);
      }
    }
    
    if (streamClient) {
      try {
        await streamClient.disconnectUser();
      } catch (error) {
        console.error('Error disconnecting user:', error);
      }
    }
    
    set({
      streamClient: null,
      currentCall: null,
      isInCall: false,
      isInitialized: false,
      error: null,
      participants: [],
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
    });
  },
}));