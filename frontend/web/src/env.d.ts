// Vite environment types for TypeScript
// Defines `import.meta.env` shape used across the frontend code.

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  readonly VITE_ORG_ID?: string
  // add other VITE_ env vars here as needed
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
