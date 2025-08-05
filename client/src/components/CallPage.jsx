import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getStreamToken, joinCall } from "../utils/api.js";

import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  CallControls,
  SpeakerLayout,
  StreamTheme,
  CallingState,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

import "@stream-io/video-react-sdk/dist/css/styles.css";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const CallPage = () => {
  const { callId } = useParams();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const { user, isLoading } = useAuth();

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useQuery({
    queryKey: ["streamToken", workspaceId],
    queryFn: () => getStreamToken(workspaceId),
    enabled: !!user && !!workspaceId,
  });

  useEffect(() => {
    const initCall = async () => {
      if (!tokenData?.token || !user || !callId) return;

      try {
        console.log("Initializing Stream video client...");

        // ✅ Only notify server about joining (Stream handles leaving)
        try {
          await joinCall(callId);
          console.log("Notified server of call join");
        } catch (error) {
          console.error("Error notifying server of call join:", error);
        }

        const streamUser = {
          id: user._id,
          name: user.name,
          image: user.profilePicture || `https://getstream.io/random_svg/?id=${user._id}&name=${user.name}`,
        };

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: streamUser,
          token: tokenData.token,
        });

        const callInstance = videoClient.call("default", callId);

        await callInstance.join({ create: true });

        console.log("Joined call successfully");

        setClient(videoClient);
        setCall(callInstance);
      } catch (error) {
        console.error("Error joining call:", error);
        alert("Could not join the call. Please try again.");
      } finally {
        setIsConnecting(false);
      }
    };

    initCall();

    // Cleanup function to notify server when leaving
  return () => {
    if (call) {
      call.leave().catch(console.error);
    }
    if (client) {
      client.disconnectUser().catch(console.error);
    }
  };
  }, [tokenData, user, callId]);

  if (isLoading || tokenLoading || isConnecting) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="mb-4">Failed to authenticate for video call</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {client && call ? (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <CallContent />
          </StreamCall>
        </StreamVideo>
      ) : (
        <div className="h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <p className="mb-4">Failed to connect to the call</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CallContent = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const navigate = useNavigate();

  if (callingState === CallingState.LEFT) {
    navigate('/dashboard');
    return null;
  }

  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining call...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamTheme>
      <div className="h-screen flex flex-col bg-gray-900">

        {/* Main video area */}
        <div className="flex-1">
          <SpeakerLayout />
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-800">
          <CallControls />
        </div>
      </div>
    </StreamTheme>
  );
};

export default CallPage;