# Liskov Substitution Principle (LSP)

> "Objects of a superclass should be replaceable with objects of a subclass without breaking the application."

## 1. Concept Overview

LSP states that if class B is a subtype of class A, then objects of type A can be replaced with objects of type B without altering the correctness of the program. In simpler terms: **subtypes must be substitutable for their base types**.

**Key Rule:** When you inherit from a class or implement an interface, you must fulfill the **contract** established by the parent. You can't weaken preconditions or strengthen postconditions.

## 2. Core Principles

### Violations of LSP

```typescript
// ❌ VIOLATES LSP
class Bird {
  fly(): void {
    console.log('Flying...');
  }
}

class Penguin extends Bird {
  fly(): void {
    throw new Error('Penguins cannot fly!'); // Breaks contract!
  }
}

// This breaks when we use abstraction
function makeBirdFly(bird: Bird) {
  bird.fly(); // Throws error if bird is a Penguin!
}

makeBirdFly(new Bird());    // Works
makeBirdFly(new Penguin()); // ERROR! LSP violated
```

### Following LSP

```typescript
// ✅ FOLLOWS LSP
interface Flyable {
  fly(): void;
}

interface Swimmable {
  swim(): void;
}

class Eagle implements Flyable {
  fly(): void {
    console.log('Eagle flies high');
  }
}

class Penguin implements Swimmable {
  swim(): void {
    console.log('Penguin swims');
  }
}

// Now each class fulfills its contract
function makeCreatureFly(creature: Flyable) {
  creature.fly(); // Always works with Flyable
}

makeCreatureFly(new Eagle()); // ✅ Works
// makeCreatureFly(new Penguin()); // ✅ Compile error - Penguin doesn't implement Flyable
```

## 3. Real-World Examples

### Example 1: Payment Processing

```typescript
// ❌ VIOLATES LSP
abstract class PaymentProcessor {
  abstract processPayment(amount: number): Promise<void>;
  abstract refund(amount: number): Promise<void>;
}

class CreditCardProcessor extends PaymentProcessor {
  async processPayment(amount: number): Promise<void> {
    // Process credit card payment
  }
  
  async refund(amount: number): Promise<void> {
    // Refund to credit card
  }
}

class GiftCardProcessor extends PaymentProcessor {
  async processPayment(amount: number): Promise<void> {
    // Process gift card payment
  }
  
  async refund(amount: number): Promise<void> {
    throw new Error('Gift cards cannot be refunded!'); // VIOLATION!
  }
}

// ✅ FOLLOWS LSP - Separate interfaces
interface PaymentProcessor {
  processPayment(amount: number): Promise<void>;
}

interface RefundablePayment extends PaymentProcessor {
  refund(amount: number): Promise<void>;
}

class CreditCardProcessor implements RefundablePayment {
  async processPayment(amount: number): Promise<void> {
    // Process payment
  }
  
  async refund(amount: number): Promise<void> {
    // Refund
  }
}

class GiftCardProcessor implements PaymentProcessor {
  async processPayment(amount: number): Promise<void> {
    // Process payment (no refund method)
  }
}

// Service uses appropriate interface
class PaymentService {
  async processPayment(processor: PaymentProcessor, amount: number): Promise<void> {
    await processor.processPayment(amount);
  }
  
  async processRefundablePayment(
    processor: RefundablePayment,
    amount: number,
    refundAmount: number
  ): Promise<void> {
    await processor.processPayment(amount);
    
    if (refundAmount > 0) {
      await processor.refund(refundAmount); // Always works!
    }
  }
}
```

### Example 2: Repository Pattern

```typescript
// ❌ VIOLATES LSP
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  create(data: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

class ReadOnlyRepository<T> implements Repository<T> {
  async findById(id: string): Promise<T | null> {
    // Implementation
    return null;
  }
  
  async create(data: T): Promise<T> {
    throw new Error('Read-only repository!'); // VIOLATION!
  }
  
  async update(id: string, data: Partial<T>): Promise<T> {
    throw new Error('Read-only repository!'); // VIOLATION!
  }
  
  async delete(id: string): Promise<void> {
    throw new Error('Read-only repository!'); // VIOLATION!
  }
}

// ✅ FOLLOWS LSP - Separate interfaces
interface ReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findMany(filter?: any): Promise<T[]>;
}

interface WriteRepository<T> {
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

interface FullRepository<T> extends ReadRepository<T>, WriteRepository<T> {}

class ReadOnlyTaskRepository implements ReadRepository<Task> {
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
  
  async findMany(filter?: any): Promise<Task[]> {
    return await db.task.findMany(filter);
  }
}

class FullTaskRepository implements FullRepository<Task> {
  async findById(id: string): Promise<Task | null> {
    return await db.task.findUnique({ where: { id } });
  }
  
  async findMany(filter?: any): Promise<Task[]> {
    return await db.task.findMany(filter);
  }
  
  async create(data: Partial<Task>): Promise<Task> {
    return await db.task.create({ data });
  }
  
  async update(id: string, data: Partial<Task>): Promise<Task> {
    return await db.task.update({ where: { id }, data });
  }
  
  async delete(id: string): Promise<void> {
    await db.task.delete({ where: { id } });
  }
}

// Service uses appropriate interface
class TaskQueryService {
  constructor(private repo: ReadRepository<Task>) {} // Read-only!
  
  async getTask(id: string): Promise<Task | null> {
    return await this.repo.findById(id);
  }
}

class TaskMutationService {
  constructor(private repo: WriteRepository<Task>) {} // Write-only!
  
  async createTask(data: Partial<Task>): Promise<Task> {
    return await this.repo.create(data);
  }
}
```

