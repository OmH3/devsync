import { Router } from "express";
import { createWorskpaceController, getAllWorkspacesUserIsMemberController, getWorkspaceByIdController } from "../controllers/workspace.controller";

const router = Router();

router.post('/create/new', createWorskpaceController);
router.put('/all', getAllWorkspacesUserIsMemberController);
router.get("/:id", getWorkspaceByIdController);


export default router;