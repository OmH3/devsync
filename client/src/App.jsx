import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import VideoCall from './pages/VideoCall'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CallPage from './components/CallPage.jsx' // Add this import
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './hooks/useAuth.js'

function App() {
  const { isAuthenticated, isLoading } = useAuth();

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
    );
  }

  return (
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
      <Route 
        path="/videocall" 
        element={
          <ProtectedRoute>
            <VideoCall />
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
  )
}

export default App