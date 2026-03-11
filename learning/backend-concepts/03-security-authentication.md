# Security & Authentication - Protecting Your SaaS Platform

> Implement OAuth 2.0, RBAC, and prevent common vulnerabilities

## 1. Core Concepts

### Security Principle: Defense in Depth

```
Multiple layers of security:
1. Network layer - SSL/TLS encryption
2. Application layer - Authentication, Authorization
3. Database layer - Encryption at rest, RLS
4. Secrets layer - Environment variables, key management
5. Monitoring layer - Audit logs, intrusion detection
```

## 2. Real-World Applications

### Example 1: JWT Authentication

```typescript
class JWTAuthService {
  // Issue token on login
  async issueToken(user: User): Promise<{ token: string; refreshToken: string }> {
    const token = jwt.sign(
      {
        sub: user.id, // Subject (user ID)
        email: user.email,
        org: user.organizationId,
        role: user.role,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Store refresh token (for revocation)
    await db.refreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    
    return { token, refreshToken };
  }
  
  // Verify token on each request
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
      
      // Check if token is revoked
      const isRevoked = await redis.exists(`revoked_token:${token}`);
      if (isRevoked) {
        throw new Error('Token revoked');
      }
      
      return payload;
    } catch (error) {
      throw new UnauthorizedError('Invalid token');
    }
  }
  
  // Refresh token
  async refreshToken(refreshToken: string): Promise<string> {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET) as TokenPayload;
    
    // Check if refresh token exists
    const stored = await db.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    
    if (!stored) {
      throw new UnauthorizedError('Refresh token not found');
    }
    
    // Issue new access token
    return jwt.sign(
      { sub: payload.sub },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
}
```

### Example 2: RBAC (Role-Based Access Control)

```typescript
enum Role {
  ADMIN = 'admin',
  MANAGER = 'manager',
  MEMBER = 'member',
  GUEST = 'guest'
}

interface Permission {
  resource: string;
  action: string; // create, read, update, delete
}

const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    { resource: 'task', action: '*' },
    { resource: 'project', action: '*' },
    { resource: 'user', action: '*' },
    { resource: 'organization', action: '*' }
  ],
  [Role.MANAGER]: [
    { resource: 'task', action: 'create' },
    { resource: 'task', action: 'read' },
    { resource: 'task', action: 'update' },
    { resource: 'project', action: 'read' },
    { resource: 'user', action: 'read' }
  ],
  [Role.MEMBER]: [
    { resource: 'task', action: 'read' },
    { resource: 'task', action: 'update' }, // Own tasks
    { resource: 'project', action: 'read' }
  ],
  [Role.GUEST]: [
    { resource: 'task', action: 'read' }
  ]
};

class RBACService {
  canAccess(user: User, resource: string, action: string): boolean {
    const permissions = RolePermissions[user.role];
    
    return permissions.some(p =>
      p.resource === resource && (p.action === '*' || p.action === action)
    );
  }
  
  // Middleware to check permissions
  requirePermission(resource: string, action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      
      if (!this.canAccess(user, resource, action)) {
        throw new ForbiddenError(`Missing permission: ${resource}:${action}`);
      }
      
      next();
    };
  }
}

// Usage
router.post(
  '/tasks',
  authMiddleware,
  rbac.requirePermission('task', 'create'),
  taskController.create
);
```

### Example 3: Row-Level Security (Data Isolation)

```typescript
// Ensure users only see their organization's data
class RowLevelSecurity {
  // Middleware to set organization context
  setOrganizationContext(req: Request, res: Response, next: NextFunction): void {
    req.organizationId = req.user.organizationId;
    next();
  }
  
  // Prisma middleware to auto-filter by organization
  async enforceRLS(): Promise<void> {
    prisma.$use(async (params, next) => {
      const organizationId = req.organizationId;
      
      // Auto-add organization filter for certain models
      if (['task', 'project', 'activity'].includes(params.model.toLowerCase())) {
        if (params.action === 'findUnique') {
          // Need to add organization check
          const result = await next(params);
          
          if (result && result.organizationId !== organizationId) {
            throw new ForbiddenError('Access denied');
          }
          
          return result;
        }
        
        if (params.action.startsWith('find')) {
          params.where = { ...params.where, organizationId };
        }
      }
      
      return next(params);
    });
  }
}
```

