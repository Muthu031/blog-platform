# Blog Platform - Multi-Tenant SaaS

A complete project management and blogging platform built with:
- **Backend**: Express.js + TypeScript + PostgreSQL
- **Frontend**: React
- **Real-time**: Socket.io
- **Cache**: Redis

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup

1. Start Docker services (Postgres, Redis, Mailpit):
   ```bash
   docker-compose up -d
   ```

   Mailpit (dev email inbox) UI: `http://localhost:8025`

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Test it:
   ```bash
   curl http://localhost:3000/health
   ```

### Common Commands

```bash
# Development
npm run dev        # Start with auto-reload
npm run lint       # Check code for errors
npm run format     # Auto-fix formatting

# Production
npm run build      # Compile TypeScript
npm start          # Run compiled code

# Docker
docker-compose up -d      # Start Docker services
docker-compose down       # Stop Docker services
docker-compose logs       # View logs
```

## Email (Temporary Password)

New account creation emails a temporary password to the user, and the user is forced to reset their password after first login.

For local development, this repo includes Mailpit (SMTP inbox) via Docker:
- SMTP: `localhost:1025`
- Inbox UI: `http://localhost:8025`

Backend config lives in `backend/.env`:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_FROM`
- `SMTP_USER` (optional)
- `SMTP_PASS` (optional)

To send real emails instead of Mailpit, point `SMTP_*` to your real SMTP provider (Gmail/SendGrid/Mailgun/etc) and set `SMTP_USER`/`SMTP_PASS`.

## Project Structure

```
backend/
|-- src/                 # TypeScript source
|   |-- modules/         # Feature code organized by domain
|   |-- shared/          # Reusable code
|   |-- config/          # Configuration
|   `-- app.ts           # Main Express app
|-- prisma/              # Prisma schema/migrations/seed
|-- dist/                # Compiled JavaScript (generated)
`-- package.json         # Backend dependencies
```

## First Request

Your server should now respond to requests:

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T12:00:00.000Z"
}
```

## Database Migrations / Seeding

Apply migrations and seed your local Docker Postgres:

```bash
docker-compose up -d postgres
cd backend
npx prisma migrate dev
npx prisma db seed
```

If you prefer "apply existing migrations only" (no prompts), use:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

