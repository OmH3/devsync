import React, { useState, useEffect } from 'react';
import { useFilesystemStore } from '../store/filesystemStore.js';

const FileExplorer = ({ workspaceId, onFileSelect }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [contextMenu, setContextMenu] = useState(null);
  
  const { 
    fileSystemItems, 
    currentFolder,
    fetchWorkspaceFileSystem, 
    createFileSystemItem,
    deleteFileSystemItem,
    updateFileSystemItem,
    setCurrentFolder,
    isLoading, 
    error,
    clearError 
  } = useFilesystemStore();

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceFileSystem(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceFileSystem]);

  const buildFileTree = (items, parentId = null) => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: item.type === 'folder' ? buildFileTree(items, item._id) : []
      }));
  };

  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return '📁';
    }
    
    const ext = item.metadata?.extension?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return '📄';
      case 'py': return '🐍';
      case 'java': return '☕';
      case 'cpp': case 'c': return '⚙️';
      case 'html': return '🌐';
      case 'css': return '🎨';
      case 'json': return '📋';
      case 'md': return '📝';
      default: return '📄';
    }
  };

  const handleCreateItem = async (name, type, parentId = null) => {
    const itemData = {
      name: name.trim(),
      type,
      parentId,
      workspaceId
    };

    const result = await createFileSystemItem(itemData);
    if (result.success) {
      setShowCreateModal(false);
    }
    return result;
  };

  const handleDeleteItem = async (item) => {
    const confirmMessage = `Are you sure you want to delete "${item.name}"?`;
    if (window.confirm(confirmMessage)) {
      await deleteFileSystemItem(item._id);
    }
  };

  const handleRenameItem = async (item, newName) => {
    if (newName && newName !== item.name) {
      await updateFileSystemItem(item._id, { name: newName.trim() });
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const FileTreeNode = ({ item, level = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(item.name);

    const hasChildren = item.children && item.children.length > 0;
    const paddingLeft = level * 20;

    return (
      <div>
        <div
          className="flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer group"
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              setIsExpanded(!isExpanded);
              setCurrentFolder(item);
            } else {
              onFileSelect?.(item);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          {item.type === 'folder' && (
            <span
              className="mr-1 text-xs text-gray-500"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {hasChildren ? (isExpanded ? '▼' : '▶') : '▷'}
            </span>
          )}
          
          <span className="mr-2">{getFileIcon(item)}</span>
          
          {isRenaming ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                handleRenameItem(item, newName);
                setIsRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameItem(item, newName);
                  setIsRenaming(false);
                } else if (e.key === 'Escape') {
                  setNewName(item.name);
                  setIsRenaming(false);
                }
              }}
              className="flex-1 px-1 py-0 text-sm border border-gray-300 rounded"
              autoFocus
            />
          ) : (
            <span className="flex-1 text-sm truncate">{item.name}</span>
          )}

          <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="text-gray-400 hover:text-gray-600"
              title="Rename"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item);
              }}
              className="text-gray-400 hover:text-red-600"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {item.children.map(child => (
              <FileTreeNode key={child._id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CreateItemModal = () => {
    const [name, setName] = useState('');
    const [selectedType, setSelectedType] = useState(createType);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (name.trim()) {
        await handleCreateItem(name, selectedType, currentFolder?._id);
        setName('');
      }
    };

    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
          <h3 className="text-lg font-semibold mb-4">
            Create New {selectedType === 'file' ? 'File' : 'Folder'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="file"
                    checked={selectedType === 'file'}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="mr-2"
                  />
                  File
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="folder"
                    checked={selectedType === 'folder'}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="mr-2"
                  />
                  Folder
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${selectedType} name`}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ContextMenu = () => {
    if (!contextMenu) return null;

    return (
      <div
        className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onBlur={() => setContextMenu(null)}
      >
        <button
          onClick={() => {
            setIsRenaming(true);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          Rename
        </button>
        <button
          onClick={() => {
            handleDeleteItem(contextMenu.item);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
        >
          Delete
        </button>
      </div>
    );
  };

  const fileTree = buildFileTree(fileSystemItems);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-medium text-gray-900">File Explorer</h3>
        <div className="flex space-x-1">
          <button
            onClick={() => {
              setCreateType('file');
              setShowCreateModal(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="New File"
          >
            📄
          </button>
          <button
            onClick={() => {
              setCreateType('folder');
              setShowCreateModal(true);
            }}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="New Folder"
          >
            📁
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex justify-between items-center">
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No files or folders</p>
            <p className="text-xs">Create your first file or folder</p>
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map(item => (
              <FileTreeNode key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>

      <CreateItemModal />
      <ContextMenu />
      
      {/* Click outside to close context menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default FileExplorer;