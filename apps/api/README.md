# Debugging the API

Quick steps to debug locally:

1. Ensure env: copy `.env.example` -> `.env` and add `JWT_SECRET` (e.g. `JWT_SECRET=devsecret`).
2. Generate Prisma client if using DB:
   ```bash
   pnpm -w -F @myorg/api prisma:generate
   ```
3. Start in debug mode (two options):
   - Using the npm script (recommended):
     ```bash
     pnpm -w -F @myorg/api run dev:debug
     ```
     This starts `ts-node-dev` under the Node inspector on port 9229.
   - Or launch directly from VS Code using the `Launch API (ts-node)` configuration.
4. In VS Code, set breakpoints (e.g. in `src/api/controllers/auth.ts`) and either attach with the `Attach to API (ts-node-dev)` config or use `Launch API (ts-node)`.
5. Test endpoints:
   ```bash
   curl -X POST http://localhost:8090/api/login -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"password"}'
   ```

Notes & tips:
- Ensure `apps/api/tsconfig.json` has `sourceMap: true` (so breakpoints map to .ts files).
- If the server doesn't hit breakpoints, try restarting and ensure the process is listening on port 9229 (inspect). `dev:debug` uses `--inspect-brk` which pauses on start until debugger attaches.
- Use `Attach` if you started with `dev:debug` in a terminal and want to attach the VS Code debugger afterwards.
