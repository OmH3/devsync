import { z } from "zod";

export const boardTitleSchema = z
  .string()
  .trim()
  .min(1, { message: "Board title is required" })
  .max(100, { message: "Board title cannot exceed 100 characters" });

export const boardDescriptionSchema = z
  .string()
  .trim()
  .max(500, { message: "Board description cannot exceed 500 characters" })
  .optional()
  .default("");

export const boardElementsSchema = z.array(z.any()).optional().default([]);

export const collaboratorIdsSchema = z
  .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID"))
  .optional()
  .default([]);

export const whiteboardIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid whiteboard ID");

export const workspaceIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID");

// Create whiteboard schema
export const createWhiteboardSchema = z.object({
  boardTitle: boardTitleSchema,
  boardDescription: boardDescriptionSchema,
  workspaceId: workspaceIdSchema, // ✅ Add this to specify workspace
});

// Update whiteboard schema
export const updateWhiteboardSchema = z.object({
  boardTitle: boardTitleSchema.optional(),
  boardDescription: boardDescriptionSchema,
  boardElements: boardElementsSchema,
});

// Canvas size update schema
export const updateCanvasSizeSchema = z.object({
  width: z.number().min(100).max(10000),
  height: z.number().min(100).max(10000),
});

// Add collaborator schema
export const addCollaboratorSchema = z.object({
  collaboratorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID"),
});