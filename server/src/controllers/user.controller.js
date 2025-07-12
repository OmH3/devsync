import { HTTPSTATUS } from "../config/http.config.js";
import { asyncHandler } from "../middleware/async-handler.middleware.js";
import { getCurrentUserService } from "../services/user.service.js";

export const getCurrentUserController = asyncHandler(async(req,res)=>{
    const userId = req.user?._id;
    const {user} = await getCurrentUserService(userId);

    res.status(HTTPSTATUS.OK).json({
        message: "Current user fetched successfully",
        user
    });
});
