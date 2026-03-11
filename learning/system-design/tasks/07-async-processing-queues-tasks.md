# Tasks — Async Processing & Queues

Easy
- Enqueue an email-send job on task creation and write a simple worker to process it.

Medium
- Implement job retries, backoff, and a dead-letter queue for failed jobs.

Hard
- Implement a bulk-processing worker that batches writes for throughput optimization.

Hints
- Use `bull` or `bullmq` patterns like in `learning/system-design/07-async-processing-queues.md`.