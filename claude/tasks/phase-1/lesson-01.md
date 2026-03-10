# Lesson 1: Project Setup & Structure

## 🎯 Goal
Build a strong foundation for your project by setting up folders, tools, and configurations so we can start developing.

## 📚 What You'll Learn
✅ How to organize your project files (Backend, Frontend, Config)  
✅ What TypeScript is and why we use it  
✅ How to set up code quality tools (ESLint, Prettier)  
✅ Docker - run databases without installing them  
✅ Environment variables - keep secrets safe  

## 📋 Prerequisites
- Node.js 18+ installed ([Download here](https://nodejs.org/))
- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- A code editor like VSCode ([Download here](https://code.visualstudio.com/))
- Basic comfort with terminal/command line

## 📌 What We're Building

Think of it like setting up a restaurant kitchen:
- **Backend** = The kitchen where food is prepared (API, database logic)
- **Frontend** = The dining area where customers eat (User Interface)
- **Docker** = Pre-made utensils and equipment ready to use
- **TypeScript** = A recipe that prevents mistakes

## 🛠️ Tasks

### Task 1: Create Your Project Folder Structure

**Why?** Good organization makes it easy to find code and prevents confusion.

Create folders like this:

```
blog-platform/                 ← Main project folder
├── backend/                   ← Server code (Express + TypeScript)
│   ├── src/
│   │   ├── modules/          ← Feature folders (organizations, projects, tasks)
│   │   ├── shared/           ← Common code used everywhere
│   │   ├── config/           ← Settings and configuration
│   │   └── app.ts            ← Main application file
│   ├── package.json          ← Backend dependencies list
│   └── tsconfig.json         ← TypeScript settings
├── frontend/                  ← User interface code (React)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml        ← Database configuration
├── .gitignore               ← Tell Git what to ignore
└── README.md               ← Project documentation
```

**Run this in your terminal:**

```bash
# Create backend structure
mkdir -p backend/src/{modules,shared/{middleware,utils,types,decorators},config}

# Create frontend structure
mkdir -p frontend/src

# Create main file
touch backend/src/app.ts
```

**What each folder does:**
- `backend/src/modules/` → Each feature (organizations, projects, tasks) gets its own folder
- `backend/src/shared/` → Common code that many features use
- `backend/src/config/` → Settings like database connection
- `frontend/src/` → React components and pages

---

### Task 2: Set Up Backend Dependencies

**Why?** Dependencies are code libraries that do common tasks so we don't have to write everything from scratch.

Run these commands in the `backend` folder:

```bash
cd backend
npm init -y
```

This creates a `package.json` file (like a recipe of what ingredients we need).

**Now install the tools we need:**

```bash
# Core backend libraries
npm install express cors helmet dotenv
npm install @prisma/client

# TypeScript support
npm install -D typescript @types/node @types/express @types/cors
npm install -D ts-node nodemon

# Code quality tools
npm install -D eslint prettier eslint-config-prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

**What each one does:**
| Package | What It Does |
|---------|------------|
| `express` | Web server - receives and responds to requests |
| `cors` | Allow requests from different websites |
| `helmet` | Security - protects from common attacks |
| `dotenv` | Load secret settings from `.env` file |
| `@prisma/client` | Talk to database easily |
| `typescript` | Check code for mistakes before running |
| `nodemon` | Auto-restart server when you make changes |
| `eslint` | Check code style and catch bugs |
| `prettier` | Auto-format code to look nice |

---

### Task 3: Configure TypeScript

**Why?** TypeScript catches mistakes before we run the code, saving us hours of debugging.

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",           /* Modern JavaScript */
    "module": "commonjs",         /* How to bundle code */
    "lib": ["ES2022"],           /* JavaScript features to use */
    "outDir": "./dist",          /* Where to save compiled code */
    "rootDir": "./src",          /* Where source files are */
    "strict": true,              /* Force strict type checking */
    "esModuleInterop": true,     /* Allow different import styles */
    "skipLibCheck": true,        /* Skip library type checks */
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,   /* Allow importing JSON files */
    "moduleResolution": "node",  
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]           /* @/utils means src/utils */
    }
  },
  "include": ["src/**/*"],        /* Compile all TypeScript in src */
  "exclude": ["node_modules", "dist"]
}
```

**In simple terms:**
- `strict: true` = Be picky about types (safer code)
- `@/*` paths = Shortcuts so we can write `@/utils` instead of `../../../utils`

---

### Task 4: Set Up Code Quality Tools

**Why?** These tools catch bugs automatically and keep our code clean and consistent.

Create `backend/.eslintrc.json`:

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

**What this does:**
- ESLint checks code for common mistakes
- `@typescript-eslint` checks TypeScript specifically
- `prettier` formats code automatically

Create `backend/.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

**What this does:**
- `semi: true` = Always add semicolons
- `singleQuote: true` = Use 'quotes' not "quotes"
- `printWidth: 80` = Lines not too long
- `tabWidth: 2` = Indent with 2 spaces

---

### Task 5: Add Scripts to Run Commands

**Why?** Scripts are shortcuts to run complex commands easily.

Update `backend/package.json` and add a `scripts` section:

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

**What each script does:**
| Script | What It Does |
|--------|------------|
| `npm run dev` | Start server + auto-restart on changes |
| `npm run build` | Convert TypeScript to JavaScript |
| `npm start` | Run the compiled JavaScript |
| `npm run lint` | Check code for problems |
| `npm run format` | Auto-fix code formatting |

---

### Task 6: Create Docker Database Setup

**Why?** Docker lets us run PostgreSQL and Redis without installing them on our computer. Easy to clean up or restart.

Create `docker-compose.yml` in your project root:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine      # Use PostgreSQL 15
    container_name: projecthub-db
    environment:
      POSTGRES_USER: postgres       # Username
      POSTGRES_PASSWORD: postgres   # Password
      POSTGRES_DB: projecthub_dev   # Database name
    ports:
      - "5432:5432"                # Access at localhost:5432
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Don't lose data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s                 # Check every 10 seconds
      timeout: 5s
      retries: 5                    # Retry 5 times

  # Redis Cache
  redis:
    image: redis:7-alpine           # Use Redis 7
    container_name: projecthub-redis
    ports:
      - "6379:6379"                # Access at localhost:6379
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:                    # Keep data between restarts
```

**In simple terms:**
- `image: postgres:15-alpine` = Use PostgreSQL version 15 (small version)
- `ports: - "5432:5432"` = Access database at `localhost:5432`
- `volumes` = Save data so it doesn't disappear when we stop Docker
- `healthcheck` = Make sure services are working

---

### Task 7: Create the Main Server File

**Why?** This is where Express gets set up and starts listening for requests.

Create `backend/src/app.ts`:

```typescript
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE ===
// Middleware runs before every request

app.use(helmet());              // Security headers
app.use(cors());                // Allow cross-origin requests
app.use(express.json());        // Parse JSON in request body

// === ROUTES ===

// Health check - is the server alive?
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString() 
  });
});

// === START SERVER ===

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
```

**What this does:**
1. Import libraries we need
2. Create Express app
3. Add middleware (security, JSON parsing)
4. Create one test route `/health`
5. Start server on port 3000

**Line by line:**
- `dotenv.config()` = Load secrets from `.env` file
- `app.use()` = Add middleware (runs before every request)
- `app.get('/health')` = When someone visits `/health`, send `{status: 'ok'}`
- `app.listen(3000)` = Start listening on port 3000

---

### Task 8: Create Environment File

**Why?** Secret data like passwords should NOT be in code. We put them in `.env` file which Git ignores.

Create `backend/.env`:

```env
# Server Settings
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projecthub_dev?schema=public"

# JWT - Tokens for authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
```

**What each one does:**
- `PORT` = What port to run on (3000)
- `DATABASE_URL` = How to connect to PostgreSQL
- `JWT_SECRET` = Secret key for tokens (change in production!)
- `REDIS_HOST` = Where Redis is running

---

### Task 9: Tell Git What to Ignore

**Why?** We don't want to upload `.env` files with secrets to GitHub!

Create `backend/.gitignore`:

```gitignore
# === Dependencies ===
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# === Environment & Secrets ===
.env                  ← IMPORTANT: Don't upload secrets!
.env.local
.env.*.local

# === Build Output ===
dist/
build/
*.tsbuildinfo

# === IDE Settings ===
.vscode/
.idea/
*.swp
*.swo

# === OS Files ===
.DS_Store
Thumbs.db

# === Logs ===
logs/
*.log

# === Database ===
postgres_data/

# === Temp Files ===
tmp/
temp/
```

**Why:**
- `node_modules/` = Too big, can be reinstalled from package.json
- `.env` = Contains passwords!
- `dist/` = Can be regenerated by running `npm run build`
- `.DS_Store` = macOS files we don't need

---

### Task 10: Create a README

**Why?** Document how to set up the project so anyone can get started.

Create `README.md` in your project root:

Create `README.md`:

```markdown
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
```

---

## ✅ Verify Your Setup Works

Follow these steps to make sure everything is set up correctly:

### Step 1: Start Docker Services

```bash
docker-compose up -d
```

Check if services are running:
```bash
docker-compose ps
```

**Expected output:**
```
NAME                  COMMAND                  SERVICE      STATUS
projecthub-db         docker-entrypoint.s...   postgres     Up (healthy)
projecthub-redis      redis-server             redis        Up (healthy)
```

### Step 2: Install Backend Packages

```bash
cd backend
npm install
```

**Expected output:**
```
added 150 packages
```

### Step 3: Check Code Quality

```bash
npm run lint
```

**Expected output:**
```
✔ 0 problems (0 errors, 0 warnings)
```

### Step 4: Start the Server

```bash
npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

### Step 5: Test the Server

Open another terminal and run:

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-02T12:00:00.000Z"
}
```

✅ **If you see this, everything is working!**

---

## 🎓 Key Concepts Explained

### What is TypeScript?
TypeScript catches mistakes BEFORE you run the code.

**Without TypeScript:**
```javascript
function add(a, b) {
  return a + b;
}

add('5', 3);  // ❌ Runs but gives wrong answer: "53"
```

**With TypeScript:**
```typescript
function add(a: number, b: number): number {
  //         ↑ Says: must be a number
  return a + b;
}

add('5', 3);  // ❌ Error found BEFORE running!
```

### What is Express?
Express is a web server that listens for requests and sends responses.

**Flow:**
```
Browser sends request
        ↓
Express receives it
        ↓
Express processes it
        ↓
Express sends response
        ↓
Browser displays it
```

### What is Docker?
Docker is like having programs in boxes. You don't install them, you just run the boxes.

**Without Docker:**
- Install PostgreSQL on your computer
- Install Redis on your computer
- Worry about versions
- Hard to clean up

**With Docker:**
- `docker-compose up` starts everything
- All team members get same versions
- One command to stop everything

### What is .env?
A special file that stores secrets that shouldn't be in code.

**Good:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/db
```

**Bad (in code):**
```typescript
const password = "password123";  // 🔓 Everyone can see it!
```

### What is node_modules?
A folder containing all your project's dependencies. It's HUGE so we don't upload it to Git.

**Instead:**
- Upload `package.json` (recipe)
- When someone clones: `npm install` recreates `node_modules`

---

## 💡 Troubleshooting

### Problem: Port 3000 Already in Use
```bash
# Solution: Use different port
PORT=3001 npm run dev
```

### Problem: Docker Services Won't Start
```bash
# Solution: Check Docker is running, then restart
docker-compose restart

# Check logs
docker-compose logs postgres
```

### Problem: npm install Fails
```bash
# Solution: Clear cache and try again
npm cache clean --force
npm install
```

### Problem: TypeScript Errors
```bash
# Solution: Check types are correct
npm run lint

# Make sure types are installed
npm install --save-dev @types/express
```

---

## 🎯 What's Next?

Great job! You've set up the foundation. Next we'll:

1. **Lesson 2**: Set up the database with Prisma ORM
2. **Lesson 3**: Create the first API endpoints
3. **Lesson 4**: Add authentication

---

## 📝 Checklist - You're Done When:

- [ ] Project folder structure created
- [ ] `npm install` works without errors
- [ ] `npm run dev` starts the server
- [ ] `curl http://localhost:3000/health` returns JSON
- [ ] `npm run lint` shows no errors
- [ ] Docker services running (`docker-compose ps` shows both services)
- [ ] Can see server logs when it starts

---

## 🔗 Resources

| Topic | Resource |
|-------|----------|
| **TypeScript** | [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Beginner friendly! |
| **Express** | [Express.js Guide](https://expressjs.com/en/guide/routing.html) - Learn routes |
| **Docker** | [Docker Tutorial](https://docker-curriculum.com/) - Visual guide |
| **Node.js** | [Node.js Official](https://nodejs.org/en/docs/) - Under Guides section |
| **npm** | [npm Docs](https://docs.npmjs.com/cli/) - Package manager guide |

---

## 💬 Common Questions

**Q: Do I need to know TypeScript?**
A: No! We'll learn it step by step. It's like JavaScript with safety warnings.

**Q: Can I use different versions?**
A: Try to use Node 18+, but slightly older versions might work. Docker versions should match exactly.

**Q: Why so many config files?**
A: Each tool (ESLint, Prettier, TypeScript) needs settings. It looks like a lot, but we rarely change them.

**Q: What if I mess up?**
A: Delete the `node_modules` folder and `package-lock.json`, then run `npm install` again. Everything will be fresh.

---

## 🚀 Summary

You now have:
✅ Organized project structure  
✅ TypeScript configured for safety  
✅ Development tools (ESLint, Prettier)  
✅ Express server running  
✅ PostgreSQL & Redis ready via Docker  
✅ Environment variables set up properly  

**You're ready to start Lesson 2!**
