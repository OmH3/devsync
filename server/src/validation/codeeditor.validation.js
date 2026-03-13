import { z } from "zod";

export const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title is required" })
  .max(255);

export const contentSchema = z.string().default("");

export const languageSchema = z
  .string()
  .trim()
  .min(1, { message: "Language is required" })
  .default("javascript");

export const updateCodeEditorSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
  language: languageSchema.optional(),
});

export const codeEditorIdSchema = z
  .string()
  .trim()
  .min(1, { message: "Code editor ID is required" });


export const executeCodeSchema = z.object({
  input: z.string().optional(),
  saveBeforeExecution: z.boolean().default(true),
});

//Add these missing schemas
export const createCodeEditorSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().optional().default(""),
  language: z.string().optional().default("javascript"),
  fileSystemId: z.string().optional()
});

export const saveCodeEditorContentSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional()
});

// ... existing schemas remain the same