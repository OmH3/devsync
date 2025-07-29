import FileSystemModel from "../models/FileSystem.model.js";


// Helper function to recursively update children paths when parent folder is renamed
export const updateChildrenPaths = async (parentId, newParentPath) => {
  const children = await FileSystemModel.find({
    parentId,
    isActive: true,
  });

  for (const child of children) {
    const newChildPath = `${newParentPath}/${child.name}`;
    child.path = newChildPath;
    await child.save();

    // If child is also a folder, recursively update its children
    if (child.type === "folder") {
      await updateChildrenPaths(child._id, newChildPath);
    }
  }
};