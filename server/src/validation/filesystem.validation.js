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
  path: pathSchema.optional(),
  parentId: z.string().trim().nullable().optional()
});

export const updateFileSystemItemSchema = z.object({
  name: nameSchema.optional()
});

export const fileSystemIdSchema = z
  .string()
  .trim()
  .min(1, { message: "File system ID is required" });

export const moveFileSystemItemSchema = z.object({
  newParentId: z.string().trim().nullable().optional()
});

//Add these missing schemas
export const updateFileSystemContentSchema = z.object({
  content: z.string().min(0),
  language: z.string().optional()
});

export const duplicateFileSystemItemSchema = z.object({
  name: z.string().optional(),
  parentId: z.string().optional()
});

export const bulkDeleteSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1, "At least one item ID required")
});

// ... existing schemas remain the same