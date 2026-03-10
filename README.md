# Blog Platform - Multi-Tenant SaaS

A complete project management and blogging platform built with:
- **Backend**: Express.js + TypeScript + PostgreSQL
- **Frontend**: React
- **Real-time**: Socket.io
- **Cache**: Redis

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Setup

1. **Start databases:**
   ```bash
   docker-compose up -d
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Test it:**
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

# Database
docker-compose up -d      # Start Docker services
docker-compose down       # Stop Docker services
docker-compose logs       # View logs
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── modules/           # Feature code organized by domain
│   ├── shared/            # Reusable code
│   ├── config/            # Configuration
│   └── app.ts             # Main Express app
├── dist/                  # Compiled JavaScript (generated)
└── package.json           # Dependencies
```

## 🧑‍💻 First Request

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
