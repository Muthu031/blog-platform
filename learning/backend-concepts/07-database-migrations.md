# Database Migrations - Managing Schema Changes Safely

> Run safe migrations in production without downtime

## 1. Core Concepts

### Migration Challenges

```
Problem: You need to add column to tasks table serving 100+ customers
Can't lock table (10,000 concurrent reads/writes)
Can't take downtime (SLA requires 99.99% uptime)
Can't lose data (critical business records)

Solution: Zero-downtime migration strategy
```

## 2. Real-World Applications

### Example 1: Large Table Migration

```sql
-- ❌ DANGEROUS: Locks entire table during migration
ALTER TABLE tasks ADD COLUMN priority INT DEFAULT 0;
-- Can take hours for large tables!

-- ✅ SAFE: Add column with default, backfill separately
-- Step 1: Add column (non-blocking)
ALTER TABLE tasks ADD COLUMN priority INT DEFAULT 0;

-- Step 2: Backfill in batches (non-blocking)
BEGIN;
UPDATE tasks
SET priority = 1
WHERE id IN (
  SELECT id FROM tasks
  WHERE updated_at < now() - interval '1 day'
  LIMIT 10000
);
COMMIT;

-- Repeat until all rows backfilled
-- Run multiple times in parallel with different ranges
```

### Example 2: Prisma Migrations

```typescript
// Generate migration
npx prisma migrate dev --name add_task_priority

// This creates: prisma/migrations/{timestamp}_add_task_priority/migration.sql
ALTER TABLE "tasks" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

// Deploy to production
npx prisma migrate deploy

// Verify migration
npx prisma migrate status
```

### Example 3: Backward Compatible Changes

```typescript
// GOOD: Add new column with default
// Old code continues working
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;

// BAD: Rename column (breaks existing code)
ALTER TABLE users RENAME COLUMN email_address TO email;
// Now old code looking for email_address breaks!

// GOOD Alternative: Add new column, keep old, migrate data
ALTER TABLE users ADD COLUMN email VARCHAR(255);
UPDATE users SET email = email_address WHERE email IS NULL;
-- Keep email_address for compatibility during transition period
-- Remove in next release after all clients updated
```

### Example 4: Data Migration Pattern

```typescript
class DataMigrationService {
  async migrateUserEmails(): Promise<void> {
    const batchSize = 1000;
    let processed = 0;
    
    while (true) {
      // Only process rows that haven't been migrated
      const rows = await db.user.findMany({
        where: { new_email: null },
        take: batchSize
      });
      
      if (rows.length === 0) break;
      
      // Batch update
      const updates = rows.map(row => ({
        where: { id: row.id },
        data: { new_email: row.old_email }
      }));
      
      await Promise.all(updates.map(u => db.user.update(u)));
      
      processed += rows.length;
      console.log(`Migrated ${processed} rows...`);
      
      // Small delay to avoid overwhelming database
      await this.sleep(100);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Example 5: Index Strategy

```sql
-- ❌ SLOW: Creating index locks table during creation
CREATE INDEX CONCURRENTLY would not lock, BUT:
-- Old queries use old plan
-- New queries use new plan
-- Inconsistency during index creation

-- ✅ GOOD: Create index concurrently (PostgreSQL)
-- Does NOT lock table for writes
CREATE INDEX CONCURRENTLY idx_tasks_status ON tasks(status);

-- Verify index was created
SELECT * FROM pg_indexes WHERE tablename = 'tasks';

-- If something goes wrong, drop it
DROP INDEX CONCURRENTLY idx_tasks_status;
```

### Example 6: Foreign Key Changes

```sql
-- ❌ DANGEROUS: Adding foreign key constraint can fail if data is invalid
ALTER TABLE tasks
ADD CONSTRAINT fk_task_project
FOREIGN KEY (project_id) REFERENCES projects(id);
-- Fails if any task references non-existent project!

-- ✅ SAFE: Validate data first, then add constraint
-- Step 1: Add constraint as non-validated
ALTER TABLE tasks
ADD CONSTRAINT fk_task_project
FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID;

