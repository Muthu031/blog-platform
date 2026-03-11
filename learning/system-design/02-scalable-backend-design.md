# Scalable Backend Design - Horizontal Scaling

> Scale your backend from handling hundreds to millions of concurrent users

## 1. Core Scaling Concepts

### Vertical vs Horizontal Scaling

```
Vertical Scaling (Adding more power to one server)
┌─────────────────────────────┐
│  CPU: 2 → 4 → 8 cores      │
│  RAM: 8GB → 32GB → 64GB    │
│  Hits limit: $$$, can't buy bigger
└─────────────────────────────┘

Horizontal Scaling (Adding more servers)
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Server 1 │  │ Server 2 │  │ Server N │
└──────────┘  └──────────┘  └──────────┘
   ↓              ↓              ↓
   └──→ Load Balancer ←──┘
(Unlimited scaling, distributed)
```

## 2. Real-World Applications

### Strategy 1: Stateless Services

```typescript
// ❌ STATEFUL (Can't scale)
class StatefulUserService {
  private userCache = new Map<string, User>();
  
  constructor() {
    // Cache loaded on startup
    this.preloadUsers();
  }
  
  private preloadUsers(): void {
    // Problem: Different servers have different caches
    const users = db.users.findMany();
    users.forEach(u => this.userCache.set(u.id, u));
  }
  
  getUser(id: string): User | undefined {
    return this.userCache.get(id);
  }
}

// Server 1 Cache: {user123: {...}, user456: {...}}
// Server 2 Cache: {user789: {...}} // Different!
// Request for user456 to Server 2 = Cache Miss!

// ✅ STATELESS (Can scale horizontally)
class StatelessUserService {
  async getUser(id: string): Promise<User> {
    // Always fetch from shared store
    return this.redis.get(`user:${id}`) || 
           db.user.findUnique({ where: { id } });
  }
}

// Request goes to any server = Same result
```

### Strategy 2: Load Balancing

```typescript
// Load Balancer Configuration
class LoadBalancerConfig {
  // 1. Round Robin - Distribute equally
  roundRobin(servers: Server[], request: Request): Server {
    const index = request.id.hashCode() % servers.length;
    return servers[index];
  }
  
  // 2. Least Connections - Send to least busy server
  leastConnections(servers: Server[], request: Request): Server {
    return servers.reduce((min, server) => 
      server.activeConnections < min.activeConnections ? server : min
    );
  }
  
  // 3. IP Hash - Same client always goes to same server (for sessions)
  ipHash(servers: Server[], clientIp: string): Server {
    const index = clientIp.hashCode() % servers.length;
    return servers[index];
  }
  
  // 4. Weighted - Powerful servers get more requests
  weighted(servers: Server[], request: Request): Server {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) return server;
    }
    
    return servers[0];
  }
}
```

### Strategy 3: Session Management in Distributed Systems

```typescript
// ❌ PROBLEM: Sessions stored in server memory
// Server 1: req1 → login → session stored in Server 1 memory
// Server 2: req2 (same user) → "session not found" → need to login again!

// ✅ SOLUTION 1: Sticky Sessions (IP Hash)
class StickySessionLoadBalancer {
  route(request: Request): Server {
    // Always send same client to same server
    const clientIp = request.clientIp;
    return this.ipHashSelector(clientIp);
  }
  
  // Problem: If server crashes, user loses session and must login again
}

// ✅ SOLUTION 2: Distributed Session Store (Redis)
class DistributedSessionService {
  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = generateId();
    
    // Store in Redis (shared across all servers)
    await redis.setex(
      `session:${sessionId}`,
      3600, // 1 hour expiry
      JSON.stringify({
        userId,
        level: data.level,
        permissions: data.permissions,
        createdAt: new Date()
      })
    );
    
    return sessionId;
  }
  
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async validateSession(sessionId: string): Promise<boolean> {
    return (await redis.exists(`session:${sessionId}`)) > 0;
  }
}

// ✅ SOLUTION 3: JWT Tokens (No server state needed)
class JWTSessionService {
  createToken(userId: string, level: string): string {
    return jwt.sign(
      { userId, level, iat: Date.now() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
  
  validateToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
  
  // Advantage: No session store needed! Completely stateless!
  // Disadvantage: Can't revoke token immediately (until expiry)
}

// Mix strategies: JWT for main auth + Redis for revocation list
class HybridSessionService {
  async isTokenRevoked(tokenId: string): Promise<boolean> {
    return await redis.exists(`revoked_token:${tokenId}`) > 0;
  }
  
  async revokeToken(tokenId: string): Promise<void> {
    await redis.setex(`revoked_token:${tokenId}`, 3600, '1');
  }
}
```

### Strategy 4: Database Connection Pooling

