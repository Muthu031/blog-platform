import React from 'react'
import ProjectsList from './pages/ProjectsList'

/**
 * App
 *
 * Top-level application component. Responsibilities:
 * - Provide a stable layout and common chrome (header, footer, nav).
 * - Compose page components (for simple lessons we directly render `ProjectsList`).
 * - In a larger app you would add a router (react-router) here and wrap pages
 *   in providers (AuthProvider, ThemeProvider, etc.).
 *
 * To extend:
 * - Replace the direct `ProjectsList` render with a router and separate pages.
 * - Add global contexts (authentication, API error handling) as needed.
 */
export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Projects (Lesson 5 Frontend)</h1>
      </header>
      <main>
        {/* ProjectsList handles fetching and creating projects for the configured org. */}
        <ProjectsList />
      </main>
    </div>
  )
}
