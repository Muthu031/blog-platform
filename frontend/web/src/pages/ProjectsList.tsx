import React, { useEffect, useState } from 'react'
import { getProjects, createProject } from '../services/api'

/**
 * ProjectsList
 *
 * Simple page used for Lesson 5 frontend implementation. It:
 * - Loads projects for a configured organization (`VITE_ORG_ID`).
 * - Displays a basic list of projects.
 * - Provides a small form to create a new project (name + key).
 *
 * Note: Authentication and session management are intentionally minimal here.
 * The API client uses `credentials: 'include'` so a browser session with cookies
 * or an authenticated backend session will be used when running the app.
 */

type Project = {
  id: string
  name: string
  key: string
  description?: string
}

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [key, setKey] = useState('')

  // Organization ID is read from environment during build/dev (`.env` or Vite env)
  const orgId = import.meta.env.VITE_ORG_ID || ''

  // Fetch projects on mount or when orgId changes.
  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    // getProjects returns the `data` field from the API response
    getProjects(orgId)
      .then((res) => setProjects(res || []))
      .catch((err) => {
        console.error('Failed to load projects', err)
      })
      .finally(() => setLoading(false))
  }, [orgId])

  // Handle project creation using the minimal API client.
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId) return alert('VITE_ORG_ID not set')
    if (!name || !key) return alert('Name and key required')
    try {
      const project = await createProject(orgId, { name, key })
      // Prepend the newly created project to the list
      setProjects((p) => [project, ...p])
      setName('')
      setKey('')
    } catch (err) {
      console.error('Create project error', err)
      alert('Create failed')
    }
  }

  return (
    <div className="projects">
      <form onSubmit={handleCreate} className="create-form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Key (e.g., PROJ)" />
        <button type="submit">Create Project</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {projects.map((p) => (
            <li key={p.id}>
              <strong>{p.name}</strong> <em>({p.key})</em>
              <div>{p.description}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
