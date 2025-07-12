import { Router } from "express";
import { getCurrentUserController } from "../controllers/user.controller.js";


const router = Router();

router.get('/current', getCurrentUserController);

export default router;