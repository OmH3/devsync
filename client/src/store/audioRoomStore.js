import { create } from 'zustand';
import audioRoomService from '../services/audioroom.service.js';

export const useAudioRoomStore = create((set, get) => ({
  // ✅ Audio room state
  isInAudioRoom: false,
  audioRoomId: null,
  workspaceId: null,
  participants: [],
  isConnecting: false,
  isMuted: false,
  isSpeaking: false,
  streamClient: null,
  call: null,
  token: null,
  user: null,
  error: null,

  // ✅ UI state
  showParticipants: true,
  audioRoomMinimized: false,
  
  // ✅ Actions
  setAudioRoomState: (state) => set(state),

  setParticipants: (participants) => set({ participants }),

  // ✅ Get Stream token
  getStreamToken: async (workspaceId) => {
    set({ isConnecting: true, error: null });
    try {
      const result = await audioRoomService.getStreamToken(workspaceId);
      set({ 
        token: result.token,
        user: result.user,
        workspaceId 
      });
      return result;
    } catch (error) {
      console.error('❌ Failed to get Stream token:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to get audio token',
        isConnecting: false 
      });
      throw error;
    }
  },

  // ✅ Start audio room
  startAudioRoom: async (workspaceId, roomName) => {
    set({ isConnecting: true, error: null });
    try {
      const result = await audioRoomService.startAudioRoom(workspaceId, roomName);
      set({
        audioRoomId: result.audioRoomId,
        workspaceId,
        isConnecting: false,
        isInAudioRoom: true
      });
      return result;
    } catch (error) {
      console.error('❌ Failed to start audio room:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to start audio room',
        isConnecting: false 
      });
      throw error;
    }
  },

  // ✅ Leave audio room
  leaveAudioRoom: async () => {
    const { workspaceId, audioRoomId, call, streamClient } = get();
    
    console.log('🎵 Leaving audio room...');

    try {
      // ✅ Leave Stream call first
      if (call) {
        await call.leave();
        console.log('✅ Left Stream call');
      }
      
      // ✅ Disconnect Stream client
      if (streamClient) {
        await streamClient.disconnectUser();
        console.log('✅ Disconnected Stream client');
      }

      // ✅ Notify backend (if we have room info)
      if (workspaceId && audioRoomId) {
        try {
          await audioRoomService.leaveAudioRoom(workspaceId, audioRoomId);
          console.log('✅ Notified backend of leave');
        } catch (backendError) {
          console.warn('⚠️ Failed to notify backend, but continuing cleanup:', backendError);
        }
      }

      // ✅ Reset state
      set({
        isInAudioRoom: false,
        audioRoomId: null,
        participants: [],
        call: null,
        streamClient: null,
        isMuted: false,
        isSpeaking: false,
        error: null
      });

      console.log('✅ Audio room cleanup completed');
    } catch (error) {
      console.error('❌ Failed to leave audio room:', error);
      // ✅ Still reset state even if there was an error
      set({
        isInAudioRoom: false,
        audioRoomId: null,
        participants: [],
        call: null,
        streamClient: null,
        isMuted: false,
        isSpeaking: false,
        error: error.response?.data?.message || 'Failed to leave audio room'
      });
    }
  },

  // ✅ End audio room (admin only) - FIXED
  endAudioRoom: async () => {
    const { workspaceId, audioRoomId } = get();
    
    if (!workspaceId || !audioRoomId) {
      console.warn('⚠️ No workspace or audio room to end');
      return;
    }

    try {
      console.log('🎵 Ending audio room for everyone...');
      
      // ✅ Call backend to end room (this will emit socket event to all users)
      await audioRoomService.endAudioRoom(workspaceId, audioRoomId);
      
      console.log('✅ Audio room ended successfully on backend');
      
      // ✅ Reset local state immediately (don't wait for socket event)
      set({
        isInAudioRoom: false,
        audioRoomId: null,
        participants: [],
        call: null,
        streamClient: null,
        isMuted: false,
        isSpeaking: false,
        error: null
      });

    } catch (error) {
      console.error('❌ Failed to end audio room:', error);
      set({ error: error.response?.data?.message || 'Failed to end audio room' });
      throw error;
    }
  },

  // ✅ Toggle mute
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  // ✅ Set Stream client and call
  setStreamConnection: (streamClient, call) => set({ streamClient, call }),

  // ✅ Clear error
  clearError: () => set({ error: null }),

  // ✅ Toggle UI states
  toggleParticipants: () => set((state) => ({ showParticipants: !state.showParticipants })),
  toggleMinimized: () => set((state) => ({ audioRoomMinimized: !state.audioRoomMinimized })),
}));