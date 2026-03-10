# Lesson 1: Unit Testing

## 🎯 Goal
Implement comprehensive unit tests for backend services and utilities.

## 📚 What You'll Learn
- Write unit tests with Jest
- Test services and utilities
- Mock external dependencies
- Measure code coverage

## 📋 Prerequisites
- Completed Phase 6
- Jest configured
- Basic testing knowledge

## 🛠️ Tasks

### 1. Create Unit Tests for Services

Create `backend/src/services/__tests__/auth.test.ts`:

```typescript
import { hashPassword, verifyPassword, generateToken } from '../auth';

describe('Auth Service', () => {
  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'password123';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'password123';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'password123';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword('wrongpassword', hashed);

      expect(isValid).toBe(false);
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include payload in token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const token = generateToken(payload);

      // Decode token (don't verify for this test)
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });
  });
});
```

### 2. Create Tests for Utilities

Create `backend/src/shared/utils/__tests__/pagination.test.ts`:

```typescript
import { Pagination } from '../pagination';

describe('Pagination', () => {
  describe('parseParams', () => {
    it('should parse valid pagination params', () => {
      const result = Pagination.parseParams({ page: '2', limit: '25' });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('should use defaults for missing params', () => {
      const result = Pagination.parseParams({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should enforce min/max limits', () => {
      const result = Pagination.parseParams({ page: '0', limit: '200' });

      expect(result.page).toBe(1); // Min page is 1
      expect(result.limit).toBe(100); // Max limit is 100
    });
  });

  describe('getSkip', () => {
    it('should calculate correct skip value', () => {
      const skip = Pagination.getSkip(2, 20);
      expect(skip).toBe(20); // (2-1) * 20
    });

    it('should return 0 for first page', () => {
      const skip = Pagination.getSkip(1, 20);
      expect(skip).toBe(0);
    });
  });

  describe('paginate', () => {
    it('should return paginated response', async () => {
      const fetcher = jest.fn().mockResolvedValue([
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ]);
      const counter = jest.fn().mockResolvedValue(100);

      const result = await Pagination.paginate(fetcher, counter, 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should indicate last page', async () => {
      const fetcher = jest.fn().mockResolvedValue([
        { id: '1', name: 'Item 1' }
      ]);
      const counter = jest.fn().mockResolvedValue(21);

      const result = await Pagination.paginate(fetcher, counter, 2, 20);

      expect(result.pagination.hasMore).toBe(false);
    });
  });
});
```

### 3. Create Tests for Models

Create `backend/src/shared/types/__tests__/roles.test.ts`:

```typescript
import { Role, Permission, ROLE_PERMISSIONS } from '../roles';

describe('Roles and Permissions', () => {
  it('should have all roles defined', () => {
    expect(Role.OWNER).toBe('owner');
    expect(Role.ADMIN).toBe('admin');
    expect(Role.MEMBER).toBe('member');
    expect(Role.GUEST).toBe('guest');
  });

  it('should have permissions for all roles', () => {
    const roles = Object.values(Role);

    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role as Role]).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS[role as Role])).toBe(true);
    }
  });

  it('owner should have all permissions', () => {
    const ownerPerms = ROLE_PERMISSIONS[Role.OWNER];
    const allPerms = Object.values(Permission);

    for (const perm of allPerms) {
      expect(ownerPerms).toContain(perm);
    }
  });

  it('admin should have fewer permissions than owner', () => {
    const ownerPerms = ROLE_PERMISSIONS[Role.OWNER];
    const adminPerms = ROLE_PERMISSIONS[Role.ADMIN];

    expect(adminPerms.length).toBeLessThan(ownerPerms.length);
  });

  it('guest should have minimal permissions', () => {
    const guestPerms = ROLE_PERMISSIONS[Role.GUEST];

    expect(guestPerms.length).toBeLessThan(5);
  });
});
```

### 4. Run Tests with Coverage

Update `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage --collectCoverageFrom='src/**/*.ts' --coveragePathIgnorePatterns='node_modules|dist|__tests__'",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/__tests__/**/*.ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/index.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

## ✅ Verification Checklist

- [ ] Unit tests written for services
- [ ] Unit tests for utilities
- [ ] Tests for models and types
- [ ] All tests pass
- [ ] Code coverage > 80%
- [ ] Mocking works correctly
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] Coverage reports generated
- [ ] CI integration works

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Code Coverage](https://istanbul.js.org/)
