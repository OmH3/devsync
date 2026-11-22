import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import { notify } from '../store/toastStore.js';
import CreateWorkspaceForm from '../components/CreateWorkspaceForm.jsx';
import JoinWorkspace from '../components/JoinWorkspace.jsx';
import WorkspaceList from '../components/WorkspaceList.jsx';
import AudioRoomButton from '../components/AudioRoomButton.jsx';

// Heavy editors are loaded on demand, only when their view is opened.
const DocumentsList = lazy(() => import('../components/DocumentsList.jsx'));
const WhiteboardMain = lazy(() => import('../components/WhiteboardMain.jsx'));
const CodeEditorMain = lazy(() => import('../components/CodeEditorMain.jsx'));

const VIEWS = [
  { id: 'overview', label: 'Overview', hint: 'Workspace home' },
  { id: 'documents', label: 'Documents', hint: 'Collaborative writing' },
  { id: 'whiteboard', label: 'Whiteboard', hint: 'Sketch ideas together' },
  { id: 'code', label: 'Code', hint: 'Edit and run code' },
];
const VIEW_IDS = VIEWS.map((view) => view.id);

const ViewSkeleton = () => (
  <div className="space-y-3 p-6" role="status" aria-label="Loading content">
    <div className="skeleton h-6 w-1/3" />
    <div className="skeleton h-4 w-2/3" />
    <div className="skeleton h-64 w-full" />
  </div>
);

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, fetchUserWorkspaces, setCurrentWorkspace, isLoading, error } = useWorkspaceStore();
  const { audio: audioEnabled } = useCapabilities();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // The active view lives in the URL (?view=documents) so it can be bookmarked and shared.
  const requestedView = searchParams.get('view');
  const activeView = VIEW_IDS.includes(requestedView) ? requestedView : 'overview';
  const openView = (view) => {
    setSearchParams(view === 'overview' ? {} : { view });
    setSidebarOpen(false);
  };

  useEffect(() => {
    fetchUserWorkspaces();
  }, [fetchUserWorkspaces]);

  const selectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    setSearchParams({});
    setSidebarOpen(false);
  };

  const copyInviteCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      notify('Invite code copied to clipboard');
    } catch {
      notify('Could not copy the invite code. Copy it manually instead.', 'error');
    }
  };

  const renderTool = () => {
    const props = { workspaceId: currentWorkspace._id, workspace: currentWorkspace };
    switch (activeView) {
      case 'documents':
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <DocumentsList {...props} />
          </div>
        );
      case 'whiteboard':
        return (
          <div className="h-[calc(100vh-9.5rem)] min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <WhiteboardMain {...props} />
          </div>
        );
      case 'code':
        return (
          <div className="h-[calc(100vh-9.5rem)] min-h-[480px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <CodeEditorMain {...props} />
          </div>
        );
      default:
        return (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {VIEWS.filter((view) => view.id !== 'overview').map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => openView(view.id)}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="text-base font-semibold text-slate-900">{view.label}</div>
                <div className="mt-1 text-sm text-slate-500">{view.hint}</div>
              </button>
            ))}
          </div>
        );
    }
  };

  const renderWorkspacePicker = () => (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Choose a workspace</h2>
          <p className="text-sm text-slate-500">Pick a workspace to start collaborating, or create a new one.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowJoinForm(true)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Join with code
          </button>
          <button type="button" onClick={() => setShowCreateForm(true)} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            New workspace
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading workspaces">
          <div className="skeleton h-14 w-full" />
          <div className="skeleton h-14 w-full" />
        </div>
      ) : error ? (
        <div role="alert" className="flex items-center justify-between rounded-md bg-red-50 p-4 text-sm text-red-700">
          <span>Could not load workspaces: {error}</span>
          <button type="button" onClick={fetchUserWorkspaces} className="font-medium underline">Retry</button>
        </div>
      ) : (
        <WorkspaceList onSelectWorkspace={selectWorkspace} />
      )}
    </div>
  );

  const sidebar = (
    <nav aria-label="Workspace navigation" className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 font-bold text-white" aria-hidden="true">D</div>
        <span className="text-base font-semibold text-white">DevSync</span>
      </div>

      <div className="px-3">
        <label htmlFor="workspace-switcher" className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">Workspace</label>
        <select
          id="workspace-switcher"
          value={currentWorkspace?._id ?? ''}
          onChange={(event) => {
            const next = workspaces.find((workspace) => workspace._id === event.target.value);
            if (next) selectWorkspace(next);
          }}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-white"
        >
          <option value="" disabled>Select a workspace…</option>
          {workspaces.map((workspace) => (
            <option key={workspace._id} value={workspace._id}>{workspace.name}</option>
          ))}
        </select>
        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" onClick={() => setShowCreateForm(true)} className="flex-1 rounded-md bg-slate-800 px-2 py-1.5 hover:bg-slate-700">+ New</button>
          <button type="button" onClick={() => setShowJoinForm(true)} className="flex-1 rounded-md bg-slate-800 px-2 py-1.5 hover:bg-slate-700">Join</button>
        </div>
      </div>

      {currentWorkspace && (
        <ul className="mt-6 space-y-1 px-3">
          {VIEWS.map((view) => (
            <li key={view.id}>
              <button
                type="button"
                onClick={() => openView(view.id)}
                aria-current={activeView === view.id ? 'page' : undefined}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                  activeView === view.id ? 'bg-slate-800 font-medium text-white' : 'hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                {view.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-slate-800 p-3">
        <div className="truncate px-1 text-sm text-white">{user?.name}</div>
        <div className="truncate px-1 text-xs text-slate-500">{user?.email}</div>
        <button type="button" onClick={() => logout()} className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700">
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 lg:hidden"
          >
            ☰
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-slate-900">
              {currentWorkspace ? currentWorkspace.name : 'Your workspaces'}
              {currentWorkspace && activeView !== 'overview' && (
                <span className="font-normal text-slate-400"> / {VIEWS.find((view) => view.id === activeView)?.label}</span>
              )}
            </h1>
            {currentWorkspace?.description && activeView === 'overview' && (
              <p className="truncate text-sm text-slate-500">{currentWorkspace.description}</p>
            )}
          </div>
          {currentWorkspace && (
            <div className="flex items-center gap-2">
              {audioEnabled && <AudioRoomButton workspaceId={currentWorkspace._id} />}
              <button
                type="button"
                onClick={() => copyInviteCode(currentWorkspace.inviteCode)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                title="Copy invite code"
              >
                Invite · <code className="font-mono">{currentWorkspace.inviteCode}</code>
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Suspense fallback={<ViewSkeleton />}>{currentWorkspace ? renderTool() : renderWorkspacePicker()}</Suspense>
        </main>
      </div>

      {showCreateForm && (
        <CreateWorkspaceForm onClose={() => setShowCreateForm(false)} onSuccess={fetchUserWorkspaces} />
      )}
      {showJoinForm && (
        <JoinWorkspace onClose={() => setShowJoinForm(false)} onSuccess={fetchUserWorkspaces} />
      )}
    </div>
  );
};

export default Dashboard;