### Example 3: Notification Channels

```typescript
// ❌ VIOLATES LSP
interface NotificationChannel {
  send(userId: string, message: string, attachments: File[]): Promise<void>;
}

class EmailChannel implements NotificationChannel {
  async send(userId: string, message: string, attachments: File[]): Promise<void> {
    // Send email with attachments
  }
}

class SMSChannel implements NotificationChannel {
  async send(userId: string, message: string, attachments: File[]): Promise<void> {
    if (attachments.length > 0) {
      throw new Error('SMS does not support attachments!'); // VIOLATION!
    }
    // Send SMS
  }
}

// ✅ FOLLOWS LSP - Proper abstraction
interface NotificationChannel {
  send(userId: string, message: string): Promise<void>;
}

interface AttachmentSupport {
  sendWithAttachments(userId: string, message: string, attachments: File[]): Promise<void>;
}

class EmailChannel implements NotificationChannel, AttachmentSupport {
  async send(userId: string, message: string): Promise<void> {
    await this.sendEmail(userId, message, []);
  }
  
  async sendWithAttachments(userId: string, message: string, attachments: File[]): Promise<void> {
    await this.sendEmail(userId, message, attachments);
  }
  
  private async sendEmail(userId: string, message: string, attachments: File[]): Promise<void> {
    // Implementation
  }
}

class SMSChannel implements NotificationChannel {
  async send(userId: string, message: string): Promise<void> {
    // Send SMS (no attachments)
  }
}

// Service uses correct interface
class NotificationService {
  async sendNotification(channel: NotificationChannel, userId: string, message: string): Promise<void> {
    await channel.send(userId, message); // Always works!
  }
  
  async sendWithAttachments(
    channel: NotificationChannel & AttachmentSupport,
    userId: string,
    message: string,
    attachments: File[]
  ): Promise<void> {
    await channel.sendWithAttachments(userId, message, attachments); // Only works with channels that support it
  }
}
```

## 4. LSP Rules

### Rule 1: Preconditions cannot be strengthened

```typescript
// ❌ VIOLATES LSP
class UserService {
  createUser(email: string): void {
    // Requires valid email
  }
}

class AdminUserService extends UserService {
  createUser(email: string): void {
    if (!email.endsWith('@company.com')) {
      throw new Error('Admin must use company email'); // Strengthened precondition!
    }
    super.createUser(email);
  }
}

// ✅ FOLLOWS LSP
interface UserCreator {
  createUser(email: string): void;
}

class StandardUserCreator implements UserCreator {
  createUser(email: string): void {
    // Create with any valid email
  }
}

class AdminUserCreator implements UserCreator {
  createUser(email: string): void {
    // Same precondition: just needs valid email
    // But sets admin flag internally
  }
}
```

### Rule 2: Postconditions cannot be weakened

```typescript
// ❌ VIOLATES LSP
interface TaskRepository {
  create(data: Partial<Task>): Promise<Task>; // Postcondition: Always returns Task
}

class BrokenTaskRepository implements TaskRepository {
  async create(data: Partial<Task>): Promise<Task> {
    // Sometimes returns null - VIOLATES postcondition!
    return null as any;
  }
}

// ✅ FOLLOWS LSP
class ProperTaskRepository implements TaskRepository {
  async create(data: Partial<Task>): Promise<Task> {
    const task = await db.task.create({ data });
    return task; // Always returns Task
  }
}
```

## 12. Practical Exercise

### Task: Fix LSP Violations in Document System

**Given (Violates LSP):**

```typescript
abstract class Document {
  abstract save(): Promise<void>;
  abstract share(userId: string): Promise<void>;
  abstract archive(): Promise<void>;
}

class TextDocument extends Document {
  async save(): Promise<void> {
    // Save text document
  }
  
  async share(userId: string): Promise<void> {
    // Share document
  }
  
  async archive(): Promise<void> {
    // Archive document
  }
}

class TemplateDocument extends Document {
  async save(): Promise<void> {
    throw new Error('Templates cannot be modified!'); // VIOLATION!
  }
  
  async share(userId: string): Promise<void> {
    throw new Error('Templates are public!'); // VIOLATION!
  }
  
  async archive(): Promise<void> {
    // Archive template
  }
}
```

**Your Task:**
1. Identify all LSP violations
2. Create proper interface hierarchy
3. Implement separate interfaces for different capabilities
4. Ensure all implementations fulfill their contracts
5. Update service layer to use appropriate interfaces

**Success Criteria:**
- ✅ No method throws "not supported" errors
- ✅ Interfaces represent true capabilities
- ✅ Subtypes are fully substitutable
- ✅ Clear separation of read/write operations

---

## Next Lesson

Continue to [Interface Segregation Principle](04-interface-segregation-principle.md)

---

**Remember:** Subtypes must fulfill the contracts of their base types. Don't break expectations!
