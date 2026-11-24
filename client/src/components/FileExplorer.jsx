import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFilesystemStore } from '../store/filesystemStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { useAuth } from '../hooks/useAuth.js';

const FileExplorer = ({ workspaceId, onFileSelect }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('file');
  const [contextMenu, setContextMenu] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [, setRenamingItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  //Real-time collaboration states
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const [hasJoinedWorkspace, setHasJoinedWorkspace] = useState(false);

  //Refs for managing state
  const isJoiningRef = useRef(false);

  //Hooks
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
    permissions
  } = useFilesystemStore();

  //Fetch file system on mount
  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceFileSystem(workspaceId);
    }
  }, [workspaceId, fetchWorkspaceFileSystem]);

  //Socket connection and collaboration setup
  useEffect(() => {
    if (!socket || !workspaceId) return;

    const joinWorkspace = () => {
      if (isJoiningRef.current || hasJoinedWorkspace) return;
      
      console.log(' Joining workspace for filesystem:', workspaceId);
      isJoiningRef.current = true;
      socket.emit('join-workspace', workspaceId);
      
      setTimeout(() => {
        isJoiningRef.current = false;
      }, 5000);
    };

    const leaveWorkspace = () => {
      if (!hasJoinedWorkspace) return;
      console.log(' Leaving workspace filesystem:', workspaceId);
      socket.emit('leave-workspace', workspaceId);
      setHasJoinedWorkspace(false);
      setActiveUsers([]);
      setUserCount(1);
    };

    //Socket event handlers
    const handleWorkspaceJoined = (data) => {
      console.log(' Joined workspace for filesystem:', data);
      setHasJoinedWorkspace(true);
      setUserCount(data.userCount || 1);
      isJoiningRef.current = false;
    };

    const handleWorkspaceUserCount = (payload) => {
      if (payload?.workspaceId && payload.workspaceId !== workspaceId) return;
      if (typeof payload?.userCount === 'number') setUserCount(payload.userCount);
    };

    const handleFileSystemItemCreated = (data) => {
      console.log(' File system item created:', data);
      if (data.createdBy.userId !== user._id) {
        addItemFromSocket(data.fileSystemItem);
      }
    };

    const handleFileSystemItemUpdated = (data) => {
      console.log(' File system item updated:', data);
      if (data.updatedBy.userId !== user._id) {
        updateItemFromSocket(data.fileSystemId, data.updates);
      }
    };

    const handleFileSystemItemMoved = (data) => {
      console.log(' File system item moved:', data);
      if (data.movedBy.userId !== user._id) {
        // Refresh file system to get updated paths
        fetchWorkspaceFileSystem(workspaceId);
      }
    };

    const handleFileSystemItemDeleted = (data) => {
      console.log(' File system item deleted:', data);
      if (data.deletedBy.userId !== user._id) {
        removeItemFromSocket(data.fileSystemId);
      }
    };

    const handleFileSystemItemDuplicated = (data) => {
      console.log(' File system item duplicated:', data);
      if (data.duplicatedBy.userId !== user._id) {
        addItemFromSocket(data.duplicatedItem);
      }
    };

    const handleUserJoinedWorkspace = (userData) => {
      console.log(' User joined workspace filesystem:', userData);
      setActiveUsers(prev => [...prev.filter(u => u.userId !== userData.userId), userData]);
      handleUserJoined(userData);
    };

    const handleUserLeftWorkspace = (userData) => {
      console.log(' User left workspace filesystem:', userData);
      setActiveUsers(prev => prev.filter(u => u.userId !== userData.userId));
      handleUserLeft(userData);
    };

    const handleUserCountUpdate = (payload) => {
      const count = typeof payload === 'object' && payload !== null ? payload.userCount : payload;
      if (typeof count === 'number') setUserCount(count);
    };

    const handleConnect = () => {
      console.log(' Socket connected for filesystem');
      setIsConnected(true);
      joinWorkspace();
    };

    const handleDisconnect = () => {
      console.log(' Socket disconnected from filesystem');
      setIsConnected(false);
      setHasJoinedWorkspace(false);
      setActiveUsers([]);
      setUserCount(1);
      isJoiningRef.current = false;
    };

    //Check initial connection and attach listeners
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('workspace-joined', handleWorkspaceJoined);
    socket.on('workspace-user-count', handleWorkspaceUserCount);
    socket.on('filesystem-item-created', handleFileSystemItemCreated);
    socket.on('filesystem-item-updated', handleFileSystemItemUpdated);
    socket.on('filesystem-item-moved', handleFileSystemItemMoved);
    socket.on('filesystem-item-deleted', handleFileSystemItemDeleted);
    socket.on('filesystem-item-duplicated', handleFileSystemItemDuplicated);
    socket.on('user-joined-workspace', handleUserJoinedWorkspace);
    socket.on('user-left-workspace', handleUserLeftWorkspace);
    socket.on('workspace-user-count', handleUserCountUpdate);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('workspace-joined', handleWorkspaceJoined);
      socket.off('workspace-user-count', handleWorkspaceUserCount);
      socket.off('filesystem-item-created', handleFileSystemItemCreated);
      socket.off('filesystem-item-updated', handleFileSystemItemUpdated);
      socket.off('filesystem-item-moved', handleFileSystemItemMoved);
      socket.off('filesystem-item-deleted', handleFileSystemItemDeleted);
      socket.off('filesystem-item-duplicated', handleFileSystemItemDuplicated);
      socket.off('user-joined-workspace', handleUserJoinedWorkspace);
      socket.off('user-left-workspace', handleUserLeftWorkspace);
      socket.off('workspace-user-count', handleUserCountUpdate);
      leaveWorkspace();
    };
  }, [socket, workspaceId, hasJoinedWorkspace, user._id, addItemFromSocket, updateItemFromSocket, removeItemFromSocket, handleUserJoined, handleUserLeft, fetchWorkspaceFileSystem]);

  //Build hierarchical file tree
  const buildFileTree = useCallback((items, parentId = null) => {
    return items
      .filter(item => {
        const itemParentId = item.parentId ? String(item.parentId) : null;
        const targetParentId = parentId ? String(parentId) : null;
        return itemParentId === targetParentId;
      })
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

  // Check if targetFolderId is a descendant of sourceFolderId (prevent circular moves)
  const isDescendantFolder = useCallback((sourceFolderId, targetFolderId) => {
    if (!sourceFolderId || !targetFolderId) return false;
    let current = fileSystemItems.find(i => String(i._id) === String(targetFolderId));
    while (current && current.parentId) {
      if (String(current.parentId) === String(sourceFolderId)) return true;
      current = fileSystemItems.find(i => String(i._id) === String(current.parentId));
    }
    return false;
  }, [fileSystemItems]);

  // Drag and drop handlers (VS Code style: drag file/folder into folder or root)
  const handleDragStart = (e, item) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item._id);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragOverFolder = (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    const targetId = targetFolder ? targetFolder._id : 'root';
    if (targetFolder) {
      if (targetFolder.type !== 'folder') return;
      if (String(draggedItem._id) === String(targetFolder._id)) return;
      if (String(draggedItem.parentId || '') === String(targetFolder._id)) return;
      if (draggedItem.type === 'folder' && isDescendantFolder(draggedItem._id, targetFolder._id)) return;
    } else {
      // Root drop check: only highlight if item is currently inside a folder
      if (!draggedItem.parentId) return;
    }

    e.dataTransfer.dropEffect = 'move';
    if (dropTarget !== targetId) {
      setDropTarget(targetId);
    }
  };

  const handleDragLeaveFolder = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropTarget === targetId) {
      setDropTarget(null);
    }
  };

  const handleDropOnFolder = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDropTarget(null);

    const itemToMove = draggedItem;
    setDraggedItem(null);
    if (!itemToMove) return;

    const newParentId = targetFolder ? targetFolder._id : null;
    const currentParentId = itemToMove.parentId || null;

    if (String(currentParentId || '') === String(newParentId || '')) return;
    if (targetFolder && String(itemToMove._id) === String(targetFolder._id)) return;
    if (targetFolder && itemToMove.type === 'folder' && isDescendantFolder(itemToMove._id, targetFolder._id)) return;

    const result = await moveFileSystemItem(itemToMove._id, newParentId);
    if (result.success) {
      if (newParentId) {
        setExpandedFolders(prev => new Set([...prev, newParentId]));
      }
      await fetchWorkspaceFileSystem(workspaceId);
    }
  };

  //Get file icon with better visual indicators
  const getFileIcon = (item) => {
    if (item.type === 'folder') {
      return expandedFolders.has(item._id) ? '📂' : '📁';
    }
    
    const ext = item.metadata?.extension?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return 'JS';
      case 'py': return 'PY';
      case 'cpp': case 'cc': case 'cxx': case 'hpp': return 'C+';
      default: return '📄';
    }
  };

  //Handle item operations
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

  //Enhanced File Tree Node Component
  const FileTreeNode = ({ item, level = 0 }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(item.name);
    const inputRef = useRef(null);

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedFolders.has(item._id);
    const isSelected = selectedItems.has(item._id);
    const isDragging = draggedItem?._id === item._id;
    const isDropTarget = item.type === 'folder' && dropTarget === item._id;
    const paddingLeft = level * 20;

    useEffect(() => {
      if (isRenaming && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isRenaming]);

    return (
      <div>
        <div
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(e, item)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            if (item.type === 'folder') {
              handleDragOverFolder(e, item);
            }
          }}
          onDragLeave={(e) => {
            if (item.type === 'folder') {
              handleDragLeaveFolder(e, item._id);
            }
          }}
          onDrop={(e) => {
            if (item.type === 'folder') {
              handleDropOnFolder(e, item);
            }
          }}
          className={`flex items-center py-1 px-2 cursor-pointer group relative transition-colors ${
            isSelected ? 'bg-blue-100 border-l-2 border-blue-500' : 'hover:bg-gray-100'
          } ${isDragging ? 'opacity-50' : ''} ${
            isDropTarget ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-inset rounded' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft + 8}px` }}
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
              className="mr-1 text-xs text-gray-500 cursor-pointer select-none w-3 inline-block"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(item._id);
              }}
            >
              {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
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
                className="px-1 text-gray-500 hover:text-blue-600 text-xs"
                title="New file in folder"
              >
                +
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              className="px-1 text-gray-500 hover:text-yellow-600 text-xs"
              title="Rename"
            >
              ✎
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateItem(item);
              }}
              className="px-1 text-gray-500 hover:text-purple-600 text-xs"
              title="Duplicate"
            >
              ⧉
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteItem(item);
              }}
              className="px-1 text-gray-500 hover:text-red-600 text-xs"
              title="Delete"
            >
              ×
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

  //Create Item Modal Component
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
                placeholder={`Enter ${selectedType} name${selectedType === 'file' ? ' (with extension)' : ''}`}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                autoFocus
              />
              {selectedType === 'file' && (
                <p className="mt-1 text-xs text-gray-500">
                  Include file extension (e.g., script.js, main.py, app.cpp)
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

  //Context Menu Component
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
           Open
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
               Rename
            </button>
            
            <button
              onClick={() => {
                handleDuplicateItem(contextMenu.item);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
               Duplicate
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
           Copy
        </button>
        
        <button
          onClick={() => {
            cutToClipboard(contextMenu.item);
            setContextMenu(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
           Cut
        </button>
        
        {clipboard && (
          <button
            onClick={async () => {
              await pasteFromClipboard(contextMenu.item.type === 'folder' ? contextMenu.item._id : contextMenu.item.parentId);
              setContextMenu(null);
            }}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
             Paste
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
             Delete
          </button>
        )}
      </div>
    );
  };

  const fileTree = buildFileTree(fileSystemItems);

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
                 {selectedItems.size}
              </button>
              <div className="w-px h-4 bg-gray-300"></div>
            </>
          )}
          
          <button
            onClick={() => {
              setCreateType('file');
              setShowCreateModal(true);
            }}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            title="New File"
          >
            + File
          </button>
          <button
            onClick={() => {
              setCreateType('folder');
              setShowCreateModal(true);
            }}
            className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
            title="New Folder"
          >
            + Folder
          </button>
          
          {clipboard && (
            <button
              onClick={() => pasteFromClipboard(currentFolder?._id || null)}
              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
              title="Paste"
            >
              Paste
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
            <button onClick={clearError} aria-label="Dismiss error" className="text-red-400 hover:text-red-600">
              ×
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
        className={`flex-1 overflow-y-auto ${
          dropTarget === 'root' ? 'bg-indigo-50/60 ring-2 ring-indigo-400 ring-inset' : ''
        }`}
        onDragOver={(e) => handleDragOverFolder(e, null)}
        onDragLeave={(e) => handleDragLeaveFolder(e, 'root')}
        onDrop={(e) => handleDropOnFolder(e, null)}
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