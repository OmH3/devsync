import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './hooks/useAuth.js'



import PageLoader from './components/ui/PageLoader.jsx'

// Route-level code splitting keeps the login screen small.
const Login = lazy(() => import('./pages/Login.jsx'))
const Register = lazy(() => import('./pages/Register.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const GoogleCallback = lazy(() => import('./pages/GoogleCallback.jsx'))



function App() {
  const { isAuthenticated, isLoading } = useAuth()



  if (isLoading) return <PageLoader label="Checking your session" />



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

    </>
  )
}

export default App
