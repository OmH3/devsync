import { api } from '../utils/api.js';

//Audio Room Service Functions
export const getStreamToken = async (workspaceId) => {
  const response = await api.get(`/audioroom/token?workspaceId=${workspaceId}`);
  return response.data;
};

export const startAudioRoom = async (workspaceId, roomName = null) => {
  const response = await api.post('/audioroom/start', {
    workspaceId,
    roomName
  });
  return response.data;
};

export const joinAudioRoom = async (workspaceId, audioRoomId) => {
  const response = await api.post('/audioroom/join', {
    workspaceId,
    audioRoomId
  });
  return response.data;
};

export const leaveAudioRoom = async (workspaceId, audioRoomId) => {
  const response = await api.post('/audioroom/leave', {
    workspaceId,
    audioRoomId
  });
  return response.data;
};

export const endAudioRoom = async (workspaceId, audioRoomId) => {
  const response = await api.post('/audioroom/end', {
    workspaceId,
    audioRoomId
  });
  return response.data;
};

export const getAudioRoomStatus = async (workspaceId) => {
  const response = await api.get(`/audioroom/status/${workspaceId}`);
  return response.data;
};

//Default export
const audioRoomService = {
  getStreamToken,
  startAudioRoom,
  joinAudioRoom,
  leaveAudioRoom,
  endAudioRoom,
  getAudioRoomStatus
};

export default audioRoomService;