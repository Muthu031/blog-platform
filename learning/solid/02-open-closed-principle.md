# Open/Closed Principle (OCP)

> "Software entities should be open for extension but closed for modification." - Bertrand Meyer

## 1. Concept Overview

The Open/Closed Principle states that your code should be designed so that you can add new functionality by **extending** it (adding new code), not by **modifying** existing code. This prevents bugs in tested, working code while allowing the system to grow.

As a senior engineer, you understand that OCP is about **polymorphism** and **abstraction**. Instead of using if/else statements or switch cases that require modification for each new feature, you design interfaces and abstract classes that can be extended with new implementations.

**Key Insight:** Every time you add a feature by modifying existing code, you risk breaking what already works. OCP says: add new code, don't change old code.

## 2. Core Principles

### OCP in Practice

**Closed for Modification:**
- Existing, tested code should not change
- Prevents regression bugs
- Maintains stability

**Open for Extension:**
- New features added through new classes
- Inheritance and composition
- Plugin architecture

### Bad Signs (Violating OCP)

```typescript
// ❌ Adding features requires modifying this function
function calculateTaskPriority(task: Task, type: string): number {
  if (type === 'urgent') {
    return 10;
  } else if (type === 'high') {
    return 8;
  } else if (type === 'medium') {
    return 5;
  } else if (type === 'low') {
    return 2;
  }
  // Every new priority type requires modifying this function!
}
```

### Good Design (Following OCP)

```typescript
// ✅ New priority strategies can be added without modifying existing code
interface PriorityStrategy {
  calculate(task: Task): number;
}

class UrgentPriorityStrategy implements PriorityStrategy {
  calculate(task: Task): number {
    return 10;
  }
}

class HighPriorityStrategy implements PriorityStrategy {
  calculate(task: Task): number {
    return 8;
  }
}

// Add new strategies without changing existing code
class CriticalPriorityStrategy implements PriorityStrategy {
  calculate(task: Task): number {
    return 15;
  }
}
```

## 3. Why This Matters in Real Systems

### Large SaaS Platforms Use OCP For:

**1. Plugin Systems**
- Notion: Page blocks (text, image, table, etc.) added without modifying core
- Shopify: Apps extend functionality without changing Shopify code
- WordPress: Plugins add features without core modifications

**2. Payment Providers**
- Stripe, PayPal, Square can be added as new implementations
- No modification to checkout logic

**3. Notification Channels**
- Email, SMS, Push, Slack can be added independently
- Core notification service remains unchanged

**4. Authentication Providers**
- Google, GitHub, Email/Password, SAML
- Add new providers without touching auth core

## 4. Practical Example in My Multi-Tenant SaaS Project

### Scenario 1: Notification Channels (Following OCP)

```typescript
// ======= Bad Approach (Violates OCP) =======
class NotificationService {
  async send(user: User, message: string, channel: string) {
    if (channel === 'email') {
      // Email logic
      await sendEmail(user.email, message);
    } else if (channel === 'sms') {
      // SMS logic
      await sendSMS(user.phone, message);
    } else if (channel === 'push') {
      // Push logic
      await sendPush(user.deviceToken, message);
    }
    // Adding Slack requires modifying this function!
  }
}

// ======= Good Approach (Follows OCP) =======

// 1. Define abstraction
interface NotificationChannel {
  send(user: User, message: string): Promise<void>;
}

// 2. Implement concrete channels
class EmailChannel implements NotificationChannel {
  constructor(private emailService: EmailService) {}
  
  async send(user: User, message: string): Promise<void> {
    await this.emailService.sendEmail(user.email, 'Notification', message);
  }
}

class SMSChannel implements NotificationChannel {
  constructor(private smsService: SMSService) {}
  
  async send(user: User, message: string): Promise<void> {
    if (!user.phone) return;
    await this.smsService.sendSMS(user.phone, message);
  }
}

class PushChannel implements NotificationChannel {
  constructor(private pushService: PushService) {}
  
  async send(user: User, message: string): Promise<void> {
    if (!user.deviceToken) return;
    await this.pushService.sendPush(user.deviceToken, message);
  }
}

// 3. Adding Slack requires NO modification to existing code
class SlackChannel implements NotificationChannel {
  constructor(private slackService: SlackService) {}
  
  async send(user: User, message: string): Promise<void> {
    if (!user.slackUserId) return;
    await this.slackService.sendMessage(user.slackUserId, message);
  }
}

// 4. Notification service is CLOSED for modification
class NotificationService {
  private channels: Map<string, NotificationChannel> = new Map();
  
  registerChannel(name: string, channel: NotificationChannel) {
    this.channels.set(name, channel);
  }
  
  async send(user: User, message: string, channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Unknown channel: ${channelName}`);
    }
    await channel.send(user, message);
  }
  
  async sendToAll(user: User, message: string): Promise<void> {
    await Promise.all(
      Array.from(this.channels.values()).map(channel =>
        channel.send(user, message)
      )
    );
  }
}

// 5. Registration (typically in bootstrap/setup file)
const notificationService = new NotificationService();
notificationService.registerChannel('email', new EmailChannel(emailService));
notificationService.registerChannel('sms', new SMSChannel(smsService));
notificationService.registerChannel('push', new PushChannel(pushService));
notificationService.registerChannel('slack', new SlackChannel(slackService));
```

### Scenario 2: Export Formats (PDF, CSV, Excel)

```typescript
// Define export interface
interface DataExporter {
  export(data: any[]): Promise<Buffer>;
  getContentType(): string;
  getFileExtension(): string;
}

// CSV Exporter
class CSVExporter implements DataExporter {
  async export(data: any[]): Promise<Buffer> {
    const csv = this.convertToCSV(data);
    return Buffer.from(csv);
  }
  
  getContentType(): string {
    return 'text/csv';
  }
  
  getFileExtension(): string {
    return 'csv';
  }
  
  private convertToCSV(data: any[]): string {
    // CSV conversion logic
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    return `${headers}\n${rows}`;
  }
}

// PDF Exporter
class PDFExporter implements DataExporter {
  async export(data: any[]): Promise<Buffer> {
    // Use PDF library
    return await this.generatePDF(data);
  }
  
  getContentType(): string {
    return 'application/pdf';
  }
  
  getFileExtension(): string {
    return 'pdf';
  }
  
  private async generatePDF(data: any[]): Promise<Buffer> {
    // PDF generation logic
    return Buffer.from(''); // Placeholder
  }
}

// Excel Exporter (NEW - no modification to existing code!)
class ExcelExporter implements DataExporter {
  async export(data: any[]): Promise<Buffer> {
    return await this.generateExcel(data);
  }
  
  getContentType(): string {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  
  getFileExtension(): string {
    return 'xlsx';
  }
  
  private async generateExcel(data: any[]): Promise<Buffer> {
    // Excel generation logic
    return Buffer.from(''); // Placeholder
  }
}

// Export service (CLOSED for modification)
class ExportService {
  private exporters: Map<string, DataExporter> = new Map();
  
  registerExporter(format: string, exporter: DataExporter) {
    this.exporters.set(format, exporter);
  }
  
  async export(data: any[], format: string): Promise<{
    buffer: Buffer;
    contentType: string;
    extension: string;
  }> {
    const exporter = this.exporters.get(format);
    
    if (!exporter) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    const buffer = await exporter.export(data);
    
    return {
      buffer,
      contentType: exporter.getContentType(),
      extension: exporter.getFileExtension()
    };
  }
}

// Controller
class ExportController {
  constructor(
    private exportService: ExportService,
    private taskService: TaskService
  ) {}
  
