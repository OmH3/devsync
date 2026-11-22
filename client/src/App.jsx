import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useCapabilities } from './hooks/useCapabilities.js'
import { useWorkspaceStore } from './store/workspaceStore.js'
import { STREAM_API_KEY } from './config/env.js'
import PageLoader from './components/ui/PageLoader.jsx'

// Route-level code splitting keeps the login screen small.
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback.jsx'))
// The Stream SDK is large; load it only when audio is enabled and configured.
const BackgroundAudioRoom = lazy(() => import('./components/BackgroundAudioRoom.jsx'))

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspace?._id)
  const capabilities = useCapabilities()

  if (isLoading) return <PageLoader label="Checking your session" />

  const audioAvailable = capabilities.audio && Boolean(STREAM_API_KEY)

  return (
    <>
      <Suspense fallback={<PageLoader label="Loading" />}>
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/google/callback" element={<GoogleCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      {audioAvailable && isAuthenticated && currentWorkspaceId && (
        <Suspense fallback={null}>
          <BackgroundAudioRoom workspaceId={currentWorkspaceId} />
        </Suspense>
      )}
    </>
  )
}

export default App
