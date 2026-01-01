import React from 'react'
import Home from './pages/Home'
import Login from './components/Login'
import useStore from './stores/useStore'

export default function App() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return (
    <div className="min-h-screen bg-slate-50">
      {isAuthenticated ? <Home /> : <Login />}
    </div>
  )
}
