import { defineConfig } from 'vite'

// Use dynamic import to avoid ESM-only plugin require issues when running in some Node/CJS environments
export default defineConfig(async () => {
  const reactPlugin = (await import('@vitejs/plugin-react')).default
  return {
    plugins: [reactPlugin()],
    server: {
      port: 8080,
    },
  }
})
