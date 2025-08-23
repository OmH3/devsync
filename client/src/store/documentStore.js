import { create } from "zustand";
import { persist } from "zustand/middleware";
import { documentService } from "../services/document.service.js";

export const useDocumentStore = create(
  persist(
    (set, get) => ({
      documents: [],
      currentDocument: null,
      documentContent: "", // ✅ Add content state
      documentTitle: "", // ✅ Add title state
      isLoading: false,
      error: null,
      userCount: 1, // ✅ Add user count for collaboration
      isConnected: false, // ✅ Add connection status
      userRole: null, // ✅ Add user role state
      canEdit: false, // ✅ Add edit permission state
      canView: false, // ✅ Add view permission state
      canCreate: false, // ✅ Add create permission state
      canDelete: false, // ✅ Add delete permission state
      isDocumentOwner: false, // ✅ Add ownership state
      isWorkspaceOwner: false, // ✅ Add workspace ownership state
      isAdmin: false, // ✅ Add admin state
      activeUsers: [], // ✅ Add active users list
      hasUnsavedChanges: false, // ✅ Add unsaved changes state
      lastSaved: null, // ✅ Add last saved timestamp

      // ✅ Connection and user management actions
      setUserCount: (count) => set({ userCount: count }),
      setIsConnected: (connected) => set({ isConnected: connected }),
      setActiveUsers: (users) => set({ activeUsers: users || [] }),

      // ✅ Permission management actions
      setUserRole: (role) => set({ userRole: role }),
      setPermissions: (permissions) =>
        set({
          canEdit: permissions.canEdit || false,
          canView: permissions.canView || false,
          canCreate: permissions.canCreate || false,
          canDelete: permissions.canDelete || false,
        }),
      setOwnershipStatus: (isDocumentOwner, isWorkspaceOwner, isAdmin) =>
        set({
          isDocumentOwner,
          isWorkspaceOwner,
          isAdmin,
        }),

      // ✅ Document content management
      setCurrentDocument: (document) =>
        set({
          currentDocument: document,
          documentTitle: document?.title || "",
          documentContent: document?.content || "",
          hasUnsavedChanges: false,
        }),
      setDocumentContent: (content) =>
        set({
          documentContent: content,
          hasUnsavedChanges: true,
        }),
      setDocumentTitle: (title) =>
        set({
          documentTitle: title,
          hasUnsavedChanges: true,
        }),
      setHasUnsavedChanges: (hasChanges) =>
        set({ hasUnsavedChanges: hasChanges }),
      setLastSaved: (timestamp) => set({ lastSaved: timestamp }),

      // ✅ Basic state management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // ✅ Fetch user role in document (matching whiteboard pattern)
      // ✅ Update this method to match the API change
      fetchUserRoleInDocument: async (workspaceId) => {
        try {
          console.log("🔍 Fetching user role for workspace:", workspaceId);
          const response = await documentService.getUserRoleInDocument(
            workspaceId
          );

          const {
            role,
            permissions,
            isDocumentOwner,
            isWorkspaceOwner,
            isAdmin,
          } = response;

          set({
            userRole: role,
            canEdit: permissions.canEdit,
            canView: permissions.canView,
            canCreate: permissions.canCreate,
            canDelete: permissions.canDelete,
            isDocumentOwner,
            isWorkspaceOwner,
            isAdmin,
          });

          return {
            success: true,
            role,
            permissions,
          };
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          const errorMessage =
            error.response?.data?.message || "Failed to fetch user role";
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Document content actions with permission checks
      updateContentWithPermissionCheck: (content) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: "You do not have permission to edit this document" });
          return false;
        }

        set({
          documentContent: content,
          hasUnsavedChanges: true,
        });
        return true;
      },

      updateTitleWithPermissionCheck: (title) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: "You do not have permission to edit this document" });
          return false;
        }

        set({
          documentTitle: title,
          hasUnsavedChanges: true,
        });
        return true;
      },

      // ✅ Create document with role check (matching whiteboard pattern)
      createDocument: async (documentData) => {
        const { userRole } = get();
        if (userRole === "MEMBER") {
          set({ error: "Members cannot create documents" });
          return { success: false, error: "Permission denied" };
        }

        set({ isLoading: true, error: null });
        try {
          const response = await documentService.createDocument(documentData);
          const newDocument = response.doc;

          set((state) => ({
            documents: [newDocument, ...state.documents],
            currentDocument: newDocument,
            documentTitle: newDocument.title || "",
            documentContent: newDocument.content || "",
            hasUnsavedChanges: false,
            isLoading: false,
          }));

          return { success: true, document: newDocument };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to create document";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Fetch workspace documents
      fetchWorkspaceDocuments: async (workspaceId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentService.getWorkspaceDocuments(
            workspaceId
          );
          set({
            documents: response.docs || [],
            isLoading: false,
          });
          return { success: true, documents: response.docs || [] };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to fetch documents";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Fetch document by ID
      fetchDocumentById: async (documentId) => {
        set({ isLoading: true, error: null });
        try {
          const response = await documentService.getDocumentById(documentId);
          const document = response.doc;

          set({
            currentDocument: document,
            documentTitle: document.title || "",
            documentContent: document.content || "",
            hasUnsavedChanges: false,
            isLoading: false,
          });

          return { success: true, document };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to fetch document";
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Update document with permission check
      updateDocument: async (documentId, documentData) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: "You do not have permission to edit this document" });
          return { success: false, error: "Permission denied" };
        }

        set({ error: null });
        try {
          const response = await documentService.updateDocument(
            documentId,
            documentData
          );
          const updatedDocument = response.doc;

          set((state) => ({
            documents: state.documents.map((doc) =>
              doc._id === documentId ? updatedDocument : doc
            ),
            currentDocument:
              state.currentDocument?._id === documentId
                ? updatedDocument
                : state.currentDocument,
            documentTitle:
              state.currentDocument?._id === documentId
                ? updatedDocument.title || ""
                : state.documentTitle,
            documentContent:
              state.currentDocument?._id === documentId
                ? updatedDocument.content || ""
                : state.documentContent,
            hasUnsavedChanges: false,
            lastSaved: new Date(),
          }));

          return { success: true, document: updatedDocument };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to update document";
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Delete document with role check (matching whiteboard pattern)
      deleteDocument: async (documentId) => {
        const { userRole, isDocumentOwner } = get();
        if (userRole === "MEMBER" && !isDocumentOwner) {
          set({
            error: "Members cannot delete documents unless they own them",
          });
          return { success: false, error: "Permission denied" };
        }

        set({ error: null });
        try {
          await documentService.deleteDocument(documentId);

          set((state) => ({
            documents: state.documents.filter((doc) => doc._id !== documentId),
            currentDocument:
              state.currentDocument?._id === documentId
                ? null
                : state.currentDocument,
            documentTitle:
              state.currentDocument?._id === documentId
                ? ""
                : state.documentTitle,
            documentContent:
              state.currentDocument?._id === documentId
                ? ""
                : state.documentContent,
            hasUnsavedChanges: false,
          }));

          return { success: true };
        } catch (error) {
          const errorMessage =
            error.response?.data?.message || "Failed to delete document";
          set({ error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // ✅ Save document content to backend with permission check
      saveDocumentContent: async (documentId, title, content) => {
        const { canEdit } = get();
        if (!canEdit) {
          set({ error: "You do not have permission to edit this document" });
          return { success: false, error: "Permission denied" };
        }

        try {
          const response = await documentService.updateDocument(documentId, {
            title: title.trim(),
            content: content,
          });

          set((state) => ({
            currentDocument: response.doc,
            documentTitle: response.doc.title || "",
            documentContent: response.doc.content || "",
            hasUnsavedChanges: false,
            lastSaved: new Date(),
            documents: state.documents.map((doc) =>
              doc._id === documentId ? response.doc : doc
            ),
          }));

          return { success: true, document: response.doc };
        } catch (error) {
          console.error("Failed to save document:", error);
          const errorMessage =
            error.response?.data?.message || "Failed to save document";
          set({ error: errorMessage });
          return { success: false, error: error.message };
        }
      },

      // ✅ Real-time document updates (for socket integration)
      updateDocumentContentFromSocket: (documentId, title, content, userId) => {
        // Don't update if this is our own change
        const { currentDocument } = get();
        if (currentDocument?._id === documentId) {
          set({
            documentTitle: title || "",
            documentContent: content || "",
            // Don't mark as unsaved changes if it's from socket
          });
        }

        // Update in documents list
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc._id === documentId ? { ...doc, title, content } : doc
          ),
        }));
      },

      // ✅ Handle user join/leave events
      handleUserJoined: (userData) => {
        set((state) => ({
          activeUsers: [
            ...state.activeUsers.filter((u) => u.userId !== userData.userId),
            userData,
          ],
        }));
      },

      handleUserLeft: (userData) => {
        set((state) => ({
          activeUsers: state.activeUsers.filter(
            (u) => u.userId !== userData.userId
          ),
        }));
      },

      // ✅ Clear all document data (matching whiteboard pattern)
      clearDocuments: () =>
        set({
          documents: [],
          currentDocument: null,
          documentContent: "",
          documentTitle: "",
          error: null,
          userRole: null,
          canEdit: false,
          canView: false,
          canCreate: false,
          canDelete: false,
          isDocumentOwner: false,
          isWorkspaceOwner: false,
          isAdmin: false,
          activeUsers: [],
          hasUnsavedChanges: false,
          lastSaved: null,
          userCount: 1,
          isConnected: false,
        }),

      // ✅ Reset document editing state
      resetDocumentState: () =>
        set({
          currentDocument: null,
          documentContent: "",
          documentTitle: "",
          hasUnsavedChanges: false,
          lastSaved: null,
          activeUsers: [],
          userCount: 1,
          isConnected: false,
          error: null,
        }),
    }),
    {
      name: "document-storage",
      partialize: (state) => ({
        documents: state.documents,
        // Don't persist sensitive states like permissions
        userRole: state.userRole,
      }),
    }
  )
);
