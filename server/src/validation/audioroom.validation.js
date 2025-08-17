import { z } from "zod";

export const workspaceIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID");

