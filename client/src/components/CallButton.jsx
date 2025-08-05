import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";

function CallButton({ workspaceId }) {
  const navigate = useNavigate();
  const socket = useSocket();
  const [callStatus, setCallStatus] = useState({
    isActive: false,
    participants: [],
    participantCount: 0,
    loading: true
  });

  const callId = `workspace-${workspaceId}`;

  useEffect(() => {
    if (socket) {
      // Join workspace room for real-time updates
      socket.emit('join-workspace', { workspaceId });

      // Listen for call status updates
      socket.on(`call-status-${callId}`, (status) => {
        console.log('Call status updated:', status);
        setCallStatus({
          ...status,
          loading: false
        });
      });

      // Request current call status
      socket.emit('get-call-status', { callId });

      return () => {
        socket.off(`call-status-${callId}`);
        socket.emit('leave-workspace', { workspaceId });
      };
    }
  }, [socket, callId, workspaceId]);

  const handleVideoCall = () => {
    console.log("Joining/Starting call with ID:", callId);
    // Navigate to the call page with workspace ID
    navigate(`/call/${callId}?workspaceId=${workspaceId}`);
  };

  if (callStatus.loading) {
    return (
      <div className="p-3 border-b flex items-center justify-end max-w-7xl mx-auto w-full">
        <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          Checking call status...
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border-b flex items-center justify-end max-w-7xl mx-auto w-full">
      {callStatus.isActive ? (
        // Show "Join Call" when call is active
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Call in progress</span>
            </div>
            <span className="text-gray-400">•</span>
            <span>{callStatus.participantCount} participant{callStatus.participantCount !== 1 ? 's' : ''}</span>
          </div>
          <button 
            onClick={handleVideoCall} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">🎯</span>
            Join Call
          </button>
        </div>
      ) : (
        // Show "Start Video Call" when no active call
        <button 
          onClick={handleVideoCall} 
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <span className="text-lg">📹</span>
          Start Video Call
        </button>
      )}
    </div>
  );
}

export default CallButton;