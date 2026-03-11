/**
 * Minimal API client used by the lesson frontend.
 *
 * - `API_BASE` can be overridden with `VITE_API_BASE` during development.
 * - Calls include credentials so browser cookies or session-based auth are sent.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

/**
 * getProjects
 * Fetches projects for the given organization id. Resolves to the `data`
 * payload returned by the backend API (the route in `project.controller`).
 */
export async function getProjects(orgId: string) {
  const res = await fetch(`${API_BASE}/api/organizations/${orgId}/projects`, {
    credentials: 'include'
  })
  if (!res.ok) throw new Error('Failed to fetch projects')
  const body = await res.json()
  return body.data
}

/**
 * createProject
 * Sends a POST to create a new project. The backend returns the created
 * project under `data` on success.
 */
export async function createProject(orgId: string, payload: { name: string; key: string; description?: string }) {
  const res = await fetch(`${API_BASE}/api/organizations/${orgId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    // Try to read backend error shape for a clearer message
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Create failed')
  }
  const body = await res.json()
  return body.data
}
