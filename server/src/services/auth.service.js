import mongoose from "mongoose";
import UserModel from "../models/User.model.js";
import accountModel from "../models/Account.model.js";
import RoleModel from "../models/Role-permissions.model.js";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/app-error.js";
import { ProviderEnum } from "../enums/account-provider.enum.js";
import WorkspaceModel from "../models/Workspace.model.js";
import MemberModel from "../models/Member.model.js";
import { Roles } from "../enums/role.enum.js";

export const loginOrCreateAccountService = async (data) => {
  const { providerId, provider, displayName, email, picture } = data;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    console.log("Started Session...");

    let user = await UserModel.findOne({ email }).session(session);
    if (!user) {
      user = new UserModel({
        email,
        name: displayName,
        profilePicture: picture || null,
      });
      await user.save({ session });

      const account = new accountModel({
        userId: user._id,
        provider: provider,
        providerId: providerId,
      });
      await account.save({ session });

      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });
      await workspace.save({ session });

      const ownerRole = await RoleModel.findOne({
        name: Roles.OWNER,
      }).session(session);

      if (!ownerRole) {
        throw new NotFoundException("Owner role not found");
      }

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });
      await member.save({ session });

      user.currentWorkspace = workspace._id;
      await user.save({ session });
    }

    await session.commitTransaction();
    console.log("Transaction committed successfully");

    return { user };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
    console.log("Session ended");
  }
};

export const registerUserService = async (body) => {
  const { email, name, password } = body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingUser = await UserModel.findOne({ email }).session(session);
    if (existingUser) {
      throw new BadRequestException("Email already exists");
    }

    const user = new UserModel({
      email,
      name,
      password,
    });
    await user.save({ session });

    const account = new accountModel({
      userId: user._id,
      provider: ProviderEnum.EMAIL,
      providerId: email,
    });
    await account.save({ session });

    // 3. Create a new workspace for the new user
    const workspace = new WorkspaceModel({
      name: `My Workspace`,
      description: `Workspace created for ${user.name}`,
      owner: user._id,
    });
    await workspace.save({ session });

    const ownerRole = await RoleModel.findOne({
      name: Roles.OWNER,
    }).session(session);

    if (!ownerRole) {
      throw new NotFoundException("Owner role not found");
    }

    const member = new MemberModel({
      userId: user._id,
      workspaceId: workspace._id,
      role: ownerRole._id,
      joinedAt: new Date(),
    });
    await member.save({ session });

    user.currentWorkspace = workspace._id;
    await user.save({ session });

    await session.commitTransaction();
    console.log("Transaction committed successfully");

    return {
      userId: user._id,
      workspaceId: workspace._id,
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
      console.log("Transaction aborted due to error");
    }
    throw error;
  } finally {
    session.endSession();
    console.log("Session ended");
  }
};

export const verifyUserService = async ({
  email,
  password,
  provider = ProviderEnum.EMAIL,
}) => {
  const account = await accountModel.findOne({ provider, providerId: email });
  if (!account) {
    throw new NotFoundException("Invalid email or password");
  }

  const user = await UserModel.findById(account.userId).select('+password');
  if (!user) {
    throw new NotFoundException("User not found for the given account");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedException("Invalid email or password");
  }

  return user.omitPassword();
};
