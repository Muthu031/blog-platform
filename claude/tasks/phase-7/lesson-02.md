# Lesson 2: Integration Testing

## 🎯 Goal
Write integration tests that verify multiple components working together.

## 📚 What You'll Learn
- Set up integration test environment
- Test API endpoints
- Test database interactions
- Handle test databases

## 📋 Prerequisites
- Completed Phase 7 Lesson 1
- Unit tests working
- Test database available

## 🛠️ Tasks

### 1. Setup Integration Test Environment

Create `backend/src/__tests__/setup.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient();
  // Run migrations on test database
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      execution_time BIGINT NOT NULL,
      required_at TIMESTAMPTZ NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    )
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

### 2. Create API Integration Tests

Create `backend/src/modules/organizations/__tests__/organization.integration.test.ts`:

```typescript
import request from 'supertest';
import { app } from '../../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Organization API', () => {
  let userId: string;
  let token: string;
  let organizationId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed_password'
      }
    });
    userId = user.id;

    // Generate token (mock or use real logic)
    token = 'test-token-here';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  describe('POST /api/organizations', () => {
    it('should create organization', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Organization',
          slug: 'test-org',
          description: 'Test description'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Organization');

      organizationId = response.body.id;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Missing name and slug' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/organizations/:id', () => {
    it('should retrieve organization', async () => {
      const response = await request(app)
        .get(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(organizationId);
    });

    it('should return 404 for non-existent org', async () => {
      const response = await request(app)
        .get('/api/organizations/non-existent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/organizations/:id', () => {
    it('should update organization', async () => {
      const response = await request(app)
        .put(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Org Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Org Name');
    });
  });

  describe('DELETE /api/organizations/:id', () => {
    it('should delete organization', async () => {
      const response = await request(app)
        .delete(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      // Verify deleted
      const getResponse = await request(app)
        .get(`/api/organizations/${organizationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
```

### 3. Create Database Integration Tests

Create `backend/src/services/__tests__/prisma.integration.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

describe('Prisma Integration', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Organizations', () => {
    it('should create and retrieve organization', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          slug: 'test-org'
        }
      });

      const retrieved = await prisma.organization.findUnique({
        where: { id: org.id }
      });

      expect(retrieved?.name).toBe('Test Org');

      // Cleanup
      await prisma.organization.delete({ where: { id: org.id } });
    });

    it('should cascade delete related records', async () => {
      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          slug: 'test-org-cascade'
        }
      });

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          slug: 'test-project',
          organizationId: org.id
        }
      });

      // Delete org should cascade
      await prisma.organization.delete({ where: { id: org.id } });

      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id }
      });

      expect(deletedProject).toBeNull();
    });
  });

  describe('Relationships', () => {
    it('should handle organization members', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          password: 'hashed'
        }
      });

      const org = await prisma.organization.create({
        data: {
          name: 'Test Org',
          slug: 'test-org-members'
        }
      });

      const member = await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'admin'
        }
      });

      const retrieved = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: user.id
          }
        }
      });

      expect(retrieved?.role).toBe('admin');

      // Cleanup
      await prisma.organizationMember.delete({ where: { id: member.id } });
      await prisma.organization.delete({ where: { id: org.id } });
      await prisma.user.delete({ where: { id: user.id } });
    });
  });
});
```

## ✅ Verification Checklist

- [ ] Integration test environment set up
- [ ] API endpoint tests pass
- [ ] Database tests work
- [ ] Relationships verified
- [ ] Cleanup works properly
- [ ] Error cases tested
- [ ] Status codes validated
- [ ] Response bodies correct
- [ ] Data persistence verified
- [ ] Tests are isolated

## 📚 Resources

- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Integration Testing](https://martinfowler.com/bliki/IntegrationTest.html)
- [Database Testing](https://www.testcontainers.org/)
