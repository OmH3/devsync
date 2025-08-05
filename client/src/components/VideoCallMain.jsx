import React from 'react';
import CallButton from './CallButton';

const VideoCallMain = ({ workspaceId, workspace }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Call Button */}
      <CallButton workspaceId={workspaceId} />
      
      {/* Instructions */}
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-6">
            <div className="text-6xl mb-4">📹</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Video Calling
            </h2>
            <p className="text-gray-600">
              Click "Start Video Call" to begin a video conference for {workspace?.name}
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Features:</h3>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• High-quality video and audio</li>
              <li>• Screen sharing capabilities</li>
              <li>• Multiple participants support</li>
              <li>• Cross-platform compatibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCallMain;