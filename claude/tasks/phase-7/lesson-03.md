# Lesson 3: E2E Testing

## 🎯 Goal
Implement end-to-end tests that verify complete user workflows.

## 📚 What You'll Learn
- Set up Cypress or Playwright
- Create user flow tests
- Handle real browser interactions
- Test across browsers

## 📋 Prerequisites
- Completed Phase 7 Lessons 1-2
- Frontend application working
- Test server running

## 🛠️ Tasks

### 1. Install and Setup Cypress

```bash
npm install --save-dev cypress @testing-library/cypress
npx cypress open
```

### 2. Create E2E Test Suite

Create `frontend/cypress/e2e/authentication.cy.ts`:

```typescript
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('should register new user', () => {
    cy.get('[data-testid="signup-link"]').click();
    
    cy.get('[data-testid="email-input"]').type('newuser@example.com');
    cy.get('[data-testid="password-input"]').type('SecurePassword123');
    cy.get('[data-testid="confirm-password-input"]').type('SecurePassword123');
    
    cy.get('[data-testid="signup-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('contain', 'Welcome');
  });

  it('should login existing user', () => {
    cy.get('[data-testid="login-link"]').click();
    
    cy.get('[data-testid="email-input"]').type('existing@example.com');
    cy.get('[data-testid="password-input"]').type('Password123');
    
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/dashboard');
  });

  it('should handle invalid credentials', () => {
    cy.get('[data-testid="login-link"]').click();
    
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('WrongPassword');
    
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid credentials');
  });

  it('should logout user', () => {
    cy.loginAsUser('user@example.com', 'password');
    
    cy.get('[data-testid="user-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    cy.url().should('include', '/login');
  });
});
```

### 3. Create Task Management E2E Test

Create `frontend/cypress/e2e/tasks.cy.ts`:

```typescript
describe('Task Management', () => {
  beforeEach(() => {
    cy.loginAsUser('user@example.com', 'password');
    cy.visit('http://localhost:3000/projects/1/board');
  });

  it('should create new task', () => {
    cy.get('[data-testid="new-task-button"]').click();
    
    cy.get('[data-testid="task-title"]').type('New Task');
    cy.get('[data-testid="task-description"]').type('Task description');
    
    cy.get('[data-testid="save-task-button"]').click();
    
    cy.get('[data-testid="task-item"]').last().should('contain', 'New Task');
  });

  it('should drag and drop task', () => {
    cy.get('[data-testid="task-item"]').first().as('task');
    cy.get('[data-testid="column-done"]').as('doneColumn');
    
    cy.get('@task').trigger('dragstart');
    cy.get('@doneColumn').trigger('drop');
    
    cy.get('[data-testid="column-done"] [data-testid="task-item"]')
      .first()
      .should('contain', 'Task Title');
  });

  it('should assign task to team member', () => {
    cy.get('[data-testid="task-item"]').first().click();
    
    cy.get('[data-testid="assign-button"]').click();
    cy.get('[data-testid="team-member-option"]').first().click();
    
    cy.get('[data-testid="assignee-badge"]').should('be.visible');
  });

  it('should add comment to task', () => {
    cy.get('[data-testid="task-item"]').first().click();
    
    cy.get('[data-testid="comment-input"]').type('This is a comment');
    cy.get('[data-testid="add-comment-button"]').click();
    
    cy.get('[data-testid="comment"]').last().should('contain', 'This is a comment');
  });

  it('should update task status', () => {
    cy.get('[data-testid="task-item"]').first().click();
    
    cy.get('[data-testid="status-dropdown"]').click();
    cy.get('[data-testid="status-in-progress"]').click();
    
    cy.get('[data-testid="task-status"]').should('contain', 'In Progress');
  });
});
```

### 4. Create Custom Commands

Create `frontend/cypress/support/commands.ts`:

```typescript
Cypress.Commands.add('loginAsUser', (email: string, password: string) => {
  cy.visit('http://localhost:3000/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('include', '/dashboard');
});

Cypress.Commands.add('createProject', (name: string, slug: string) => {
  cy.visit('http://localhost:3000/projects');
  cy.get('[data-testid="new-project-button"]').click();
  cy.get('[data-testid="project-name-input"]').type(name);
  cy.get('[data-testid="project-slug-input"]').type(slug);
  cy.get('[data-testid="create-button"]').click();
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsUser(email: string, password: string): Chainable<void>;
      createProject(name: string, slug: string): Chainable<void>;
    }
  }
}

export {};
```

### 5. Configure Cypress

Create `frontend/cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: true,
    screenshotOnRunFailure: true
  }
});
```

### 6. Add E2E Test Scripts

Update `package.json`:

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:run:headed": "cypress run --headed",
    "e2e:test": "start-server-and-test 'npm run dev' http://localhost:3000 'npm run cy:run'",
    "e2e:test:headed": "start-server-and-test 'npm run dev' http://localhost:3000 'npm run cy:run:headed'"
  }
}
```

## ✅ Verification Checklist

- [ ] Cypress installed and configured
- [ ] Authentication tests pass
- [ ] Task management tests pass
- [ ] Drag and drop works
- [ ] Comments functionality tested
- [ ] Error scenarios covered
- [ ] Custom commands work
- [ ] Screenshots on failure
- [ ] Video recording works
- [ ] Cross-browser testing configured

## 📚 Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [E2E Testing Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cy Testing Library](https://testing-library.com/docs/cypress-testing-library/intro/)
