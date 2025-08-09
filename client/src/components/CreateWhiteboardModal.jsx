import React, { useState } from 'react';
import { useWhiteboardStore } from '../store/whiteboardStore.js';

const CreateWhiteboardModal = ({ isOpen, onClose, workspaceId, onSuccess }) => {
  const [formData, setFormData] = useState({
    boardTitle: '',
    boardDescription: ''
  });

  const { createWhiteboard, isLoading } = useWhiteboardStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.boardTitle.trim()) {
      alert('Please enter a board title');
      return;
    }

    try {
      const result = await createWhiteboard({
        ...formData,
        workspaceId
      });

      if (result.success) {
        onSuccess?.(result.whiteboard);
        onClose();
        setFormData({ boardTitle: '', boardDescription: '' });
      }
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create New Whiteboard</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Title *
            </label>
            <input
              type="text"
              value={formData.boardTitle}
              onChange={(e) => setFormData({ ...formData, boardTitle: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter board title"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.boardDescription}
              onChange={(e) => setFormData({ ...formData, boardDescription: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows="3"
              placeholder="Enter board description (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWhiteboardModal;