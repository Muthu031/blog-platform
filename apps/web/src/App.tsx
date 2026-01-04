import Home from './pages/Home'
import AuthPage from './components/auth/AuthPage'
import { ThemeProvider } from './hooks/useTheme'
import { useAuth } from './hooks/useAuth'
import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <Routes>
          <Route path="/auth" element={isAuthenticated ? <Navigate to="/home" /> : <AuthPage />} />
          <Route path="/home" element={isAuthenticated ? <Home /> : <Navigate to="/auth" />} />
        </Routes>
      </div>
    </ThemeProvider>
  )
}
