import { Permissions } from "../enums/role.enum.js";

export const RolePermissions = {
  OWNER: [
    Permissions.CREATE_WORKSPACE,
    Permissions.MANAGE_WORKSPACE_SETTINGS,
    Permissions.DELETE_WORKSPACE,
    Permissions.EDIT_WORKSPACE,

    Permissions.ADD_MEMBER,
    Permissions.CHANGE_MEMBER_ROLE,
    Permissions.REMOVE_MEMBER,

    Permissions.USE_DOCS,
    Permissions.EDIT_DOCS,
    Permissions.USE_WHITEBOARD,
    Permissions.EDIT_WHITEBOARD,
    Permissions.USE_CODE_EDITOR,
    Permissions.EDIT_CODE_EDITOR,
    Permissions.START_VIDEO_CALL,
    Permissions.JOIN_VIDEO_CALL,
    Permissions.END_VIDEO_CALL, // ✅ Only owners can end calls

    Permissions.VIEW_ONLY,
  ],
  ADMIN:[
        Permissions.MANAGE_WORKSPACE_SETTINGS,
    Permissions.ADD_MEMBER,
    Permissions.REMOVE_MEMBER,

    Permissions.USE_DOCS,
    Permissions.EDIT_DOCS,
    Permissions.USE_WHITEBOARD,
    Permissions.EDIT_WHITEBOARD,
    Permissions.USE_CODE_EDITOR,
    Permissions.EDIT_CODE_EDITOR,
    Permissions.START_VIDEO_CALL,
    Permissions.JOIN_VIDEO_CALL,
    Permissions.END_VIDEO_CALL, // ✅ Admins can end calls too
    Permissions.VIEW_ONLY,
  ],
  MEMBER: [
    Permissions.VIEW_ONLY,
    Permissions.USE_DOCS,
    Permissions.USE_WHITEBOARD,
    Permissions.USE_CODE_EDITOR,
    Permissions.JOIN_VIDEO_CALL,
  ],
};
