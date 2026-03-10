# Debugging Guide - Blog Platform

## 🐛 Common Issues & Solutions

### 1. Database Connection Issues

#### Problem: `Cannot connect to PostgreSQL`
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if Docker container is running
docker-compose ps

# Start Docker services
docker-compose up -d

# Verify PostgreSQL is healthy
docker-compose logs postgres
```

#### Problem: `DATABASE_URL not found`
```
Error: Environment variable not found: DATABASE_URL
```

**Solution:**
1. Check `.env` file exists in `backend/` folder
2. Ensure DATABASE_URL is set:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projecthub_dev?schema=public"
```

#### Problem: `ENOENT: no such file or directory`
```
Error: Error: ENOENT: no such file or directory, open '.env'
```

**Solution:**
```bash
# Make sure you're in backend directory
cd backend

# Verify .env exists
ls -la .env

# If missing, create it from template
cp .env.example .env  # if you have one, or recreate it manually
```

---

### 2. Prisma Issues

#### Problem: `@prisma/client did not initialize yet`
```
Error: @prisma/client did not initialize yet. Please run "prisma generate"
```

**Solution:**
```bash
# Generate Prisma client
npx prisma generate

# If that doesn't work, reinstall
npm install @prisma/client
npx prisma generate
```

#### Problem: `Datasource property 'url' is no longer supported`
```
Error: The datasource property `url` is no longer supported in schema files
```

**Solution:**
- Remove `prisma.config.ts` (incompatible with Prisma 5)
- Keep `url = env("DATABASE_URL")` in `prisma/schema.prisma`
- Use `.env` file for DATABASE_URL

#### Problem: `Cannot find module 'prisma/config'`
```
Error: Cannot find module 'prisma/config' or its corresponding type declarations
```

**Solution:**
- This error comes from `prisma.config.ts` which doesn't exist in Prisma 5
- Delete the file: `rm prisma.config.ts`

#### Problem: Database schema out of sync
```
Error: The database schema is not in sync with the Prisma schema
```

**Solution:**
```bash
# View pending changes
npx prisma migrate diff --from-empty --to-schema-datamodel

# Apply migrations
npx prisma migrate dev

# If database is corrupted, reset it (WARNING: deletes all data)
npx prisma migrate reset
```

---

### 3. TypeScript/Compilation Issues

#### Problem: `Cannot find module '@/...'`
```
Error: Cannot find module '@/config/database'
```

**Solution:**
1. Check `tsconfig.json` has path mapping:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

2. Regenerate TypeScript:
```bash
npm run build
```

3. Restart IDE to refresh IntelliSense

#### Problem: `Type 'X' is not assignable to type 'Y'`
```
Error: Type 'string' is not assignable to type 'number'
```

**Solution:**
```bash
# Check strict mode is enabled
# In tsconfig.json: "strict": true

# Fix type errors in code or cast explicitly
const num = parseInt(value) // convert string to number
```

#### Problem: `Module not found` errors in IDE
```
Error: Cannot find module 'express' or its declarations
```

**Solution:**
```bash
# Verify types are installed
npm ls @types/express

# If missing, install them
npm install -D @types/express
npm install -D @types/node
```

---

### 4. Dependencies & npm Issues

#### Problem: `npm ERR! code EAC PERMISSION DENIED`
```
Error: EACCES: permission denied
```

**Solution (Windows):**
```bash
# Run terminal as Administrator
# Then reinstall
npm install
```

**Solution (Mac/Linux):**
```bash
# Use sudo or fix npm permissions
sudo npm install
# Or reset npm permissions
npm config set prefix ~/.npm-global
```

#### Problem: `Circular dependency detected`
```
Warning: Circular dependency detected
```

**Solution:**
1. Check import chains don't loop back
2. Use barrel exports to break cycles
3. Example:
```typescript
// ❌ Bad: database.ts imports from utils.ts which imports from database.ts
// ✅ Good: Create index.ts that exports both
```

#### Problem: `npm audit found vulnerabilities`
```
X vulnerabilities found
```

**Solution:**
```bash
# View vulnerability details
npm audit

# Try to fix automatically
npm audit fix

# If that fails, update specific package
npm install package-name@latest

# Verify fix
npm audit
```

---

### 5. Runtime Errors

#### Problem: `Cannot read property 'email' of undefined`
```
TypeError: Cannot read property 'email' of undefined
```

**Solution:**
1. Add null checks in code:
```typescript
// ❌ Bad
console.log(user.email)

// ✅ Good
console.log(user?.email || 'No email')
```

2. Use Prisma's `findUniqueOrThrow()` instead of `findUnique()`

#### Problem: Port already in use
```
Error: listen EADDRINUSE :::3000
```

**Solution:**
```bash
# Kill process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm run dev
```

---

### 6. Database Debugging

