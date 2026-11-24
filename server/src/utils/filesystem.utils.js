import CodeEditorModel from "../models/CodeEditor.model.js";
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

export const getLanguageFromExtension = (extension) => {
  const languageMap = {
    js: "javascript",
    jsx: "javascript",
    py: "python",
    pyw: "python",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
  };
  
  return languageMap[extension.toLowerCase()] || "javascript";
};

// In filesystem.utils.js
export const deleteChildrenRecursively = async (parentId, session) => {
  const children = await FileSystemModel.find({
    parentId,
    isActive: true,
  }).session(session);

  for (const child of children) {
    if (child.type === "folder") {
      // Recursively delete folder children
      await deleteChildrenRecursively(child._id, session);
    } else if (child.type === "file" && child.codeEditorId) {
      // Delete associated code editor
      await CodeEditorModel.findByIdAndUpdate(
        child.codeEditorId,
        { isActive: false },
        { session }
      );
    }
    
    // Soft delete the child
    child.isActive = false;
    await child.save({ session });
  }
};