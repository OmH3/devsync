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
    // JavaScript & TypeScript
    js: "javascript",
    jsx: "javascript",
    // ts: "typescript",
    // tsx: "typescript",
    // mjs: "javascript",
    
    // Python
    py: "python",
    pyw: "python",
    
    // Java & JVM languages
    java: "java",
    // kt: "kotlin",
    // scala: "scala",
    
    // C/C++
    // c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    h: "c",
    hpp: "cpp",
    
    // Web languages
    html: "html",
    htm: "html",
    css: "css",
    // scss: "scss",
    // sass: "sass",
    // less: "less",
    
    // Data formats
    json: "json",
    xml: "xml",
    // yaml: "yaml",
    // yml: "yaml",
    
    // Documentation
    md: "markdown",
    markdown: "markdown",
    txt: "text",
    
    // Other popular languages
    // php: "php",
    // rb: "ruby",
    // go: "go",
    // rs: "rust",
    // swift: "swift",
    // sql: "sql",
    // sh: "shell",
    // bash: "shell",
    // ps1: "powershell",
    
    // Config files
    // dockerfile: "dockerfile",
    // gitignore: "text",
    // env: "text",
  };
  
  return languageMap[extension.toLowerCase()] || "text";
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