#### View Database with Prisma Studio
```bash
npx prisma studio
```
- Opens web UI at http://localhost:5555
- Browse tables, view data, edit records
- No command line needed

#### Check Database Directly
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost -d projecthub_dev

# List all tables
\dt

# View users table
SELECT * FROM users;

# Exit
\q
```

#### Enable Query Logging
In `.env`:
```env
NODE_ENV=development
```

This logs all Prisma queries to console:
```
prisma:query SELECT ... FROM "users"
prisma:query INSERT INTO ...
```

#### Debug Seed Script
```bash
# Run seed with error output
npx ts-node prisma/seed.ts

# Or rebuild with verbose logging
DEBUG=* npx ts-node prisma/seed.ts
```

---

### 7. Testing Database Connection

#### Quick Test Script
```bash
# Create backend/src/debug-db.ts
npx ts-node src/debug-db.ts
```

**Content:**
```typescript
import prisma from './config/database';

async function debug() {
  try {
    console.log('🔍 Testing database connection...');
    
    const users = await prisma.user.findMany();
    console.log(`✅ Found ${users.length} users`);
    
    const orgs = await prisma.organization.findMany();
    console.log(`✅ Found ${orgs.length} organizations`);
    
    const tasks = await prisma.task.findMany();
    console.log(`✅ Found ${tasks.length} tasks`);
    
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
```

---

### 8. Docker Debugging

#### Check Container Logs
```bash
# PostgreSQL logs
docker-compose logs postgres

# Redis logs
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f postgres

# Specific error type
docker-compose logs postgres | grep "ERROR"
```

#### Connect to Container Shell
```bash
# Access PostgreSQL container
docker-compose exec postgres bash

# Then run psql inside
psql -U postgres -d projecthub_dev
```

#### Rebuild Containers
```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

---

### 9. TypeScript Development Debugging

#### Enable Source Maps
In `tsconfig.json`:
```json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSourceMap": true
  }
}
```

#### VS Code Debugging
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch App",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

Then press `F5` to debug with breakpoints.

---

### 10. Performance Debugging

#### Check Slow Queries
```typescript
// In database.ts, enable logging
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

#### Monitor Memory Usage
```bash
# Check Node process memory
node --inspect src/app.ts

# Open Chrome DevTools for profiling
# Visit chrome://inspect
```

---

## 🔧 Debugging Checklist

Before asking for help, verify:

- [ ] Docker containers are running: `docker-compose ps`
- [ ] `.env` file exists with DATABASE_URL
- [ ] `npm install` completed without errors
- [ ] `npx prisma generate` was run
- [ ] `npx prisma db seed` completed successfully
- [ ] No TypeScript errors: `npm run lint`
- [ ] Port 3000 is not already in use
- [ ] Database can be accessed: `npx ts-node src/test-db.ts`
- [ ] All dependencies listed: `npm ls`

---

## 📝 How to Report Issues

When debugging fails, provide:

1. **Error message** (full stack trace)
2. **What were you doing** when error occurred
3. **Environment**:
   ```bash
   node --version
   npm --version
   docker --version
   ```
4. **Recent changes** you made
5. **Logs** from relevant service:
   ```bash
   docker-compose logs postgres
   npm run dev 2>&1 > /tmp/debug.log
   ```

---

## 🚀 Quick Debug Commands

```bash
# Test database
npx ts-node src/test-db.ts

# View database UI
npx prisma studio

# Check schema is valid
npx prisma validate

# Generate client again
npx prisma generate

# Reset database (⚠️ deletes data)
npx prisma migrate reset

# View all migrations
ls prisma/migrations/

# Check Docker status
docker-compose ps

# View all environment variables
cat .env

# Test TypeScript compilation
npm run build

# Run linter
npm run lint

# Format code
npm run format
```

---

## 💡 Tips for Effective Debugging

1. **Always check `.env` first** - Most issues are environment variables
2. **Restart Docker** - Many issues solve themselves: `docker-compose restart`
3. **Clear node_modules** - Try `rm -rf node_modules && npm install`
4. **Check database state** - Use Prisma Studio to inspect data
5. **Enable logging** - Set `NODE_ENV=development` to see all queries
6. **Use TypeScript strict mode** - Catches bugs at compile time
7. **Test incrementally** - Run `npx ts-node` to test code snippets
8. **Read full error messages** - Don't stop at first line, scroll down

---

## 🆘 Still Stuck?

If none of these solutions work:

1. Check the lesson files for context
2. Review error messages character by character
3. Compare your code with lesson examples
4. Try the "nuclear option": 
   ```bash
   rm -rf node_modules package-lock.json
   docker-compose down -v
   npm install
   docker-compose up -d
   npx prisma migrate dev
   npx prisma db seed
   ```

Good luck debugging! 🚀
