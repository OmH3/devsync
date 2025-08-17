import React, { useState, useEffect } from 'react';
import { useAudioRoomStore } from '../store/audioRoomStore.js';
import { useSocket } from '../hooks/useSocket.js';

const AudioRoomButton = ({ workspaceId }) => {
  const {
    isInAudioRoom,
    startAudioRoom,
    endAudioRoom,
    leaveAudioRoom, // ✅ ADD: Import leaveAudioRoom
    error,
    clearError,
    isConnecting
  } = useAudioRoomStore();
  
  const socket = useSocket();
  const [isLoading, setIsLoading] = useState(false);
  const [audioRoomActive, setAudioRoomActive] = useState(false);

  // ✅ Listen for audio room status
  useEffect(() => {
    if (!socket || !workspaceId) return;

    socket.emit('join-workspace', { workspaceId });

    const handleAudioRoomStarted = (data) => {
      console.log('🎵 Audio room started:', data);
      setAudioRoomActive(true);
    };

    const handleAudioRoomEnded = (data) => {
      console.log('🎵 Audio room ended:', data);
      setAudioRoomActive(false);
    };

    socket.on('audio-room-started', handleAudioRoomStarted);
    socket.on('audio-room-ended', handleAudioRoomEnded);

    return () => {
      socket.off('audio-room-started', handleAudioRoomStarted);
      socket.off('audio-room-ended', handleAudioRoomEnded);
    };
  }, [socket, workspaceId]);

  const handleStartAudioRoom = async () => {
    setIsLoading(true);
    try {
      await startAudioRoom(workspaceId, 'Team Audio Room');
      console.log('✅ Audio room started successfully');
    } catch (error) {
      console.error('❌ Failed to start audio room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIX: Handle end room with proper cleanup
  const handleEndAudioRoom = async () => {
    if (confirm('Are you sure you want to end the audio room?')) {
      setIsLoading(true);
      try {
        console.log('🎵 Owner ending audio room...');
        
        // ✅ FIX: Leave the audio room first (cleans up Stream connection)
        await leaveAudioRoom();
        
        // ✅ Then end it for everyone (backend will emit socket event)
        await endAudioRoom();
        
        // ✅ Update local state immediately
        setAudioRoomActive(false);
        
        console.log('✅ Audio room ended successfully');
      } catch (error) {
        console.error('❌ Failed to end audio room:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Error display */}
      {error && (
        <div className="text-red-600 text-sm">
          {error}
          <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* Main button */}
      {audioRoomActive || isInAudioRoom ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Audio room active</span>
          </div>
          <button
            onClick={handleEndAudioRoom}
            disabled={isLoading || isConnecting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm"
          >
            {isLoading ? 'Ending...' : 'End Room'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleStartAudioRoom}
          disabled={isLoading || isConnecting}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg">🎵</span>
          {isLoading || isConnecting ? 'Starting...' : 'Start Audio Room'}
        </button>
      )}
    </div>
  );
};

export default AudioRoomButton;