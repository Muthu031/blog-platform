# Tasks — Hash Maps

Easy
- Implement a simple frequency counter for strings; write unit tests.

Medium
- Build a LRU cache with `get`/`set` APIs and TTL support.

Hard
- Implement a concurrent-safe in-memory hashmap with expiring keys and eviction.

Hints
- For LRU, use Map + double-linked list patterns. Starter: backend/src/shared/cache/simple-lru.ts