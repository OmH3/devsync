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