-- Step 2: Validate in background (doesn't lock table for new operations)
ALTER TABLE tasks
VALIDATE CONSTRAINT fk_task_project;

-- Step 3: Fix any invalid data before validation
DELETE FROM tasks WHERE project_id NOT IN (SELECT id FROM projects);

-- Alternative: Gradual rollout with feature flag
class TaskService {
  async create(data: CreateTaskData): Promise<Task> {
    // Validate project exists (application level)
    if (featureFlags.requireProjectForeignKey) {
      const project = await db.project.findUnique({
        where: { id: data.projectId }
      });
      
      if (!project) {
        throw new Error('Project not found');
      }
    }
    
    return db.task.create({ data });
  }
}
```

### Example 7: Rollback Strategy

```typescript
class MigrationRollback {
  async rollback(migrationName: string): Promise<void> {
    // List all migrations
    const migrations = await this.getMigrations();
    const targetIndex = migrations.findIndex(m => m.name === migrationName);
    
    if (targetIndex === -1) {
      throw new Error('Migration not found');
    }
    
    // Rollback to previous state
    const previousMigration = migrations[targetIndex - 1];
    
    console.log(`Rolling back from ${migrationName} to ${previousMigration.name}`);
    
    // Run down migration
    await this.executeMigration(previousMigration.down);
    
    // Record rollback
    await db.migrationHistory.create({
      name: migrationName,
      status: 'rolled_back',
      rolledBackAt: new Date()
    });
  }
  
  async automaticRollback(): Promise<void> {
    // If error rate spikes after migration
    const metrics = await this.getMetrics();
    
    if (metrics.errorRate > 10) {
      const lastMigration = await this.getLastMigration();
      await this.rollback(lastMigration.name);
    }
  }
}
```

### Example 8: Multi-Step Migration Plan

```typescript
class ComplexMigration {
  // Scenario: Rename column from email_address to email_normalized
  // with automatic normalization
  
  async executeMultiStepMigration(): Promise<void> {
    // Phase 1: Add new column
    console.log('Phase 1: Adding new column...');
    await db.$executeRaw`
      ALTER TABLE users ADD COLUMN email_normalized VARCHAR(255);
    `;
    
    // Phase 2: Backfill data with transformation
    console.log('Phase 2: Backfilling data...');
    await this.backfillEmailsWithNormalization();
    
    // Phase 3: Deploy code that writes to both columns
    console.log('Phase 3: Deploy dual-write code...');
    // Code writes to both email_address and email_normalized
    // Reads from email_normalized (with fallback to email_address)
    
    // Phase 4: Verify data consistency
    console.log('Phase 4: Verifying consistency...');
    const inconsistencies = await this.checkDataConsistency();
    if (inconsistencies.length > 0) {
      throw new Error(`Data inconsistencies found: ${inconsistencies.length}`);
    }
    
    // Phase 5: Stop writing to old column
    console.log('Phase 5: Switching reads/writes...');
    // Deploy code that only writes to email_normalized
    
    // Phase 6: Remove old column (after safe period)
    console.log('Phase 6: Removing old column...');
    await this.sleep(7 * 24 * 60 * 60 * 1000); // Wait 7 days
    await db.$executeRaw`
      ALTER TABLE users DROP COLUMN email_address;
    `;
  }
  
  private async backfillEmailsWithNormalization(): Promise<void> {
    const batchSize = 10000;
    let offset = 0;
    
    while (true) {
      await db.$executeRaw`
        UPDATE users
        SET email_normalized = LOWER(TRIM(email_address))
        WHERE email_normalized IS NULL
        LIMIT ${batchSize}
      `;
      
      const updated = await db.$executeRaw`
        SELECT COUNT(*) as count FROM users WHERE email_normalized IS NULL
      `;
      
      if (updated[0].count === 0) break;
      
      offset += batchSize;
      await this.sleep(1000); // Rate limiting
    }
  }
}
```

## 3. Migration Validation

```typescript
class MigrationValidation {
  async validateMigration(): Promise<void> {
    console.log('Running pre-deployment validation...');
    
    // 1. Dry run migration
    console.log('1. Testing migration with dry run...');
    await this.runMigrationDryRun();
    
    // 2. Check table locks
    console.log('2. Checking for problematic locks...');
    const locks = await this.checkTableLocks();
    if (locks.length > 0) {
      throw new Error('Migration would cause table locks');
    }
    
    // 3. Estimate duration
    console.log('3. Estimating migration duration...');
    const duration = await this.estimateDuration();
    if (duration > 300000) { // 5 minutes
      console.warn('This migration might take > 5 minutes');
      console.warn('Consider running during maintenance window');
    }
    
    // 4. Verify rollback plan
    console.log('4. Verifying rollback is possible...');
    await this.testRollback();
    
    console.log('✓ Validation complete, safe to deploy');
  }
}
```

## 12. Practical Exercise

### Execute Safe Database Migration

**Requirements:**
1. Add new column without downtime
2. Backfill data progressively
3. Maintain backward compatibility
4. Rollback plan if needed
5. Validate data consistency

### Structure

```typescript
class SafeMigrationExe cute {
  async addNewColumnGradually(): Promise<void> {
    // TODO: Add column
    // TODO: Backfill in batches
    // TODO: Update code
    // TODO: Verify
    // TODO: Cleanup
  }
  
  async renameColumnSafely(): Promise<void> {
    // TODO: Add new column
    // TODO: Dual-write during transition
    // TODO: Migrate readers
    // TODO: Remove old column
  }
  
  async validateMigration(): Promise<void> {
    // TODO: Data consistency checks
  }
}
```

---

## Backend Concepts Complete

Congratulations! You now have comprehensive knowledge of:

✅ Performance Optimization  
✅ API Design & Best Practices  
✅ Security & Authentication  
✅ Testing Strategies  
✅ Monitoring & Observability  
✅ CI/CD & Deployment  
✅ Database Migrations  

**You're now ready to build production-grade SaaS platforms!**

---

## Full Curriculum Complete

You've mastered all 28 lessons across 4 major sections:

### ✅ Data Structures & Algorithms (9 lessons)
### ✅ SOLID Principles (5 lessons)
### ✅ System Design (7 lessons)
### ✅ Backend Concepts (7 lessons)

**Total:** 28 comprehensive lessons with production-ready code examples and practical exercises.

Next Steps:
1. Review and revisit lessons as needed
2. Apply these patterns to your Jira-like project
3. Practice on coding challenge platforms (LeetCode, HackerRank)
4. Read "Designing Data-Intensive Applications" for deeper understanding
5. Contribute to open-source projects using these patterns
