import Home from './pages/Home'
import AuthPage from './components/auth/AuthPage'
import { ThemeProvider } from './hooks/useTheme'
import useStore from './stores/useStore'

export default function App() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        {isAuthenticated ? <Home /> : <AuthPage />}
      </div>
    </ThemeProvider>
  )
}
