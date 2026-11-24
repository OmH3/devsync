import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCapabilities } from '../hooks/useCapabilities.js';
import { useWorkspaceStore } from '../store/workspaceStore.js';
import { notify } from '../store/toastStore.js';
import CreateWorkspaceForm from '../components/CreateWorkspaceForm.jsx';
import JoinWorkspace from '../components/JoinWorkspace.jsx';
import WorkspaceList from '../components/WorkspaceList.jsx';
import WorkspaceSettings from '../components/WorkspaceSettings.jsx';
import MemberManagement from '../components/MemberManagement.jsx';
import VoiceRoom from '../components/VoiceRoom.jsx';
import { useThemeStore } from '../store/themeStore.js';
import { Home, FileText, PenTool, Code2, ChevronRight, Sun, Moon } from 'lucide-react';

// Heavy editors are loaded on demand, only when their view is opened.
const DocumentsList = lazy(() => import('../components/DocumentsList.jsx'));
const WhiteboardMain = lazy(() => import('../components/WhiteboardMain.jsx'));
const CodeEditorMain = lazy(() => import('../components/CodeEditorMain.jsx'));

const VIEWS = [
  { id: 'overview', label: 'Overview', hint: 'Workspace home', icon: Home },
  { id: 'documents', label: 'Documents', hint: 'Notes, plans & shared thinking', icon: FileText },
  { id: 'whiteboard', label: 'Whiteboard', hint: 'A canvas for your ideas', icon: PenTool },
  { id: 'code', label: 'Code', hint: 'Build something together', icon: Code2 },
];
const VIEW_IDS = VIEWS.map((view) => view.id);