```typescript
// ❌ PROBLEM: Each request opens a new DB connection
// 1000 concurrent requests = 1000 DB connections (exhausts database)

// ✅ SOLUTION: Connection Pool
class DatabaseConnectionPool {
  private pool: ConnectionPool;
  
  constructor() {
    this.pool = new ConnectionPool({
      host: 'db.example.com',
      max: 20, // Maximum 20 connections
      min: 5,  // Keep 5 warm
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }
  
  async query<T>(sql: string, params: any[]): Promise<T[]> {
    const connection = await this.pool.acquire();
    
    try {
      return await connection.query(sql, params);
    } finally {
      this.pool.release(connection); // Return to pool
    }
  }
}

// With Prisma (handles pooling automatically)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `${DATABASE_URL}?connection_limit=20`
    }
  }
});
```

## 3. Scaling Architecture

```typescript
// Multi-layered architecture
class ScalableArchitecture {
  
  // Layer 1: CDN & Caching (Global)
  // → Serve static assets from edge locations
  
  // Layer 2: Load Balancer
  // → Distribute traffic across multiple App Servers
  private loadBalancer: LoadBalancer;
  
  // Layer 3: API Servers (Stateless, horizontal scaling)
  // → Multiple instances, can scale up/down dynamically
  private apiServers: ApiServer[];
  
  // Layer 4: Cache Layer (Redis)
  // → Shared session, cache, rate limiting
  private redis: Redis;
  
  // Layer 5: Database (Primary + Replicas)
  // → Write to primary, read from replicas
  private primaryDb: Database;
  private readReplicas: Database[];
  
  // Layer 6: Message Queue (async processing)
  // → Decouple services, handle spikes
  private messageQueue: MessageQueue;
  
  async handleRequest(request: Request): Promise<Response> {
    // 1. Load balancer routes to available server
    const server = this.loadBalancer.selectServer();
    
    // 2. Server processes request (no local state)
    return server.handleRequest(request);
  }
  
  async query<T>(sql: string, type: 'read' | 'write'): Promise<T> {
    if (type === 'write') {
      // Write to primary database
      return this.primaryDb.query(sql);
    } else {
      // Read from replica (random selection)
      const replica = this.readReplicas[
        Math.floor(Math.random() * this.readReplicas.length)
      ];
      return replica.query(sql);
    }
  }
}
```

## 4. Handling Uneven Load

```typescript
class AutoScaling {
  async monitorAndScale(metrics: Metrics): Promise<void> {
    // Check CPU, memory, request queue
    if (metrics.cpuUsage > 80 || metrics.requestQueueLength > 100) {
      // Scale UP - add more servers
      await this.spinUpNewServer();
    } else if (metrics.cpuUsage < 20 && metrics.requestQueueLength < 10) {
      // Scale DOWN - remove excess servers
      await this.terminateServer();
    }
  }
  
  private async spinUpNewServer(): Promise<void> {
    // Using Docker
    const container = await docker.run('myapp:latest', {
      env: ['NODE_ENV=production'],
      ports: ['3000:3000']
    });
    
    // Register with load balancer
    await this.loadBalancer.addServer({
      host: container.ip,
      port: 3000,
      weight: 1
    });
  }
  
  private async terminateServer(): Promise<void> {
    // Gracefully shutdown least-loaded server
    const server = this.loadBalancer.selectLeastLoaded();
    await server.gracefulShutdown(); // Wait for requests to complete
    await this.loadBalancer.removeServer(server);
  }
}
```

## 5. Monitoring for Scale

```typescript
class ScaleMonitoring {
  async trackMetrics(): Promise<void> {
    setInterval(async () => {
      const metrics = {
        cpuUsage: os.cpus().reduce((sum, cpu) => 
          sum + (100 - (cpu.idle / (cpu.user + cpu.system + cpu.idle) * 100)), 0) / os.cpus().length,
        memoryUsage: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
        requestsPerSecond: this.trackingService.getRequestRate(),
        averageResponseTime: this.trackingService.getAverageLatency(),
        activeConnections: this.server.getActiveConnections(),
        queueLength: this.taskQueue.length
      };
      
      // Send to monitoring system
      await prometheus.pushMetrics(metrics);
      
      // Alert if issues
      if (metrics.cpuUsage > 90) {
        await alerting.sendAlert('High CPU usage on server');
      }
    }, 10000); // Every 10 seconds
  }
}
```

## 12. Practical Exercise

### Requirements
1. Build a load-balanced API
2. Implement stateless services
3. Use Redis for shared state
4. Create database read replicas
5. Add auto-scaling logic

### Structure

```typescript
class ScalableBackendAPI {
  async startServer(): Promise<void> {
    // TODO: Start API server (stateless)
  }
  
  async initializeLoadBalancer(): Promise<void> {
    // TODO: Configure load balancer with multiple servers
  }
  
  async setupRedisCluster(): Promise<void> {
    // TODO: Redis for sessions and caching
  }
  
  async createReadReplicas(): Promise<void> {
    // TODO: Database read replicas
  }
}
```

---

## Next Lesson

Continue to [Distributed Systems Basics](03-distributed-systems-basics.md)
