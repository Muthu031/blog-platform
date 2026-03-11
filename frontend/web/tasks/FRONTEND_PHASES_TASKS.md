# Frontend: Phased Task Breakdown (Phases & Lessons)

This document splits the frontend work into the existing phases and lessons (phase-1 → phase-7). Each lesson is described as a set of concrete tasks, deliverables, acceptance criteria, and an estimated effort range.

Notes
- Follow the project's existing lesson files located in `claude/tasks/phase-*` for reference and raw lesson content.
- Estimates are rough (hours); adjust per team velocity.

---

## Phase 1 — Project Setup & Core UI
Lessons: 1..7

- Lesson 1: Repo & Tooling
  - Tasks: initialize repo, add `frontend/web` scaffold, configure Vite, TypeScript, Tailwind, PostCSS, ESLint/Prettier, path aliases
  - Deliverable: working dev server, lint and format scripts, `README` quickstart
  - Acceptance: `npm run dev` starts, type-check passes, lint passes
  - Estimate: 6–12h

- Lesson 2: Base Layout & App Shell
  - Tasks: implement `AppLayout`, `Sidebar`, `Header`, responsive layout, routing skeleton
  - Deliverable: app shell with placeholder pages and navigation
  - Acceptance: navigation links work; layout responsive to widths
  - Estimate: 6–10h

- Lesson 3: UI Component Library (Part 1)
  - Tasks: implement `Button`, `Input`, `Card`, `Badge`, `Avatar`
  - Deliverable: curated UI components with stories/examples or small showcase page
  - Acceptance: components have variants, sizes and basic accessibility (labels/aria)
  - Estimate: 8–16h

- Lesson 4: Auth Pages (Login/Signup)
  - Tasks: create `LoginPage`, `SignupPage`, validation (react-hook-form + zod), notification UX
  - Deliverable: functional login/signup flows with mock API client
  - Acceptance: form validation works; navigating to protected route after login
  - Estimate: 6–12h

- Lesson 5: State Management & Stores
  - Tasks: setup Zustand stores (`auth`, `organization`, `project`, `board`, `task`, `notifications`), persistence config
  - Deliverable: typed stores with persist and devtools enabled
  - Acceptance: login updates store; store persists across reloads
  - Estimate: 4–8h

- Lesson 6: API Client & Services (Auth stubbed)
  - Tasks: implement central `apiClient` (axios), error handling, token injection, mock endpoints for auth
  - Deliverable: `services/api.ts` with typed methods used by pages
  - Acceptance: pages call client and handle responses and errors gracefully
  - Estimate: 6–10h

- Lesson 7: Basic Tests & CI Hooks
  - Tasks: add testing setup (Jest/Testing Library or Vitest), basic unit tests for components, pre-commit hooks
  - Deliverable: test scripts, sample tests, Husky/lint-staged config
  - Acceptance: `npm run test` runs; CI lint/test scripts included
  - Estimate: 6–12h

---

## Phase 2 — Projects & Boards Foundations
Lessons: 1..4

- Lesson 1: Projects List & CRUD
  - Tasks: `ProjectsListPage`, create/edit project forms, server integration hooks (`useProjects`, `useCreateProject`)
  - Deliverable: list page with search, create modal, inline actions
  - Acceptance: create/update/delete flows working with API or local store
  - Estimate: 8–16h

- Lesson 2: Project Details & Members
  - Tasks: `ProjectPage` with metadata, members list, invite flow
  - Deliverable: members UI and role assignment
  - Acceptance: member list displays and invite form triggers API call
  - Estimate: 6–12h

- Lesson 3: Board Data Model & Columns
  - Tasks: implement board model types, column CRUD, hooks `useBoardColumns`
  - Deliverable: column management UI (add, rename, reorder)
  - Acceptance: columns persist and reflect in board UI
  - Estimate: 6–12h

- Lesson 4: Board Page Initial UI
  - Tasks: `BoardPage` with 3 columns (To Do, In Progress, Done), basic task cards, drag-and-drop scaffolding
  - Deliverable: static dnd-enabled board and task card components
  - Acceptance: tasks draggable between columns (UI only), responsive layout
  - Estimate: 8–16h

---

## Phase 3 — Tasks & Task UX
Lessons: 1..4

- Lesson 1: Create / Edit Task Modal
  - Tasks: task form (title, description, assignee, priority, due date, labels), validations
  - Deliverable: reusable `TaskModal` used by board and project pages
  - Acceptance: form validates, sends create/update mutations
  - Estimate: 8–14h

- Lesson 2: Task Details & Comments
  - Tasks: task details panel, comments list, add/delete comment
  - Deliverable: comments support with optimistic updates
  - Acceptance: comments persist and UI updates on add/delete
  - Estimate: 8–14h

- Lesson 3: Task Metadata (labels, attachments)
  - Tasks: label creation, file attachments, preview handling
  - Deliverable: labels UI and basic attachment uploader
  - Acceptance: labels show on cards; attachments upload via API stub
  - Estimate: 6–12h

- Lesson 4: Task Filters & Search
  - Tasks: filtering sidebar, query param sync, saved filters
  - Deliverable: filters for status, assignee, priority; quick search
  - Acceptance: filters apply to task list and board view
  - Estimate: 6–12h

---

## Phase 4 — Collaboration & Notifications
Lessons: 1..4

- Lesson 1: Real-time Notifications (design + stub)
  - Tasks: notification center, toast system integration, placeholder WebSocket client
  - Deliverable: notification bell with list and toasts
  - Acceptance: notifications appear on actions and via stubbed socket
  - Estimate: 6–10h

