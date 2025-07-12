import {create} from 'zustand';

export const useVideoStore = create((set, get)=>({
    // Stream client state
    client: null,
    call: null,
    isConnected: false,

    // Call state
    isCallActive: false,
    callId: null,
    participants: [],

    // UI state
    isCameraOn: true,
    isMicOn: true,
    
    // Actions
    setClient: (client) => set({ client }),
}))