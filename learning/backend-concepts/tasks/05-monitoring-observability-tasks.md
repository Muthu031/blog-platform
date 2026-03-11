# Tasks — Monitoring & Observability

Easy
- Add structured logs (json) for one critical endpoint and test log format.

Medium
- Add Prometheus metrics for request latency and error rates; expose `/metrics`.

Hard
- Add distributed tracing spans around a multi-service call and visualize in Jaeger.

Hints
- Use `winston`/`pino` and `opentelemetry` starter code.