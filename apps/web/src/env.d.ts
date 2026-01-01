/// <reference types="vite/client" />

// Extend ImportMetaEnv here if you have additional typed VITE_ variables
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  // more env vars...
  // readonly SOME_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}