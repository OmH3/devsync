# V1 Inventory: server/src/services

This document lists all exported functions in the `server/src/services` directory to serve as a checklist during the V2 migration.

## 📄 `auth.service.js`
- `loginOrCreateAccountService(data)`
- `registerUserService(body)`
- `verifyUserService({
  email,
  password,
  provider = ProviderEnum.EMAIL,
})`

## 📄 `workspace.service.js`
- `createWorkspaceService(userId, body)`
- `getAllWorkspacesUserIsMemberService(userId)`
- `getWorkspaceByIdService(workspaceId)`
- `getWorkspaceMembersService(workspaceId)`
- `changeMemberRoleService(
  workspaceId,
  memberId,
  roleId
)`
- `updateWorkspaceByIdService(
  workspaceId,
  name,
  description,
)`
- `deleteWorkspaceByIdService(workspaceId, userId)`

## 📄 `docs.service.js`
- `createDocService(
  userId,
  { title, content, workspaceId }
)`
- `getWorkspaceDocsService(workspaceId)`
- `getDocByIdService(docId)`
- `updateDocService(docId, userId, { title, content })`
- `deleteDocService(docId, userId)`

## 📄 `whiteboard.service.js`
- `createWhiteboardService(userId, body)`
- `getWorkspaceWhiteboardsService(workspaceId, userId)`
- `getWhiteboardByIdService(whiteboardId, userId)`
- `updateWhiteboardService(whiteboardId, userId, body)`
- `deleteWhiteboardService(whiteboardId, userId)`

## 📄 `user.service.js`
- `getCurrentUserService(userid)`

## 📄 `member.service.js`
- `getMemberRoleInWorkspace(userId, workspaceId)`

## 📄 `audioroom.service.js`
- `generateStreamToken(userId, userInfo)`

## 📄 `codeExecutor.service.js`
- `executeCodeService(codeEditorId, userId, body)`
- `getExecutionHistoryService(codeEditorId, userId)`

## 📄 `codeeditor.service.js`
- `createCodeEditorService(userId, { title, content = "", language = "javascript", workspaceId, fileSystemId })`
- `saveCodeEditorContentService(codeEditorId, userId, { title, content, language })`
- `deleteCodeEditorService(codeEditorId, userId)`
- `getWorkspaceCodeEditorsService(workspaceId)`
- `getCodeEditorByIdService(codeEditorId)`
- `getCodeEditorByFileSystemIdService(fileSystemId)`
- `updateCodeEditorService(codeEditorId, userId, body)`

## 📄 `filesystem.service.js`
- `getFileSystemItemContentService(fileSystemId)`
- `updateFileSystemItemContentService(fileSystemId, userId, { content, language })`
- `getFileSystemTreeService(workspaceId)`
- `duplicateFileSystemItemService(fileSystemId, userId, { name, parentId })`
- `bulkDeleteFileSystemItemsService(itemIds, userId)`
- `getFileSystemItemHistoryService(fileSystemId)`
- `createFileSystemItemService(userId, body)`
- `getWorkspaceFileSystemService(workspaceId)`
- `getFileSystemItemByIdService(fileSystemId)`
- `updateFileSystemItemService(
  fileSystemId,
  userId,
  body
)`
- `moveFileSystemItemService(fileSystemId, userId, body)`
- `deleteFileSystemItemService(fileSystemId, userId)`

