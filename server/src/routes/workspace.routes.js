import { Router } from "express";
import {
    changeWorkspaceMemberRoleController,
  createWorskpaceController,
  deleteWorkspaceByIdController,
  getAllWorkspacesUserIsMemberController,
  getWorkspaceByIdController,
  getWorkspaceMembersController,
  updateWorkspaceByIdController,
} from "../controllers/workspace.controller";

const router = Router();

router.post("/create/new", createWorskpaceController);
router.put("/all", getAllWorkspacesUserIsMemberController);
router.get("/:id", getWorkspaceByIdController);
router.get("/members/:id", getWorkspaceMembersController);
router.put(
  "/change/member/role/:id",
  changeWorkspaceMemberRoleController
);
router.put("/update/:id", updateWorkspaceByIdController);
router.delete("/delete/:id", deleteWorkspaceByIdController);

// tomorrow test all the routes properly
export default router;
