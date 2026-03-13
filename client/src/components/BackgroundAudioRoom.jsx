import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAudioRoomStore } from '../store/audioRoomStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../hooks/useAuth.js';

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  useCallStateHooks,
  CallingState,
  ParticipantsAudio,
  Avatar,
  OwnCapability
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const BackgroundAudioRoom = ({ workspaceId }) => {
  console.log(' BackgroundAudioRoom rendered with workspaceId:', workspaceId);

  const {
    isInAudioRoom,
    audioRoomId,
    token,
    user,
    error,
    audioRoomMinimized,
    getStreamToken,
    setAudioRoomState,
    leaveAudioRoom,
    clearError,
    toggleMinimized,
    setStreamConnection
  } = useAudioRoomStore();

  const { user: authUser } = useAuth();
  const socket = useSocket();
  
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  //Refs for cleanup
  const clientRef = useRef(null);
  const callRef = useRef(null);
  const isCleanedUp = useRef(false);

  //Initialize Stream connection - FIXED PERMISSION FLOW
  const initializeStreamAudio = useCallback(async () => {
    if (!token || !user || !audioRoomId || client || isConnecting || isCleanedUp.current) {
      return;
    }

    setIsConnecting(true);
    
    try {
      console.log(' Initializing Stream Video client for audio room...');

      //Create Stream client
      const streamClient = new StreamVideoClient({
        apiKey: STREAM_API_KEY,
        user: {
          id: user.id,
          name: user.name,
          image: user.image
        },
        token: token
      });

      console.log(' Stream client created');

      //Create call with 'default' type (more compatible than audio_room)
      const audioCall = streamClient.call('default', audioRoomId);
      console.log(' Audio call created');

      //FIX: Join the call FIRST, then request permissions
      await audioCall.join({
        create: true,
        data: {
          custom: {
            title: 'Team Audio Room',
            description: 'Real-time team communication',
          }
        }
      });

      console.log(' Successfully joined audio room');

      //FIX: Request permissions AFTER joining
      try {
        await audioCall.requestPermissions({
          permissions: [OwnCapability.SEND_AUDIO],
        });
        console.log(' Audio permissions granted');
      } catch (permError) {
        console.warn(' Permission request failed (may not be needed):', permError.message);
        // Continue anyway - permissions might be granted by default
      }

      //Store refs for cleanup
      clientRef.current = streamClient;
      callRef.current = audioCall;
      
      setClient(streamClient);
      setCall(audioCall);
      setStreamConnection(streamClient, audioCall);

      //Emit socket event
      if (socket) {
        socket.emit('join-audio-room-socket', {
          workspaceId,
          audioRoomId
        });
      }

    } catch (error) {
      console.error(' Failed to initialize audio room:', error);
      setAudioRoomState({ 
        error: `Failed to connect to audio room: ${error.message}` 
      });
    } finally {
      setIsConnecting(false);
    }
  }, [token, user, audioRoomId, client, isConnecting, setAudioRoomState, socket, workspaceId, setStreamConnection]);

  //Cleanup function
  const cleanup = useCallback(async () => {
    if (isCleanedUp.current) return;
    
    isCleanedUp.current = true;
    console.log(' Cleaning up audio room...');

    try {
      if (callRef.current) {
        await callRef.current.leave();
        console.log(' Left audio call');
      }
      
      if (clientRef.current) {
        await clientRef.current.disconnectUser();
        console.log(' Disconnected from Stream');
      }
    } catch (error) {
      console.error(' Cleanup error:', error);
    } finally {
      setClient(null);
      setCall(null);
      clientRef.current = null;
      callRef.current = null;
      isCleanedUp.current = false;
    }
  }, []);

  //FIX: Listen for audio room events with better cleanup handling
  useEffect(() => {
    if (!socket || !workspaceId) return;

    socket.emit('join-workspace', { workspaceId });

    const handleAudioRoomStarted = async (data) => {
      console.log(' Audio room started event:', data);
      
      // Get Stream token and join
      try {
        await getStreamToken(workspaceId);
        setAudioRoomState({ 
          isInAudioRoom: true, 
          audioRoomId: data.audioRoomId 
        });
      } catch (error) {
        console.error(' Failed to get token for audio room:', error);
      }
    };

    //FIX: Better handling of audio room ended event
    const handleAudioRoomEnded = async (data) => {
      console.log(' Audio room ended event received:', data);
      
      //Call the store's leaveAudioRoom to properly cleanup
      try {
        await leaveAudioRoom();
        console.log(' Cleaned up after room end event');
      } catch (error) {
        console.error(' Error during cleanup:', error);
        //Force reset state even if cleanup fails
        setAudioRoomState({ 
          isInAudioRoom: false, 
          audioRoomId: null,
          call: null,
          streamClient: null,
          participants: []
        });
      }
    };

    socket.on('audio-room-started', handleAudioRoomStarted);
    socket.on('audio-room-ended', handleAudioRoomEnded);

    return () => {
      socket.off('audio-room-started', handleAudioRoomStarted);
      socket.off('audio-room-ended', handleAudioRoomEnded);
      socket.emit('leave-workspace', { workspaceId });
    };
  }, [socket, workspaceId, getStreamToken, setAudioRoomState, leaveAudioRoom]);

  //Initialize when ready
  useEffect(() => {
    if (isInAudioRoom && token && user && audioRoomId && !client) {
      initializeStreamAudio();
    }
  }, [isInAudioRoom, token, user, audioRoomId, client, initializeStreamAudio]);

  //Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  //Don't render if not in audio room
  if (!isInAudioRoom) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {client && call ? (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <AudioRoomWidget
              call={call}
              onLeave={() => {
                cleanup();
                leaveAudioRoom();
              }}
              audioRoomMinimized={audioRoomMinimized}
              onToggleMinimized={toggleMinimized}
              error={error}
              onClearError={clearError}
            />
          </StreamCall>
        </StreamVideo>
      ) : (
        <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">
              {isConnecting ? 'Connecting to audio room...' : 'Setting up audio room...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

//Audio Room Widget Component (Fixed Permissions)
const AudioRoomWidget = ({ 
  call, 
  onLeave, 
  audioRoomMinimized, 
  onToggleMinimized, 
  error, 
  onClearError 
}) => {
  const { useCallCallingState, useCallCustomData, useParticipants, useMicrophoneState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const custom = useCallCustomData();
  const participants = useParticipants();
  const { microphone, isMute } = useMicrophoneState();

  //Handle mic toggle with better error handling
  const handleMicToggle = useCallback(async () => {
    try {
      if (isMute) {
        await microphone.enable();
        console.log(' Microphone enabled');
      } else {
        await microphone.disable();
        console.log(' Microphone disabled');
      }
    } catch (error) {
      console.error(' Failed to toggle microphone:', error);
    }
  }, [microphone, isMute]);

  if (callingState === CallingState.LEFT) {
    return null;
  }

  if (audioRoomMinimized) {
    return (
      <div 
        className="bg-green-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-green-700 transition-colors"
        onClick={onToggleMinimized}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg"></span>
          <span className="text-sm font-medium">{participants.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl border w-80 max-w-sm">
      {/* Header */}
      <div className="bg-green-600 text-white p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg"></span>
          <div>
            <h2 className="font-medium">{custom?.title || 'Audio Room'}</h2>
            <p className="text-sm opacity-90">{participants.length} participants</p>
          </div>
        </div>
        <button
          onClick={onToggleMinimized}
          className="p-1 hover:bg-green-700 rounded"
          title="Minimize"
        >
          
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border-b border-red-200 p-2 text-sm flex items-center justify-between text-red-700">
          <span>{error}</span>
          <button onClick={onClearError} className="text-red-500 hover:text-red-700">
            
          </button>
        </div>
      )}

      {/* Description */}
      {custom?.description && (
        <div className="p-2 bg-gray-50 border-b text-sm text-gray-600">
          {custom.description}
        </div>
      )}

      {/* Participants */}
      <div className="p-3 max-h-40 overflow-y-auto">
        {/*  Audio output for all participants */}
        <ParticipantsAudio participants={participants} />
        
        <div className="space-y-2">
          {participants.map((participant) => (
            <div key={participant.sessionId} className={`flex items-center gap-2 p-2 rounded ${participant.isSpeaking ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
              <Avatar imageSrc={participant.image} />
              <span className="flex-1 text-sm font-medium">
                {participant.name}
                {participant.isLocalParticipant && ' (You)'}
              </span>
              <div className="flex items-center gap-1">
                {participant.isSpeaking && (
                  <span className="text-green-500 text-xs animate-pulse"></span>
                )}
                {participant.publishedTracks.includes('audio') ? (
                  <span className="text-green-500 text-xs"></span>
                ) : (
                  <span className="text-red-500 text-xs"></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-t bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handleMicToggle}
            className={`p-2 rounded-full ${isMute ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
          >
            {isMute ? '' : ''}
          </button>
          
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
          >
            Leave Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundAudioRoom;