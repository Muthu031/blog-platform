# Tasks — Open/Closed Principle (OCP)

Easy
- Add a new validation rule without modifying existing validator code (use strategy pattern).

Medium
- Extend `TaskPriority` handling with a new priority type using OCP-friendly extension.

Hard
- Design a plugin system for exporters (CSV/JSON/Third-party) that is open for extension but closed for modification.

Hints
- Use interfaces and DI patterns in `backend`.