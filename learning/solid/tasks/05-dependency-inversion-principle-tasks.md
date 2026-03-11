# Tasks — Dependency Inversion Principle (DIP)

Easy
- Replace a `new`-instantiated dependency with constructor injection in one service.

Medium
- Introduce an interface and inject two different implementations for testing vs production.

Hard
- Implement a simple DI container to manage bindings and lifetimes for core services.

Hints
- Use `tsyringe` or `inversify` patterns as inspiration.