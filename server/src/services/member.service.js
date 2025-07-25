import { ErrorCodeEnum } from "../enums/error-code.enum.js";
import MemberModel from "../models/Member.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { NotFoundException, UnauthorizedException } from "../utils/app-error.js";

export const getMemberRoleInWorkspace = async (userId, workspaceId) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const member = await MemberModel.findOne({
    userId,
    workspaceId,
  }).populate("role");

  if (!member) {
    throw new UnauthorizedException(
      "You are not a member of this workspace",
      ErrorCodeEnum.ACCESS_UNAUTHORIZED
    );
  }
  const roleName = member.role?.name;
  return { role: roleName };
};
