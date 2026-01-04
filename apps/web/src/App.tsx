import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ThemeProvider } from './hooks/useTheme'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import AuthPage from './components/auth/AuthPage'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

function Main() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated === false && location.pathname === '/') {
      navigate('/auth');
    } else if (isAuthenticated === true && location.pathname === '/auth') {
      navigate('/');
    }
  }, [isAuthenticated, navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Main />
      </ThemeProvider>
    </AuthProvider>
  )
}
