import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

// Entry point for the frontend application.
// - Mounts the React component tree into the DOM element with id `root`.
// - `React.StrictMode` is enabled in development to surface potential problems
//   (deprecated lifecycle usage, unsafe side-effects, etc.).
// - Global styles are imported from `style.css`.

const container = document.getElementById('root')
if (!container) throw new Error('Root container not found')

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
