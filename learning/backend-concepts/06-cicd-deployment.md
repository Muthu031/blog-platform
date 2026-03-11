# CI/CD & Deployment - Automating Quality and Reliability

> Docker, Kubernetes, automated testing, and zero-downtime deployments

## 1. Core Concepts

### Deployment Pipeline

```
Git Push
    ↓
GitHub Actions Triggered
    ├→ Lint & Format Check
    ├→ Run Unit Tests
    ├→ Run Integration Tests
    ├→ Build Docker Image
    ├→ Push to Registry
    └→ Deploy to Kubernetes
        ├→ Blue-Green Deployment
        ├→ Health Checks
        └→ Smoke Tests (E2E)
```

## 2. Real-World Applications

### Example 1: Dockerfile

```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --production

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start app
CMD ["node", "dist/app.js"]
```

### Example 2: GitHub Actions CI/CD

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Format check
        run: npm run format:check
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ secrets.DOCKER_REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_REGISTRY }}/task-api:latest
            ${{ secrets.DOCKER_REGISTRY }}/task-api:${{ github.sha }}
          cache-from: type=registry,ref=${{ secrets.DOCKER_REGISTRY }}/task-api:buildcache
          cache-to: type=registry,ref=${{ secrets.DOCKER_REGISTRY }}/task-api:buildcache,mode=max
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/task-api \
            task-api=${{ secrets.DOCKER_REGISTRY }}/task-api:${{ github.sha }} \
            -n production
          kubectl rollout status deployment/task-api -n production
        env:
          KUBECONFIG: ${{ secrets.KUBECONFIG }}
```

### Example 3: Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-api
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: task-api
  template:
    metadata:
      labels:
        app: task-api
    spec:
      containers:
      - name: task-api
        image: docker-registry.io/task-api:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
        
        # Resource limits
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        
        # Environment variables
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        
        # Graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
---
apiVersion: v1
kind: Service
metadata:
  name: task-api
spec:
  selector:
    app: task-api
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### Example 4: Blue-Green Deployment

```typescript
class BlueGreenDeployment {
  async deploy(newVersion: string): Promise<void> {
    const BLUE = 'task-api-blue';
    const GREEN = 'task-api-green';
    const CANARY = 'task-api-canary';
    
    // 1. Deploy to GREEN environment (not serving traffic yet)
    console.log('Deploying to GREEN environment...');
    await this.kubectl.set('image', `deployment/${GREEN}`, {
      'task-api': newVersion
    });
    
    // 2. Wait for GREEN to be ready
    console.log('Waiting for GREEN to be healthy...');
    await this.kubectl.rolloutStatus(`deployment/${GREEN}`);
    
    // 3. Run smoke tests on GREEN
    console.log('Running smoke tests...');
    const testsPass = await this.runSmokeTests(GREEN);
    
    if (!testsPass) {
      console.error('Smoke tests failed, rolling back');
      return;
    }
    
    // 4. Switch traffic to GREEN
    console.log('Switching traffic to GREEN...');
    await this.switchTraffic(BLUE, GREEN);
    
    // 5. Monitor for issues
    console.log('Monitoring GREEN...');
    const issuesDetected = await this.monitorForIssues(GREEN, 300000); // 5 minutes
    
    if (issuesDetected) {
      console.warn('Issues detected, rolling back to BLUE');
      await this.switchTraffic(GREEN, BLUE);
      return;
    }
    
    // 6. Swap names for next deployment
    console.log('Promotion successful, swapping names');
    await this.swapDeploymentNames(BLUE, GREEN);
  }
  
  private async switchTraffic(from: string, to: string): Promise<void> {
    // Update service to point to new deployment
    await this.kubectl.patch('service', 'task-api', {
      spec: {
        selector: { app: to }
      }
    });
  }
}
```

### Example 5: Rollback Strategy

```typescript
class RollbackStrategy {
  async rollback(previousVersion: string): Promise<void> {
    console.log(`Rolling back to version ${previousVersion}...`);
    
    // 1. Keep deployment active during rollback
    const activeDeployment = await this.getActiveDeployment();
    
    // 2. Scale down current version
    await this.kubectl.patch(`deployment/${activeDeployment}`, {
      spec: { replicas: 0 }
    });
    
    // 3. Revert image to previous version
    await this.kubectl.set('image', `deployment/${activeDeployment}`, {
      'task-api': previousVersion
    });
    
    // 4. Scale back up
    await this.kubectl.patch(`deployment/${activeDeployment}`, {
      spec: { replicas: 3 }
    });
    
    // 5. Verify rollback
    await this.kubectl.rolloutStatus(`deployment/${activeDeployment}`);
    
    console.log('Rollback complete');
  }
  
  async automatedRollback(): Promise<void> {
    // If error rate spikes after deployment
    const deploymentMetrics = await this.getMetrics();
    
    if (deploymentMetrics.errorRate > 5) {
      console.error('High error rate detected, initiating rollback');
      await this.rollback(this.previousVersion);
    }
  }
}
```

## 3. Zero-Downtime Deployments

```typescript
class ZeroDowntimeDeployment {
  async deploy(): Promise<void> {
    // 1. Health check before proceeding
    await this.health.wait();
    
    // 2. Drain connections (stop accepting new requests)
    console.log('Entering graceful shutdown period...');
    this.server.close(); // Stop accepting new connections
    
    // 3. Wait for existing requests to complete
    const timeout = 30000; // 30 seconds
    await this.waitForActiveRequests(timeout);
    
    // 4. Run migrations
    await this.runMigrations();
    
    // 5. Update code
    await this.updateCode();
    
    // 6. Restart with new version
    this.server.listen(3000);
    
    // 7. Verify health
    await this.health.check();
  }
  
  private async waitForActiveRequests(timeout: number): Promise<void> {
    const start = Date.now();
    
    while (this.server.activeConnections > 0) {
      if (Date.now() - start > timeout) {
        console.warn('Timeout waiting for active requests, forcing shutdown');
        break;
      }
      
      await this.sleep(1000);
    }
  }
}
```

## 4. Environment Configuration

```typescript
// .env.example
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-here
LOG_LEVEL=info
ENVIRONMENT=staging|production

// Secrets in Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=database-url='...' \
  --from-literal=jwt-secret='...' \
  -n production
```

## 12. Practical Exercise

### Build Complete CI/CD Pipeline

**Requirements:**
1. Dockerfile with multi-stage build
2. GitHub Actions workflow
3. Automated testing
4. Docker image building
5. Kubernetes deployment
6. Blue-green deployment
7. Automated rollback

### Structure

```typescript
class CICDPipeline {
  async setupDocker(): Promise<void> {
    // TODO: Create Dockerfile
  }
  
  async setupGitHubActions(): Promise<void> {
    // TODO: CI/CD workflow
  }
  
  async setupKubernetes(): Promise<void> {
    // TODO: Deployment manifests
  }
  
  async implementBlueGreen(): Promise<void> {
    // TODO: Blue-green strategy
  }
  
  async setupRollback(): Promise<void> {
    // TODO: Automated rollback
  }
}
```

---

## Next Lesson

Continue to [Database Migrations](07-database-migrations.md)
