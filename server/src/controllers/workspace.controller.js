import { HTTPSTATUS } from "../config/http.config";
import { asyncHandler } from "../middleware/async-handler.middleware";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { createWorkspaceService, getAllWorkspacesUserIsMemberService, getWorkspaceByIdService } from "../services/workspace.service";
import { createWorkspaceSchema, workspaceIdSchema } from "../validation/workspace.validation";

export const createWorskpaceController = asyncHandler(async (req, res) => {
  const body = createWorkspaceSchema.parse(req.body);

  const userId = req.user?._id;

  const { workspace } = await createWorkspaceService(userId, body);

  return res.status(HTTPSTATUS.CREATED).json({
    message: "Workspace created successfully",
    workspace,
  });
});


export const getAllWorkspacesUserIsMemberController = asyncHandler(async(req,res)=>{
    const userId = req.user?._id;

    const { workspaces } = await getAllWorkspacesUserIsMemberService(userId);

    return res.status(HTTPSTATUS.OK).json({
      message: "User workspaces fetched successfully",
      workspaces,
    });
});

export const getWorkspaceByIdController = asyncHandler(async (req, res) => {
    const workspaceId = workspaceIdSchema.parse(req.params.id);
    const userId = req.user?._id;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { workspace } = await getWorkspaceByIdService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace fetched successfully",
      workspace,
    });
})