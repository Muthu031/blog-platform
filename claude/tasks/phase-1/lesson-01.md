# Lesson 1: Project Setup & Structure

## 🎯 Goal
Set up the foundational project structure with proper tooling and configuration.

## 📚 What You'll Learn
- Monorepo structure with modular architecture
- TypeScript configuration
- Development tooling (ESLint, Prettier)
- Docker setup for local development

## 📋 Prerequisites
- Node.js 18+ installed
- Docker Desktop installed
- Basic understanding of TypeScript

## 🛠️ Tasks

### 1. Initialize Project Structure

Create the following directory structure:

```
blog-platform/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   ├── shared/
│   │   ├── config/
│   │   └── app.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

**Commands:**
```bash
# Create backend structure
mkdir -p backend/src/{modules,shared/{middleware,utils,types,decorators},config}

# Create frontend structure
mkdir -p frontend/src

# Create entry point
touch backend/src/app.ts
```

### 2. Initialize Backend Package

```bash
cd backend
npm init -y
```

**Install dependencies:**
```bash
# Core dependencies
npm install express cors helmet dotenv
npm install @prisma/client

# TypeScript & types
npm install -D typescript @types/node @types/express @types/cors
npm install -D ts-node nodemon

# Development tools
npm install -D eslint prettier eslint-config-prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 3. Configure TypeScript (backend/tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Configure ESLint (backend/.eslintrc.json)

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### 5. Configure Prettier (backend/.prettierrc)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 6. Update package.json Scripts

Add to `backend/package.json`:

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

### 7. Create Docker Compose Setup

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: projecthub-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: projecthub_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: projecthub-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 8. Create Basic Express App

Create `backend/src/app.ts`:

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
```

### 9. Create Environment File

Create `backend/.env`:

```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projecthub_dev?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 10. Update .gitignore

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Database
postgres_data/

# Temp
tmp/
temp/
```

## ✅ Verification

Test your setup:

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Check services are running
docker-compose ps

# 3. Start backend
cd backend
npm run dev

# 4. Test health endpoint
curl http://localhost:3000/health
```

**Expected output:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T12:00:00.000Z"
}
```

## 🎓 Key Concepts

### Modular Monolith Architecture
- Start with a monolith but structured as modules
- Each module can be extracted to a microservice later
- Easier to develop and maintain initially

### TypeScript Benefits
- Type safety catches errors at compile time
- Better IDE autocomplete and refactoring
- Self-documenting code

### Docker for Development
- Consistent environment across team
- Easy to spin up/down services
- Matches production environment

## 📝 Commit Your Progress

```bash
git add .
git commit -m "feat: initial project setup with TypeScript and Docker"
```

## 🔜 Next Lesson

**Lesson 2**: Database Setup with Prisma
- Learn database schema design
- Set up Prisma ORM
- Create initial migrations

## 💡 Additional Challenges

1. Add a `Makefile` to simplify Docker commands
2. Set up VSCode debugging configuration
3. Add `husky` for pre-commit hooks
4. Create a project README documenting setup steps

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