  async exportTasks(req: Request, res: Response) {
    const { projectId } = req.params;
    const { format = 'csv' } = req.query;
    
    const tasks = await this.taskService.getProjectTasks(
      projectId,
      req.user.organizationId
    );
    
    const exported = await this.exportService.export(tasks, format as string);
    
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tasks.${exported.extension}"`
    );
    
    res.send(exported.buffer);
  }
}
```

### Scenario 3: Payment Providers

```typescript
// Payment provider interface
interface PaymentProvider {
  processPayment(amount: number, currency: string, metadata: any): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<RefundResult>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  message?: string;
}

interface RefundResult {
  success: boolean;
  refundId: string;
  message?: string;
}

// Stripe implementation
class StripePaymentProvider implements PaymentProvider {
  constructor(private stripeClient: Stripe) {}
  
  async processPayment(amount: number, currency: string, metadata: any): Promise<PaymentResult> {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: amount * 100, // Stripe uses cents
        currency,
        metadata
      });
      
      return {
        success: true,
        transactionId: paymentIntent.id
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        message: error.message
      };
    }
  }
  
  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    const refund = await this.stripeClient.refunds.create({
      payment_intent: transactionId,
      amount: amount * 100
    });
    
    return {
      success: true,
      refundId: refund.id
    };
  }
}

// PayPal implementation (NEW - no changes to existing code!)
class PayPalPaymentProvider implements PaymentProvider {
  constructor(private paypalClient: any) {}
  
  async processPayment(amount: number, currency: string, metadata: any): Promise<PaymentResult> {
    // PayPal-specific logic
    const order = await this.paypalClient.createOrder({
      amount,
      currency,
      metadata
    });
    
    return {
      success: true,
      transactionId: order.id
    };
  }
  
  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    const refund = await this.paypalClient.refundPayment({
      orderId: transactionId,
      amount
    });
    
    return {
      success: true,
      refundId: refund.id
    };
  }
}

// Payment service (CLOSED for modification)
class PaymentService {
  constructor(private provider: PaymentProvider) {}
  
  async processSubscription(
    userId: string,
    amount: number
  ): Promise<PaymentResult> {
    const result = await this.provider.processPayment(
      amount,
      'usd',
      { userId, type: 'subscription' }
    );
    
    if (result.success) {
      await this.recordPayment(userId, amount, result.transactionId);
    }
    
    return result;
  }
  
  private async recordPayment(userId: string, amount: number, transactionId: string) {
    await db.payment.create({
      data: {
        userId,
        amount,
        transactionId,
        status: 'completed'
      }
    });
  }
}

// Dependency injection allows switching providers
const paymentService = new PaymentService(
  new StripePaymentProvider(stripeClient)
  // OR new PayPalPaymentProvider(paypalClient)
);
```

## 5. Backend Architecture Implementation

### Complete Plugin System Example

```typescript
// ======= Plugin Interface =======
interface TaskValidationPlugin {
  name: string;
  validate(task: Partial<Task>): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ======= Core Plugins =======

class TitleValidationPlugin implements TaskValidationPlugin {
  name = 'title-validator';
  
