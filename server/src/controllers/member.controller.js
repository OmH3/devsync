import z from "zod";
import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { joinWorkspaceByInviteService } from "../services/user.service.js";

export const joinWorkspaceController = asyncHandler(async(req,res)=>{
    const inviteCode = z.string().parse(req.params.inviteCode);
    const userId = req.user?._id;

    const { workspaceId, role } = await joinWorkspaceByInviteService(
      inviteCode,
      userId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Successfully joined the workspace",
      workspaceId,
      role,
    });
})