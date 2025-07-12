import { Roles } from "../enums/role.enum";
import MemberModel from "../models/Member.model";
import RoleModel from "../models/Role-permissions.model";
import UserModel from "../models/User.model";
import WorkspaceModel from "../models/Workspace.model";
import { NotFoundException } from "../utils/app-error";

export const createWorkspaceService = async (userId, body) => {
  const { name, description } = body;
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new NotFoundException("User not found");
  }
  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });

  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();

  user.currentWorkspace = workspace._id;

  await user.save();

  return {
    workspace,
  };
};

export const getAllWorkspacesUserIsMemberService = async (userId) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

  const workspaces = memberships.map((membership) => membership.workspaceId);

  return { workspaces };
};


export const getWorkspaceByIdService = async(workspaceId) => {
    const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  }).populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
}