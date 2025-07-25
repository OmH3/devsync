import { Roles } from "../enums/role.enum.js";
import MemberModel from "../models/Member.model.js";
import RoleModel from "../models/Role-permissions.model.js";
import UserModel from "../models/User.model.js";
import WorkspaceModel from "../models/Workspace.model.js";
import { BadRequestException, NotFoundException } from "../utils/app-error.js";

export const getCurrentUserService = async (userid) => {
  const user = await UserModel.findById(userid)
    .populate("currentWorkspace")
    .select("-password");

  if (!user) {
    throw new BadRequestException("User not found");
  }
  return {
    user,
  };
};

export const joinWorkspaceByInviteService = async(inviteCode, userId)=>{
  const workspace = await WorkspaceModel.findOne({ inviteCode }).exec();
  if (!workspace) {
    throw new NotFoundException("Invalid invite code or workspace not found");
  }

   // Check if user is already a member
  const existingMember = await MemberModel.findOne({
    userId,
    workspaceId: workspace._id,
  }).exec();

  if (existingMember) {
    throw new BadRequestException("You are already a member of this workspace");
  }

  const role = await RoleModel.findOne({ name: Roles.MEMBER });

  if (!role) {
    throw new NotFoundException("Role not found");
  }

  // Add user to workspace as a member
  const newMember = new MemberModel({
    userId,
    workspaceId: workspace._id,
    role: role._id,
  });
  await newMember.save();

  return { workspaceId: workspace._id, role: role.name };
}
