# SpeedyGo Admin Web

React + TypeScript + Vite application for SpeedyGo operations.

GitHub: https://github.com/zedclay/speedygo_admin_web.git

This app consumes backend APIs and realtime contracts. It must never independently calculate authoritative financial values.

## Stack

- React + TypeScript + Vite
- React Router
- TanStack Query
- Zustand (small UI state only)
- React Hook Form + Zod
- TanStack Table
- Socket.IO Client

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend HTTP API |
| `VITE_WS_URL` | Socket.IO namespace |

Vite 8 warns if Node is older than 20.19. This machine has 20.17.0; `pnpm build` still succeeds. Prefer Node 20.19+ or 22.12+ when possible.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Typecheck + production build |
| `pnpm lint` | Oxlint |
| `pnpm preview` | Preview production build |
