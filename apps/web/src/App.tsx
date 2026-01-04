import Home from './pages/Home'
import AuthPage from './components/auth/AuthPage'
import { ThemeProvider } from './hooks/useTheme'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        {isAuthenticated ? <Home /> : <AuthPage />}
      </div>
    </ThemeProvider>
  )
}
