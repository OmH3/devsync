import { generateStreamToken, upsertStreamUser } from "../config/stream.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { HTTPSTATUS } from "../config/http.config.js";

let io; // Socket.IO instance
let activeCalls = new Map(); // In-memory store for active calls

export const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

// Store for active calls (in production, use Redis)
const getCallStatus = (callId) => {
  return activeCalls.get(callId) || {
    isActive: false,
    participants: [],
    participantCount: 0
  };
};

const updateCallStatus = (callId, userId, action) => {
  let callStatus = getCallStatus(callId);
  
  if (action === 'join') {
    if (!callStatus.participants.includes(userId)) {
      callStatus.participants.push(userId);
    }
    callStatus.isActive = true;
  } else if (action === 'leave') {
    callStatus.participants = callStatus.participants.filter(id => id !== userId);
    callStatus.isActive = callStatus.participants.length > 0;
  }
  
  callStatus.participantCount = callStatus.participants.length;
  
  if (callStatus.isActive) {
    activeCalls.set(callId, callStatus);
  } else {
    activeCalls.delete(callId);
  }
  
  // Broadcast to all clients in this workspace
  io.emit(`call-status-${callId}`, callStatus);
  
  return callStatus;
};

export const getStreamTokenController = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspaceId = req.query.workspaceId;
    
    // Upsert user in Stream
    const streamUser = {
      id: userId,
      name: req.user.name,
      image: req.user.profilePicture || `https://getstream.io/random_svg/?id=${userId}&name=${req.user.name}`,
    };
    
    await upsertStreamUser(streamUser);
    
    // Generate token
    const token = generateStreamToken(userId);

    return res.status(HTTPSTATUS.OK).json({ 
      token,
      user: streamUser,
      success: true
    });
  } catch (error) {
    console.log("Error in getStreamToken controller:", error.message);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({ 
      message: error.message || "Internal Server Error",
      success: false
    });
  }
});

export const getCallStatusController = asyncHandler(async (req, res) => {
  try {
    const { callId } = req.params;
    const callStatus = getCallStatus(callId);
    
    return res.status(HTTPSTATUS.OK).json(callStatus);
  } catch (error) {
    console.error("Error getting call status:", error.message);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({ 
      message: "Failed to get call status",
      success: false
    });
  }
});

export const joinCallController = asyncHandler(async (req, res) => {
  try {
    const { callId } = req.params;
    const userId = req.user._id.toString();
    
    const callStatus = updateCallStatus(callId, userId, 'join');
    
    return res.status(HTTPSTATUS.OK).json({
      message: "Joined call successfully",
      callStatus,
      success: true
    });
  } catch (error) {
    console.error("Error joining call:", error.message);
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({ 
      message: "Failed to join call",
      success: false
    });
  }
});

// Socket.IO event handlers
export const setupCallSocketEvents = (socket) => {
  // Get call status
  socket.on('get-call-status', (data) => {
    const { callId } = data;
    const callStatus = getCallStatus(callId);
    socket.emit(`call-status-${callId}`, callStatus);
  });
  
  // Join workspace room for call updates
  socket.on('join-workspace', (data) => {
    const { workspaceId } = data;
    socket.join(`workspace-${workspaceId}`);
  });
  
  // Leave workspace room
  socket.on('leave-workspace', (data) => {
    const { workspaceId } = data;
    socket.leave(`workspace-${workspaceId}`);
  });
};