# Lesson 2: GitHub Actions CI/CD

## 🎯 Goal
Set up automated testing, building, and deployment using GitHub Actions.

## 📚 What You'll Learn
- Create GitHub Action workflows
- Automate testing on push
- Build Docker images
- Deploy to production

## 📋 Prerequisites
- Completed Phase 6 Lesson 1
- GitHub repository
- Docker images working

## 🛠️ Tasks

### 1. Create Test Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://postgres:password@localhost/test_db
        run: npx prisma migrate deploy
        working-directory: backend

      - name: Run tests
        env:
          DATABASE_URL: postgresql://postgres:password@localhost/test_db
          REDIS_HOST: localhost
        run: npm test
        working-directory: backend

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/coverage
```

### 2. Create Build Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Get version
        id: version
        run: echo "VERSION=$(git describe --tags --always)" >> $GITHUB_OUTPUT

      - name: Build and push backend
        uses: docker/build-push-action@v4
        with:
          context: ./backend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/blog-api:latest
            ${{ secrets.DOCKER_USERNAME }}/blog-api:${{ steps.version.outputs.VERSION }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/blog-api:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/blog-api:buildcache,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v4
        with:
          context: ./frontend
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/blog-web:latest
            ${{ secrets.DOCKER_USERNAME }}/blog-web:${{ steps.version.outputs.VERSION }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/blog-web:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_USERNAME }}/blog-web:buildcache,mode=max
```

### 3. Create Lint Workflow

Create `.github/workflows/lint.yml`:

```yaml
name: Lint

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run ESLint
        run: npm run lint
        working-directory: backend

      - name: Check TypeScript
        run: npm run type-check
        working-directory: backend

      - name: Format check
        run: npm run format:check
        working-directory: backend
```

### 4. Create Deploy Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [test, build, lint]

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
          DEPLOY_USER: ${{ secrets.DEPLOY_USER }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key $DEPLOY_USER@$DEPLOY_HOST 'cd /app && docker-compose pull && docker-compose up -d'
```

### 5. Setup Secrets in GitHub

Required secrets:
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub token
- `DEPLOY_KEY`: SSH private key
- `DEPLOY_HOST`: Deployment server address
- `DEPLOY_USER`: Deployment user

## ✅ Verification Checklist

- [ ] Test workflow runs on pull requests
- [ ] Build workflow creates Docker images
- [ ] Lint workflow checks code style
- [ ] Images are pushed to Docker registry
- [ ] Deploy workflow runs after tests pass
- [ ] Environment secrets are configured
- [ ] Actions complete successfully
- [ ] Codecov reports coverage
- [ ] Build artifacts are available
- [ ] Deployment logs are accessible

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Action](https://github.com/docker/build-push-action)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
