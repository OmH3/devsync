import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CallPage from './components/CallPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './hooks/useAuth.js'
import BackgroundAudioRoom from './components/BackgroundAudioRoom.jsx'
import { useWorkspaceStore } from './store/workspaceStore.js'

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const { currentWorkspace } = useWorkspaceStore()
  
  // Show loading only if we're actually checking authentication
  // This prevents the loading spinner when user is just not logged in
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } 
        />
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
        
        {/* Add the new CallPage route */}
        <Route 
          path="/call/:callId" 
          element={
            <ProtectedRoute>
              <CallPage />
            </ProtectedRoute>
          } 
        />
        {/* Add more protected routes here */}
      </Routes>
      {isAuthenticated && currentWorkspace && (
        <>
          <div className="fixed top-4 left-4 bg-blue-500 text-white p-2 rounded text-xs z-50">
            DEBUG: Audio Room Should Show - Workspace: {currentWorkspace._id}
          </div>
          <BackgroundAudioRoom workspaceId={currentWorkspace._id} />
        </>
      )}
    </div>
  )
}

export default App