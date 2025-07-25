
export const titleSchema = z.string().trim().min(1, {message: "Title is required"}).max(255);

export const contentSchema = z.string().default("");

// export const roomIdSchema = z.string().trim().min(1,{message: "Room id is required"});

export const createDocSchema = z.object({
    title: titleSchema.optional(),
    content: contentSchema.optional(),
    workspaceId: z.string().trim().min(1,{message: "Workspace Id is required"}),
});

export const docIdSchema = z
  .string()
  .trim()
  .min(1, { message: "Document ID is required" });

export const updateDocSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
});

