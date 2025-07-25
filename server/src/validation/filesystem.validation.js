import { z } from "zod";

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(255);

export const pathSchema = z
  .string()
  .trim()
  .min(1, { message: "Path is required" });

export const typeSchema = z
  .enum(["file", "folder"], { message: "Type must be 'file' or 'folder'" });

export const createFileSystemItemSchema = z.object({
  name: nameSchema,
  type: typeSchema,
  path: pathSchema,
  parentId: z.string().trim().optional(),
  workspaceId: z.string().trim().min(1, { message: "Workspace ID is required" }),
});

export const updateFileSystemItemSchema = z.object({
  name: nameSchema.optional(),
  path: pathSchema.optional(),
});

export const fileSystemIdSchema = z
  .string()
  .trim()
  .min(1, { message: "File system ID is required" });

export const moveFileSystemItemSchema = z.object({
  newParentId: z.string().trim().optional(),
  newPath: pathSchema,
});