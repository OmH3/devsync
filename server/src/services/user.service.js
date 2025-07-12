import UserModel from "../models/User.model.js";
import { BadRequestException } from "../utils/app-error.js";

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
