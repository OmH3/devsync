import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFilesystemStore } from '../store/filesystemStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../hooks/useAuth.js';

const FileExplorer = ({ workspaceId, onFileSelect }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [contextMenu, setContextMenu] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [renamingItem, setRenamingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // ✅ Real-time collaboration states
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [hasJoinedWorkspace, setHasJoinedWorkspace] = useState(false);

  // ✅ Refs for managing state
  const dropZoneRef = useRef(null);
  const isJoiningRef = useRef(false);

  // ✅ Hooks
  const { user } = useAuth();
  const socket = useSocket();
  
  const { 
    fileSystemItems, 
    currentFolder,
    fetchWorkspaceFileSystem, 
    createFileSystemItem,
    deleteFileSystemItem,
    updateFileSystemItem,
    moveFileSystemItem,
    duplicateFileSystemItem,
    bulkDeleteItems,
    setCurrentFolder,
    addItemFromSocket,
    updateItemFromSocket,
    removeItemFromSocket,
    handleUserJoined,
    handleUserLeft,
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    clipboard,
    isLoading, 
    error,
    clearError,
    permissions,
    fetchUserRoleInFileSystem
  } = useFilesystemStore();

  // ✅ Fetch file system on mount
  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceFileSystem(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceFileSystem]);

  // ✅ Socket connection and collaboration setup
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const joinWorkspace = () => {
      if (isJoiningRef.current || hasJoinedWorkspace) return;
      
      console.log('📁 Joining workspace for filesystem:', workspaceId);
      isJoiningRef.current = true;
      socket.emit('join-workspace', workspaceId);
      
      setTimeout(() => {
        isJoiningRef.current = false;
      }, 5000);
    };

    const leaveWorkspace = () => {
      if (!hasJoinedWorkspace) return;
      console.log('🚪 Leaving workspace filesystem:', workspaceId);
      socket.emit('leave-workspace', workspaceId);
      setHasJoinedWorkspace(false);
      setActiveUsers([]);
      setUserCount(1);
    };

    // ✅ Socket event handlers
    const handleWorkspaceJoined = (data) => {
      console.log('✅ Joined workspace for filesystem:', data);
      setHasJoinedWorkspace(true);
      setUserCount(data.userCount || 1);
      isJoiningRef.current = false;
    };

    const handleFileSystemItemCreated = (data) => {
      console.log('📁 File system item created:', data);
      if (data.createdBy.userId !== user._id) {
        addItemFromSocket(data.fileSystemItem);
      }
    };

    const handleFileSystemItemUpdated = (data) => {
      console.log('📝 File system item updated:', data);
      if (data.updatedBy.userId !== user._id) {
        updateItemFromSocket(data.fileSystemId, data.updates);
      }
    };

    const handleFileSystemItemMoved = (data) => {
      console.log('📂 File system item moved:', data);
      if (data.movedBy.userId !== user._id) {
        // Refresh file system to get updated paths
        fetchWorkspaceFileSystem(workspaceId);
      }
    };

    const handleFileSystemItemDeleted = (data) => {
      console.log('🗑️ File system item deleted:', data);
      if (data.deletedBy.userId !== user._id) {
        removeItemFromSocket(data.fileSystemId);
      }
    };

    const handleFileSystemItemDuplicated = (data) => {
      console.log('📋 File system item duplicated:', data);
      if (data.duplicatedBy.userId !== user._id) {
        addItemFromSocket(data.duplicatedItem);
      }
    };

    const handleUserJoinedWorkspace = (userData) => {
      console.log('👤 User joined workspace filesystem:', userData);
      setActiveUsers(prev => [...prev.filter(u => u.userId !== userData.userId), userData]);
      handleUserJoined(userData);
    };

    const handleUserLeftWorkspace = (userData) => {
      console.log('👋 User left workspace filesystem:', userData);
      setActiveUsers(prev => prev.filter(u => u.userId !== userData.userId));
      handleUserLeft(userData);
    };

    const handleUserCountUpdate = (count) => {
      console.log('👥 Workspace user count:', count);
      setUserCount(count);
    };

    const handleConnect = () => {
      console.log('✅ Socket connected for filesystem');
      setIsConnected(true);
      joinWorkspace();
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected from filesystem');
      setIsConnected(false);
      setHasJoinedWorkspace(false);
      setActiveUsers([]);
      setUserCount(1);
      isJoiningRef.current = false;
    };

    // ✅ Check initial connection and attach listeners
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('workspace-joined', handleWorkspaceJoined);
    socket.on('filesystem-item-created', handleFileSystemItemCreated);
    socket.on('filesystem-item-updated', handleFileSystemItemUpdated);
    socket.on('filesystem-item-moved', handleFileSystemItemMoved);
    socket.on('filesystem-item-deleted', handleFileSystemItemDeleted);
    socket.on('filesystem-item-duplicated', handleFileSystemItemDuplicated);
    socket.on('user-joined-workspace', handleUserJoinedWorkspace);
    socket.on('user-left-workspace', handleUserLeftWorkspace);
    socket.on('user-count', handleUserCountUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('workspace-joined', handleWorkspaceJoined);
      socket.off('filesystem-item-created', handleFileSystemItemCreated);
      socket.off('filesystem-item-updated', handleFileSystemItemUpdated);
      socket.off('filesystem-item-moved', handleFileSystemItemMoved);
      socket.off('filesystem-item-deleted', handleFileSystemItemDeleted);
      socket.off('filesystem-item-duplicated', handleFileSystemItemDuplicated);
      socket.off('user-joined-workspace', handleUserJoinedWorkspace);
      socket.off('user-left-workspace', handleUserLeftWorkspace);
      socket.off('user-count', handleUserCountUpdate);
      leaveWorkspace();
    };
  }, [socket, workspaceId, hasJoinedWorkspace, user._id, addItemFromSocket, updateItemFromSocket, removeItemFromSocket, handleUserJoined, handleUserLeft, fetchWorkspaceFileSystem]);

  // ✅ Build hierarchical file tree
  const buildFileTree = useCallback((items, parentId = null) => {
    return items
      .filter(item => item.parentId === parentId)
      .sort((a, b) => {
        // Folders first, then files, alphabetically
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      })
      .map(item => ({
        ...item,
        children: item.type === 'folder' ? buildFileTree(items, item._id) : []
      }));
  }, []);

  // ✅ Get file icon with better visual indicators
  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return expandedFolders.has(item._id) ? '📂' : '📁';
    }
    
    const ext = item.metadata?.extension?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return '🟨';
      case 'ts': case 'tsx': return '🔷';
      case 'py': return '🐍';
      case 'java': return '☕';
      case 'cpp': case 'c': return '⚙️';
      case 'html': return '🌐';
      case 'css': case 'scss': case 'sass': return '🎨';
      case 'json': return '📋';
      case 'md': case 'markdown': return '📝';
      case 'txt': return '📄';
      case 'png': case 'jpg': case 'jpeg': case 'gif': case 'svg': return '🖼️';
      case 'pdf': return '📕';
      case 'zip': case 'rar': case '7z': return '📦';
      default: return '📄';
    }
  };

  // ✅ Handle drag and drop operations
  const handleDragStart = (e, item) => {
    if (!permissions?.canMove && item.creatorId !== user._id) {
      e.preventDefault();
      return;
    }
    
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item._id);
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOver = (e, targetItem) => {
    if (!draggedItem || draggedItem._id === targetItem._id) return;
    if (targetItem.type !== 'folder' && !targetItem.isRoot) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(targetItem);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e, targetItem) => {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedItem) return;
    
    const targetParentId = targetItem.isRoot ? null : targetItem._id;
    
    // Prevent dropping item into itself or its children
    if (draggedItem._id === targetParentId) return;
    
    try {
      await moveFileSystemItem(draggedItem._id, targetParentId);
    } catch (error) {
      console.error('Move failed:', error);
    }
    
    setDraggedItem(null);
  };

  // ✅ Handle item operations
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
      // Auto-expand parent folder if creating inside one
      if (parentId) {
        setExpandedFolders(prev => new Set([...prev, parentId]));
      }
    }
    return result;
  };

  const handleDeleteItem = async (item) => {
    const confirmMessage = `Are you sure you want to delete "${item.name}"?${
      item.type === 'folder' ? ' This will delete all contents.' : ''
    }`;
    
    if (window.confirm(confirmMessage)) {
      await deleteFileSystemItem(item._id);
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item._id);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async () => {
    const itemIds = Array.from(selectedItems);
    const confirmMessage = `Are you sure you want to delete ${itemIds.length} selected items?`;
    
    if (window.confirm(confirmMessage)) {
      await bulkDeleteItems(itemIds);
      setSelectedItems(new Set());
      setShowBulkActions(false);
    }
  };

  const handleRenameItem = async (item, newName) => {
    if (newName && newName !== item.name) {
      await updateFileSystemItem(item._id, { name: newName.trim() });
    }
    setRenamingItem(null);
  };

  const handleDuplicateItem = async (item) => {
    const newName = `${item.name} (copy)`;
    await duplicateFileSystemItem(item._id, newName, item.parentId);
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // ✅ Enhanced File Tree Node Component
  const FileTreeNode = ({ item, level = 0 }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(item.name);
    const inputRef = useRef(null);

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedFolders.has(item._id);
    const isSelected = selectedItems.has(item._id);
    const paddingLeft = level * 20;
    const isDroppable = item.type === 'folder' && draggedItem && draggedItem._id !== item._id;
    const isBeingDraggedOver = dropTarget && dropTarget._id === item._id;

    useEffect(() => {
      if (isRenaming && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isRenaming]);

    return (
      <div>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer group relative ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : 'hover:bg-gray-100'
          } ${isBeingDraggedOver ? 'bg-green-100 border-green-500' : ''}`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragOver={isDroppable ? (e) => handleDragOver(e, item) : undefined}
          onDragLeave={isDroppable ? handleDragLeave : undefined}
          onDrop={isDroppable ? (e) => handleDrop(e, item) : undefined}
          onClick={(e) => {
            if (isRenaming) return;
            
            if (e.ctrlKey || e.metaKey) {
              // Multi-select
              toggleItemSelection(item._id);
            } else if (e.shiftKey && selectedItems.size > 0) {
              // Range select (simplified)
              toggleItemSelection(item._id);
            } else {
              // Single select
              if (item.type === 'folder') {
                toggleFolder(item._id);
                setCurrentFolder(item);
              } else {
                onFileSelect?.(item);
              }
              setSelectedItems(new Set([item._id]));
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, item)}
          onDoubleClick={() => {
            if (item.type === 'file') {
              onFileSelect?.(item);
            }
          }}
        >
          {/* Selection checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleItemSelection(item._id)}
            onClick={(e) => e.stopPropagation()}
            className="mr-2 rounded"
          />

          {/* Folder expand/collapse indicator */}
          {item.type === 'folder' && (
            <span
              className="mr-1 text-xs text-gray-500 cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(item._id);
              }}
            >
              {hasChildren ? (isExpanded ? '▼' : '▶') : '▷'}
            </span>
          )}
          
          {/* File/folder icon */}
          <span className="mr-2 text-sm">{getFileIcon(item)}</span>
          
          {/* Name input/display */}
          {isRenaming ? (
            <input
              ref={inputRef}
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
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-1 py-0 text-sm border border-gray-300 rounded bg-white"
            />
          ) : (
            <span className="flex-1 text-sm truncate">{item.name}</span>
          )}

          {/* Action buttons */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 ml-2">
            {item.type === 'folder' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFolder(item);
                  setCreateType('file');
                  setShowCreateModal(true);
                }}
                className="text-gray-400 hover:text-blue-600 text-xs"
                title="New file in folder"
              >
                📄
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="text-gray-400 hover:text-yellow-600 text-xs"
              title="Rename"
            >
              ✏️
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(item);
              }}
              className="text-gray-400 hover:text-green-600 text-xs"
              title="Copy"
            >
              📋
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                cutToClipboard(item);
              }}
              className="text-gray-400 hover:text-orange-600 text-xs"
              title="Cut"
            >
              ✂️
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateItem(item);
              }}
              className="text-gray-400 hover:text-purple-600 text-xs"
              title="Duplicate"
            >
              📑
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item);
              }}
              className="text-gray-400 hover:text-red-600 text-xs"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Children */}
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

  // ✅ Create Item Modal Component
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
            {currentFolder && (
              <span className="text-sm text-gray-600 block">
                in "{currentFolder.name}"
              </span>
            )}
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
                  📄 File
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="folder"
                    checked={selectedType === 'folder'}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="mr-2"
                  />
                  📁 Folder
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
                placeholder={`Enter ${selectedType} name${selectedType === 'file' ? ' (with extension)' : ''}`}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoFocus
              />
              {selectedType === 'file' && (
                <p className="mt-1 text-xs text-gray-500">
                  Include file extension (e.g., script.js, document.txt)
                </p>
              )}
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium"
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

  // ✅ Context Menu Component
  const ContextMenu = () => {
    if (!contextMenu) return null;

    const canEdit = permissions?.canEdit || contextMenu.item.creatorId === user._id;
    const canDelete = permissions?.canDelete || contextMenu.item.creatorId === user._id;

    return (
      <div
        className="fixed bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50 min-w-[150px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          onClick={() => {
            onFileSelect?.(contextMenu.item);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          📂 Open
        </button>
        
        <hr className="my-1" />
        
        {canEdit && (
          <>
            <button
              onClick={() => {
                setRenamingItem(contextMenu.item);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              ✏️ Rename
            </button>
            
            <button
              onClick={() => {
                handleDuplicateItem(contextMenu.item);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              📑 Duplicate
            </button>
          </>
        )}
        
        <button
          onClick={() => {
            copyToClipboard(contextMenu.item);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          📋 Copy
        </button>
        
        <button
          onClick={() => {
            cutToClipboard(contextMenu.item);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          ✂️ Cut
        </button>
        
        {clipboard && (
          <button
            onClick={async () => {
              await pasteFromClipboard(contextMenu.item.type === 'folder' ? contextMenu.item._id : contextMenu.item.parentId);
              setContextMenu(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            📄 Paste
          </button>
        )}
        
        <hr className="my-1" />
        
        {canDelete && (
          <button
            onClick={() => {
              handleDeleteItem(contextMenu.item);
              setContextMenu(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
          >
            🗑️ Delete
          </button>
        )}
      </div>
    );
  };

  const fileTree = buildFileTree(fileSystemItems);
  const rootItem = { _id: null, isRoot: true, type: 'folder' };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium text-gray-900">File Explorer</h3>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{userCount} online</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {selectedItems.size > 0 && (
            <>
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="p-1 text-blue-600 hover:text-blue-800 text-xs"
                title={`Actions for ${selectedItems.size} items`}
              >
                ⚙️ {selectedItems.size}
              </button>
              <div className="w-px h-4 bg-gray-300"></div>
            </>
          )}
          
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
          
          {clipboard && (
            <button
              onClick={() => pasteFromClipboard(currentFolder?._id || null)}
              className="p-1 text-green-600 hover:text-green-800"
              title="Paste"
            >
              📄
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && selectedItems.size > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedItems.size} items selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Delete All
              </button>
              <button
                onClick={() => {
                  setSelectedItems(new Set());
                  setShowBulkActions(false);
                }}
                className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
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

      {/* Active Users Display */}
      {activeUsers.length > 0 && (
        <div className="p-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-blue-700 font-medium">Active:</span>
            {activeUsers.slice(0, 3).map((activeUser, index) => (
              <span key={activeUser.userId} className="text-blue-600">
                {activeUser.userName}
                {index < Math.min(activeUsers.length, 3) - 1 && ', '}
              </span>
            ))}
            {activeUsers.length > 3 && (
              <span className="text-blue-600">+{activeUsers.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      {/* File Tree */}
      <div 
        ref={dropZoneRef}
        className="flex-1 overflow-y-auto"
        onDragOver={(e) => {
          if (draggedItem) {
            e.preventDefault();
            setDropTarget(rootItem);
          }
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(e) => handleDrop(e, rootItem)}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : fileTree.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p>No files or folders</p>
            <p className="text-xs mt-1">Create your first file or folder</p>
          </div>
        ) : (
          <div className="py-2">
            {fileTree.map(item => (
              <FileTreeNode key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with connection status */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>{fileSystemItems.length} items</span>
            {selectedItems.size > 0 && (
              <span>• {selectedItems.size} selected</span>
            )}
            {clipboard && (
              <span className="text-green-600">• Clipboard: {clipboard.item.name}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected && hasJoinedWorkspace ? 'bg-green-500' : 
              isConnected ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span>{
              isConnected && hasJoinedWorkspace ? 'Connected' :
              isConnected ? 'Connecting...' : 'Disconnected'
            }</span>
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
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