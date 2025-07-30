import { z } from "zod";

export const workspaceIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID");

export const startVideoCallSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const joinVideoCallSchema = z.object({
  workspaceId: workspaceIdSchema,
});

export const endVideoCallSchema = z.object({
  workspaceId: workspaceIdSchema,
});