  validate(task: Partial<Task>): ValidationResult {
    const errors: string[] = [];
    
    if (!task.title) {
      errors.push('Title is required');
    } else if (task.title.length > 200) {
      errors.push('Title must be 200 characters or less');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

class DueDateValidationPlugin implements TaskValidationPlugin {
  name = 'due-date-validator';
  
  validate(task: Partial<Task>): ValidationResult {
    const errors: string[] = [];
    
    if (task.dueDate && task.dueDate < new Date()) {
      errors.push('Due date cannot be in the past');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ======= Custom Plugin (EXTENSION) =======

class ProfanityValidationPlugin implements TaskValidationPlugin {
  name = 'profanity-validator';
  private profanityList = ['bad', 'word', 'censored'];
  
  validate(task: Partial<Task>): ValidationResult {
    const errors: string[] = [];
    
    const text = `${task.title} ${task.description || ''}`.toLowerCase();
    
    for (const word of this.profanityList) {
      if (text.includes(word)) {
        errors.push(`Content contains inappropriate language`);
        break;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ======= Validation Service (CLOSED) =======

class TaskValidationService {
  private plugins: TaskValidationPlugin[] = [];
  
  registerPlugin(plugin: TaskValidationPlugin) {
    this.plugins.push(plugin);
  }
  
  async validate(task: Partial<Task>): Promise<ValidationResult> {
    const allErrors: string[] = [];
    
    for (const plugin of this.plugins) {
      const result = plugin.validate(task);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }
    
    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

// ======= Setup (registration) =======

const validationService = new TaskValidationService();
validationService.registerPlugin(new TitleValidationPlugin());
validationService.registerPlugin(new DueDateValidationPlugin());
validationService.registerPlugin(new ProfanityValidationPlugin()); // NEW!

// ======= Usage in Service =======

class TaskService {
  constructor(private validationService: TaskValidationService) {}
  
  async createTask(data: Partial<Task>): Promise<Task> {
    // All plugins run automatically
    const validation = await this.validationService.validate(data);
    
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
    
    // Create task
    return await db.task.create({ data });
  }
}
```

## 6. Production-Quality Code Example

See Section 5 above for complete production example.

## 7. Database Perspective

OCP applies to database design through **table inheritance** patterns:

```sql
-- Base table
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Specific notification types (extension, not modification)
CREATE TABLE email_notifications (
  notification_id UUID PRIMARY KEY REFERENCES notifications(id),
  email_address VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE sms_notifications (
  notification_id UUID PRIMARY KEY REFERENCES notifications(id),
  phone_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL
);

-- Adding new type doesn't modify existing tables
CREATE TABLE push_notifications (
  notification_id UUID PRIMARY KEY REFERENCES notifications(id),
  device_token VARCHAR(255) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL
);
```

## 8. Common Developer Mistakes

### ❌ Mistake 1: if/else or switch for extensibility

```typescript
// BAD: Requires modification for each new type
function sendNotification(type: string, data: any) {
  if (type === 'email') {
    sendEmail(data);
  } else if (type === 'sms') {
    sendSMS(data);
  } else if (type === 'push') {
    sendPush(data);
  }
  // Adding Slack requires modifying this function
}

// GOOD: New types are new classes
interface Notifier {
  send(data: any): void;
}

class EmailNotifier implements Notifier {
  send(data: any) { sendEmail(data); }
}

class SMSNotifier implements Notifier {
  send(data: any) { sendSMS(data); }
}

// Add new without modifying existing
class SlackNotifier implements Notifier {
  send(data: any) { sendSlack(data); }
}
```

### ❌ Mistake 2: Hard-coded implementations

```typescript
// BAD: Hard-coded dependencies
class PaymentService {
  processPayment() {
    const stripe = new Stripe(apiKey); // Hard-coded!
    return stripe.charge();
  }
}

// GOOD: Abstraction allows extension
class PaymentService {
  constructor(private provider: PaymentProvider) {}
  
  processPayment() {
    return this.provider.charge();
  }
}
```

## 9. Senior Engineer Thinking

### When to Apply OCP

**Apply OCP when:**
- ✅ You expect variations of a behavior (payment providers, export formats)
- ✅ You're building plugin systems
- ✅ You have conditional logic that grows over time
- ✅ Multiple implementations of the same concept exist

**Don't over-engineer with OCP when:**
- ❌ There's only one implementation and unlikely to change
- ❌ The feature is temporary or experimental
- ❌ Premature abstraction adds unnecessary complexity

### Strategy Pattern vs Plugin Pattern

```typescript
// Strategy: Choose ONE implementation at runtime
class TaskService {
  constructor(private priorityStrategy: PriorityStrategy) {}
}

// Plugin: Run MULTIPLE implementations
class ValidationService {
  constructor(private plugins: ValidationPlugin[]) {}
}
```

## 10. Performance and Scalability Impact

### Benefits

**1. Hot-swapping implementations**
```typescript
// Can switch payment providers without restarting
paymentService.setProvider(new PayPalProvider());
```

**2. A/B testing**
```typescript
// Different implementations for different users
const notifier = user.experimentGroup === 'A' 
  ? new FastNotifier() 
  : new DetailedNotifier();
```

**3. Feature flags**
```typescript
const exporters = [
  new CSVExporter(),
  new PDFExporter(),
  ...(featureFlags.excelExport ? [new ExcelExporter()] : [])
];
```

## 11. Interview Perspective

**Q: "Explain Open/Closed Principle with an example"**

**Answer:** "OCP means code should be open for extension but closed for modification. For example, instead of adding if/else statements for each payment provider, I'd create a PaymentProvider interface. Stripe, PayPal, and Square each implement this interface. Adding a new provider doesn't require changing existing code - just create a new implementation. This prevents bugs in tested code and makes the system more maintainable."

**Q: "How do you implement OCP in TypeScript?"**

**Answer:** "I use interfaces and dependency injection. Define an interface for the behavior, create implementations, and inject them into classes. Strategy pattern for single implementations, plugin pattern for multiple. This allows adding features by adding new classes, not modifying existing ones."

## 12. Practical Exercise

### Task: Build an extensible Activity Logger System

**Requirements:**
1. Create ActivityLogger interface
2. Implement DatabaseLogger (logs to database)
3. Implement FileLogger (logs to files)
4. Implement ConsoleLogger (logs to console)
5. Create LoggerService that supports multiple loggers
6. Add filters (info, warn, error levels)
7. Make it easy to add new loggers without modifying existing code

**Solution Structure:**

```typescript
interface ActivityLogger {
  log(level: string, message: string, metadata?: any): Promise<void>;
}

class DatabaseLogger implements ActivityLogger {
  async log(level: string, message: string, metadata?: any): Promise<void> {
    // TODO: Implement
  }
}

class FileLogger implements ActivityLogger {
  async log(level: string, message: string, metadata?: any): Promise<void> {
    // TODO: Implement
  }
}

class LoggerService {
  private loggers: ActivityLogger[] = [];
  
  registerLogger(logger: ActivityLogger) {
    this.loggers.push(logger);
  }
  
  async log(level: string, message: string, metadata?: any) {
    await Promise.all(
      this.loggers.map(logger => logger.log(level, message, metadata))
    );
  }
}
```

**Success Criteria:**
- ✅ Adding new loggers doesn't modify existing code
- ✅ Multiple loggers can run simultaneously
- ✅ Each logger is independent and testable
- ✅ Easy to enable/disable loggers

## 13. Advanced Learning Extension

### Decorator Pattern for Extension

```typescript
// Base logger
interface Logger {
  log(message: string): Promise<void>;
}

class BasicLogger implements Logger {
  async log(message: string): Promise<void> {
    console.log(message);
  }
}

// Decorators extend without modifying
class TimestampLoggerDecorator implements Logger {
  constructor(private logger: Logger) {}
  
  async log(message: string): Promise<void> {
    const timestamped = `[${new Date().toISOString()}] ${message}`;
    await this.logger.log(timestamped);
  }
}

class ErrorHandlingLoggerDecorator implements Logger {
  constructor(private logger: Logger) {}
  
  async log(message: string): Promise<void> {
    try {
      await this.logger.log(message);
    } catch (error) {
      console.error('Logging failed:', error);
    }
  }
}

// Usage: Compose decorators
const logger = new ErrorHandlingLoggerDecorator(
  new TimestampLoggerDecorator(
    new BasicLogger()
  )
);
```

---

## Next Lesson

Continue to [Liskov Substitution Principle](03-liskov-substitution-principle.md)

---

**Remember:** Design for extension, not modification. Use abstractions to make your code adaptable!