const ViewSkeleton = () => (
  <div className="space-y-3 p-6" role="status" aria-label="Loading content">
    <div className="skeleton h-6 w-1/3" />
    <div className="skeleton h-4 w-2/3" />
    <div className="skeleton h-64 w-full" />
  </div>
);

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          <h3 className="font-semibold">This view encountered an unexpected error</h3>
          <p className="mt-1 text-red-700">{this.state.error?.message || 'Unable to render view.'}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { workspaces, currentWorkspace, fetchUserWorkspaces, setCurrentWorkspace, isLoading, error } = useWorkspaceStore();
  const { audio: audioEnabled } = useCapabilities();
  const { theme, toggleTheme } = useThemeStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
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
          <div className="tool-surface bg-white p-4">
            <DocumentsList {...props} />
          </div>
        );
      case 'whiteboard':
        return (
          <div className="h-[calc(100vh-9.5rem)] min-h-[480px] overflow-hidden tool-surface bg-white">
            <WhiteboardMain {...props} />
          </div>
        );
      case 'code':
        return (
          <div className="h-[calc(100vh-9.5rem)] min-h-[480px] overflow-hidden tool-surface bg-white">
            <CodeEditorMain {...props} />
          </div>
        );
      default:
        return (
          <div className="workspace-home space-y-6">
            <div className="page-intro"><div className="page-symbol"><FileText size={44} strokeWidth={1.2}/></div><p>YOUR SHARED SPACE</p><h2>{currentWorkspace.name}</h2><span>{currentWorkspace.description || 'A little clarity. A lot of possibility.'}</span></div>
            <div className="section-heading">Jump back in <ChevronRight size={14}/></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {VIEWS.filter((view) => view.id !== 'overview').map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => openView(view.id)}
                  className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="text-base font-semibold text-slate-900"><view.icon size={16} className="inline-block mr-2 text-stone-400" />{view.label}</div>
                  <div className="mt-1 text-sm text-slate-500">{view.hint}</div>
                </button>
              ))}
            </div>
            <div className="tool-surface bg-white p-4">
              <WorkspaceList onSelectWorkspace={selectWorkspace} />
            </div>
          </div>
        );
    }
  };

  const renderWorkspacePicker = () => (
    <div className="mx-auto max-w-3xl tool-surface bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Choose a workspace</h2>
          <p className="text-sm text-slate-500">Pick a workspace to start collaborating, or create a new one.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowJoinForm(true)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white">
            Join with code
          </button>
          <button type="button" onClick={() => setShowCreateForm(true)} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-indigo-700">
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
    <nav aria-label="Workspace navigation" className="workspace-sidebar flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-700 font-bold text-white" aria-hidden="true">D</div>
          <span className="text-base font-semibold text-stone-800">DevSync</span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Black theme'}
          className="flex items-center gap-1.5 rounded-md border border-stone-200 bg-stone-200/60 px-2.5 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-200"
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          <span>{theme === 'dark' ? 'Light' : 'Black'}</span>
        </button>
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
          className="mt-1 w-full rounded-md border border-stone-200 bg-stone-200/60 px-2 py-2 text-sm text-stone-800"
        >
          <option value="" disabled>Select a workspace…</option>
          {workspaces.map((workspace) => (
            <option key={workspace._id} value={workspace._id}>{workspace.name}</option>
          ))}
        </select>
        <div className="mt-2 flex gap-2 text-xs">
          <button type="button" onClick={() => setShowCreateForm(true)} className="flex-1 rounded-md bg-stone-200/60 px-2 py-1.5 hover:bg-stone-200">+ New</button>
          <button type="button" onClick={() => setShowJoinForm(true)} className="flex-1 rounded-md bg-stone-200/60 px-2 py-1.5 hover:bg-stone-200">Join</button>
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
                  activeView === view.id ? 'bg-stone-200/60 font-medium text-stone-800' : 'hover:bg-stone-200/60 hover:text-stone-800'
                }`}
              >
                <view.icon size={16} className="inline-block mr-2 text-stone-400" />{view.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {currentWorkspace && audioEnabled && <div className="mt-auto px-3 pt-6"><VoiceRoom key={currentWorkspace._id} workspaceId={currentWorkspace._id} /></div>}
      <div className="border-t border-stone-200 p-3">
        <div className="truncate px-1 text-sm text-stone-800">{user?.name}</div>
        <div className="truncate px-1 text-xs text-slate-500">{user?.email}</div>
        <button type="button" onClick={() => logout()} className="mt-2 w-full rounded-md bg-stone-200/60 px-3 py-2 text-sm hover:bg-stone-200">
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="workspace-shell flex min-h-screen bg-white">
      {sidebarOpen && <button aria-label="Close menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/20 lg:hidden" />}
      <aside className={`${sidebarOpen ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-50 w-60 shrink-0 lg:sticky lg:top-0 lg:block h-screen`}>{sidebar}</aside>

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to black theme'}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'Light' : 'Black'}</span>
            </button>
            {currentWorkspace && (
              <>
                <button
                  type="button"
                  onClick={() => copyInviteCode(currentWorkspace.inviteCode)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                  title="Copy invite code"
                >
                  Invite · <code className="font-mono">{currentWorkspace.inviteCode}</code>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMembers(true)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                  title="Manage members"
                >
                  Members
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-white"
                  title="Workspace settings"
                >
                  Settings
                </button>
              </>
            )}
          </div>
        </header>

        <main className="workspace-main flex-1 p-4 sm:p-6">
          <ViewErrorBoundary resetKey={`${currentWorkspace?._id || 'none'}:${activeView}`}>
            <Suspense fallback={<ViewSkeleton />}>{currentWorkspace ? renderTool() : renderWorkspacePicker()}</Suspense>
          </ViewErrorBoundary>
        </main>
      </div>

      {showCreateForm && (
        <CreateWorkspaceForm onClose={() => setShowCreateForm(false)} onSuccess={fetchUserWorkspaces} />
      )}
      {showJoinForm && (
        <JoinWorkspace onClose={() => setShowJoinForm(false)} onSuccess={fetchUserWorkspaces} />
      )}
      {showSettings && currentWorkspace && (
        <WorkspaceSettings workspace={currentWorkspace} onClose={() => setShowSettings(false)} />
      )}
      {showMembers && currentWorkspace && (
        <MemberManagement workspaceId={currentWorkspace._id} onClose={() => setShowMembers(false)} />
      )}
    </div>
  );
};

export default Dashboard;
