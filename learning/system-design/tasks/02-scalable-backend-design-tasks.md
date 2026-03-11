# Tasks — Scalable Backend Design

Easy
- Make one endpoint stateless: move session state to JWT and document changes.

Medium
- Add basic horizontal scaling test: run two instances locally and load-balance with `nginx` or `http-proxy`.

Hard
- Design and implement sticky vs stateless session comparison with benchmarks.

Hints
- Use Docker to spin multiple instances for testing.