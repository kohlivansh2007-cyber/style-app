import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewClient from './pages/NewClient'
import Consultation from './pages/Consultation'
import { AuthProvider, useAuth } from './auth'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream text-black">
        <div className="text-xs tracking-[0.3em] uppercase text-charcoal/60">
          Checking access…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/new"
            element={
              <PrivateRoute>
                <NewClient />
              </PrivateRoute>
            }
          />
          <Route
            path="/clients/:clientId/consultation"
            element={
              <PrivateRoute>
                <Consultation />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
