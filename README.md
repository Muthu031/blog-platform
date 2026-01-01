# Monorepo Example (20+ yr stack)

This repository demonstrates a professional monorepo layout using:

- Node.js, TypeScript
- React (Vite), Tailwind CSS
- Express + Hono, Zod
- Prisma + PostgreSQL
- Axios, Zustand
- pnpm workspaces, Prettier, ESLint

Quick start

1. Install pnpm (if not installed):
   npm i -g pnpm
2. Install dependencies: pnpm install
3. Setup `.env` in `apps/api` (see `.env.example`) and make sure your Postgres is running.
4. Run Prisma migrations (from `apps/api`):
   pnpm -w -F @myorg/api prisma:migrate:dev
5. Run dev:
   - API: pnpm -w -F @myorg/api dev
   - Web: pnpm -w -F @myorg/web dev

TypeScript workspace build

- A simple build script is in `tooling/scripts/build.ts` and `build.js`.

Run the workspace build:

1. Build every package (TypeScript references):
   - `node tooling/scripts/build.js` or `pnpm -w run build`
2. Generate Prisma client (after `DATABASE_URL` is configured):
   - `pnpm -w -F @myorg/api prisma:generate`

Environment variables

- `apps/api/.env.example` contains `DATABASE_URL` and `PORT`.
- `apps/web` can use Vite env `VITE_API_BASE` to point at the API (e.g. `VITE_API_BASE=http://localhost:8080/api`).

Useful commands

- Install dependencies (root): `pnpm install`
- Start API in dev: `pnpm -w -F @myorg/api dev`
- Start Web in dev: `pnpm -w -F @myorg/web dev`
- Run Prisma migrations: `pnpm -w -F @myorg/api prisma:migrate:dev`

Notes

- This scaffold includes minimal, battle-tested patterns for a fullstack TypeScript app.
- Add CI scripts, secrets management, Docker, and infra as needed for production.
