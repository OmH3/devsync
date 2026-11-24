import React, { useState, useCallback } from 'react';
import WhiteboardList from './WhiteboardList.jsx';
import CanvasBoard from './editors/CanvasBoard.jsx';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const WhiteboardMain = React.memo(({ workspaceId }) => {
  const [selectedWhiteboard, setSelectedWhiteboard] = useState(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const setCurrentWhiteboard = useWhiteboardStore((state) => state.setCurrentWhiteboard);

  const handleWhiteboardSelect = useCallback((whiteboard) => {
    setSelectedWhiteboard(whiteboard);
    setCurrentWhiteboard(whiteboard);
    setShowCanvas(true);
  }, [setCurrentWhiteboard]);

  const handleBackToList = useCallback(() => {
    setShowCanvas(false);
    setSelectedWhiteboard(null);
    setCurrentWhiteboard(null);
  }, [setCurrentWhiteboard]);

  if (showCanvas && selectedWhiteboard) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
          <button
            type="button"
            onClick={handleBackToList}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200/70"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Whiteboards
          </button>
          <span className="text-xs text-slate-500">
            Created by {selectedWhiteboard.creatorId?.name || 'Unknown'}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <CanvasBoard key={selectedWhiteboard._id} whiteboard={selectedWhiteboard} />
        </div>
      </div>
    );
  }

  return <WhiteboardList workspaceId={workspaceId} onWhiteboardSelect={handleWhiteboardSelect} />;
});

WhiteboardMain.displayName = 'WhiteboardMain';

export default WhiteboardMain;
