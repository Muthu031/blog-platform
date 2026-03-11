# Tasks — Event-Driven Architecture

Easy
- Publish a `task.created` event when a task is created; write a subscriber that logs it.

Medium
- Implement an eventual-consistent read model using event handlers and a denormalized table.

Hard
- Implement event sourcing for task lifecycle with replay tests.

Hints
- Use local Redis pub/sub or a simple event bus implementation.