- Lesson 2: Mentions & Activity Feed
  - Tasks: mention parsing, activity timeline on project/task
  - Deliverable: activity feed UI and mention highlights
  - Acceptance: activities recorded for create/update/delete
  - Estimate: 6–12h

- Lesson 3: Permissions & Roles
  - Tasks: implement role checks in UI, owner/admin/member flows, protected actions
  - Deliverable: UI shows/hides actions based on role
  - Acceptance: restricted actions inaccessible for non-owners
  - Estimate: 6–10h

- Lesson 4: Invite Flows & Accept/Decline
  - Tasks: invite by email, accept invite flow, organization switching
  - Deliverable: invite UI and onboarding for invited users
  - Acceptance: invite links lead to accept flow and organization set
  - Estimate: 8–14h

---

## Phase 5 — Polish, Performance & Accessibility
Lessons: 1..5

- Lesson 1: Accessibility Audit & Fixes
  - Tasks: keyboard nav, ARIA roles, focus management, color contrast
  - Deliverable: accessibility checklist completed and fixes applied
  - Acceptance: keyboard-first navigation, aria-labels present
  - Estimate: 6–12h

- Lesson 2: Performance Optimizations
  - Tasks: memoization, virtualization for lists, lazy loading, bundle analysis
  - Deliverable: critical optimizations and perf report
  - Acceptance: reduced TTI and bundle size improvements
  - Estimate: 8–16h

- Lesson 3: UX Polish (animations, microinteractions)
  - Tasks: small motion for drag/drop, hover states, loading skeletons
  - Deliverable: consistent microinteractions across app
  - Acceptance: smooth transitions and consistent design
  - Estimate: 6–12h

- Lesson 4: Cross-browser + Mobile QA
  - Tasks: test major browsers and devices, fix issues
  - Deliverable: bug list and fixes applied
  - Acceptance: app usable on Chrome/Firefox/Edge and mobile viewport
  - Estimate: 6–12h

- Lesson 5: End-to-end Tests
  - Tasks: add basic E2E (Playwright/Cypress) for happy paths (login, create project, create task)
  - Deliverable: E2E suite with CI integration
  - Acceptance: E2E passes in CI
  - Estimate: 8–16h

---

## Phase 6 — Integrations & Advanced Features
Lessons: 1..5

- Lesson 1: External Integrations (e.g., Slack, Webhooks)
  - Tasks: send webhooks on key events, Slack notifications skeleton
  - Deliverable: integration config UI + backend hooks (stubbed)
  - Acceptance: integration triggers observed in dev
  - Estimate: 8–14h

- Lesson 2: Import/Export (CSV, JSON)
  - Tasks: export projects/tasks, import CSV mapping UI
  - Deliverable: export button and import modal
  - Acceptance: sample import works with provided mapping
  - Estimate: 6–12h

- Lesson 3: Advanced Board Features
  - Tasks: swimlanes, WIP limits, column permissions
  - Deliverable: toggles for advanced board options
  - Acceptance: features toggle and persist per-board
  - Estimate: 8–16h

- Lesson 4: Analytics & Reporting
  - Tasks: basic charts (tasks by status, velocity), export reports
  - Deliverable: dashboard charts component
  - Acceptance: charts show aggregated data and time filters
  - Estimate: 8–14h

- Lesson 5: Offline & Sync Considerations
  - Tasks: outline offline strategy (service worker, sync), implement caching for core reads
  - Deliverable: design doc and minimal caching layer
  - Acceptance: reads work offline for recent data
  - Estimate: 8–16h

---

## Phase 7 — Launch Prep & Enterprise Features
Lessons: 1..5

- Lesson 1: Enterprise Onboarding & SSO
  - Tasks: SAML/OIDC integration design, enterprise settings pages
  - Deliverable: SSO integration spec and admin UI stubs
  - Acceptance: admin UI complete and SSO flow documented
  - Estimate: 10–20h (design + integration)

- Lesson 2: Data Export & Compliance
  - Tasks: data retention, exports, deletion flow
  - Deliverable: compliance pages and export API hooks
  - Acceptance: admin can request/export/delete data
  - Estimate: 8–16h

- Lesson 3: Audit Logs & Admin Tools
  - Tasks: audit logs UI, activity search, admin impersonation (design)
  - Deliverable: admin dashboard for audit and troubleshooting
  - Acceptance: logs searchable and exportable
  - Estimate: 8–16h

- Lesson 4: Scalability & Multi-region Considerations
  - Tasks: caching, CDN, image storage strategy, region-aware endpoints
  - Deliverable: ops doc and config options
  - Acceptance: rollout plan and CDN config documented
  - Estimate: 8–16h

- Lesson 5: Final QA & Launch Checklist
  - Tasks: final regression, release notes, rollback plan, monitoring setup (Sentry, metrics)
  - Deliverable: launch checklist and final signoff
  - Acceptance: checklist complete, monitoring active
  - Estimate: 8–24h

---

## How to use this plan
- Pick a phase and work sequentially through lessons, or parallelize lessons across team members.
- Track each lesson as a work item in your issue tracker with the acceptance criteria above.
- Reference existing lesson content in `claude/tasks/phase-*` for deep lesson notes.

If you want, I can:
- Create one markdown file per phase under `frontend/web/tasks/phase-*` and populate them with these lesson tasks and links to `claude/tasks` files.
- Export these as GitHub issues (title + body) for automatic import.

Which of those would you like next?  
