# Tasks — Multi-Tenant Architecture

Easy
- Implement tenant middleware that reads `X-Org-Id` header and attaches `orgId` to request context.

Medium
- Implement a repository that enforces `orgId` scoping automatically (Prisma middleware suggested).

Hard
- Implement row-level security simulation with per-tenant DB connections and automated tests.

Hints
- Reference `learning/system-design/01-multi-tenant-architecture.md` and `backend/src/shared/middleware`.