### Example 4: OAuth 2.0 with Google

```typescript
import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';

class OAuthService {
  setupGoogleOAuth(): void {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: 'http://localhost:3000/auth/google/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Find or create user
            let user = await db.user.findUnique({
              where: { googleId: profile.id }
            });
            
            if (!user) {
              // Create new user
              user = await db.user.create({
                data: {
                  email: profile.emails[0].value,
                  name: profile.displayName,
                  googleId: profile.id,
                  organizationId: '...', // Auto-join org or create
                  role: 'member'
                }
              });
            }
            
            done(null, user);
          } catch (error) {
            done(error);
          }
        }
      )
    );
  }
}
```

### Example 5: Prevention of Common Vulnerabilities

```typescript
class SecurityVulnerabilities {
  // 1. SQL Injection Prevention
  async getSafeUser(userId: string): Promise<User | null> {
    // ❌ BAD: Vulnerable to SQL injection
    // db.raw(`SELECT * FROM users WHERE id = '${userId}'`)
    
    // ✅ GOOD: Parameterized query
    return db.user.findUnique({
      where: { id: userId }
    });
  }
  
  // 2. XSS (Cross-Site Scripting) Prevention
  class XSSPrevention {
    // ❌ BAD: Trust user input
    // res.send(`<h1>${req.body.title}</h1>`);
    
    // ✅ GOOD: Sanitize or use templating
    const sanitizedTitle = sanitizeHtml(req.body.title);
    res.json({ title: sanitizedTitle });
  }
  
  // 3. CSRF (Cross-Site Request Forgery) Protection
  csrfProtection(req: Request, res: Response, next: NextFunction): void {
    const csrfToken = req.session.csrfToken || generateToken();
    req.session.csrfToken = csrfToken;
    
    // For POST/PUT/DELETE, check CSRF token
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const tokenFromRequest = req.body._csrf || req.headers['x-csrf-token'];
      
      if (tokenFromRequest !== csrfToken) {
        throw new ForbiddenError('CSRF token invalid');
      }
    }
    
    next();
  }
  
  // 4. Password Hashing
  async hashPassword(password: string): Promise<string> {
    // ✅ Use bcrypt (never store plain passwords!)
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // 5. Secret Management
  // ✅ Never commit secrets to git
  // Use environment variables or secret manager
  const dbPassword = process.env.DB_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;
}
```

## 3. TLS/SSL Encryption

```typescript
class HTTPSSetup {
  async setupSSL(app: Express): Promise<void> {
    const fs = require('fs');
    const https = require('https');
    
    const credentials = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
    
    https.createServer(credentials, app).listen(443);
  }
}
```

## 12. Practical Exercise

### Build a Secure Authentication System

**Requirements:**
1. Implement JWT authentication
2. Add RBAC with role-based endpoints
3. Enforce row-level security
4. Prevent SQL injection
5. CSRF protection
6. Password hashing

### Structure

```typescript
class SecureAuthenticationSystem {
  async implementJWT(): Promise<void> {
    // TODO: Issue and verify tokens
  }
  
  async implementRBAC(): Promise<void> {
    // TODO: Role-based permissions
  }
  
  async enforceDataIsolation(): Promise<void> {
    // TODO: Row-level security
  }
  
  async preventVulnerabilities(): Promise<void> {
    // TODO: SQL injection, XSS, CSRF prevention
  }
}
```

---

## Next Lesson

Continue to [Testing Strategies](04-testing-strategies.md)
