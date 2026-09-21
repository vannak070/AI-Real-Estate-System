# ERA — AI Integrated Real Estate System

Real estate platform for Cambodia with its own CRM, inventory, and sales — no
external ERP.

```
apps/client          customer website (React 18 + Vite)      :5173
apps/admin           back-office SPA                          :5174
apps/api             split-ready modular monolith backend     :4000
packages/contracts   versioned event & command schemas
packages/shared      ids, logger
packages/api-client  typed client for @era/api (REST now, tRPC later)
packages/ui          shared React primitives
packages/mock-data   TEMPORARY shared fixtures for both SPAs
packages/theme       shared brand tokens (theme.css)
```

`client` and `admin` are separate Vite apps / deployments, each rooted at `/`,
cross-linking by URL. pnpm workspace + Turborepo.

## Quickstart

```bash
# pnpm 9 (pinned via packageManager). If pnpm isn't on PATH:
#   corepack enable                                        # or, without sudo:
#   corepack enable --install-directory ~/.local/bin pnpm

pnpm install
cp .env.example .env                       # DATABASE_URL already points at the compose Postgres below
docker compose up -d postgres              # era-postgres on :5435 (docker-compose.yml)
pnpm --filter @era/api prisma:generate     # before api typecheck / dev
pnpm --filter @era/api prisma:migrate
pnpm --filter @era/api db:seed             # optional demo data

pnpm client      # :5173      pnpm admin   # :5174      pnpm api   # :4000
pnpm typecheck   # turbo → tsc --noEmit, every package
pnpm lint        # turbo → eslint
pnpm build       # turbo → vite build
```

### Access from another device on your LAN

Both SPAs bind `0.0.0.0` (`server.host: true` in their `vite.config.ts`) and the
api already listened on `0.0.0.0`, so all three are reachable from your phone
or another computer on the same network at `http://<this-machine's-LAN-IP>:5173`
/ `:5174` / `:4000` — Vite prints the exact "Network:" URL when it starts.
`VITE_CLIENT_URL`/`VITE_API_BASE_URL` are left unset on purpose so the admin
app derives cross-links from `window.location.hostname` instead of a hardcoded
`localhost`, and the api's CORS in development accepts any private-network
origin on :5173/:5174 (see `apps/api/src/platform/cors.ts`) — nothing to
reconfigure when your LAN IP changes. (macOS may prompt to allow incoming
connections the first time — allow it, or LAN devices can't reach the port.)

## Docs

- [`CLAUDE.md`](CLAUDE.md) — repo overview for AI agents and new contributors
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — backend module boundaries, event bus, the reservation saga
- [`apps/api/README.md`](apps/api/README.md) — backend module pattern + how to extract a service
- [`apps/client/README.md`](apps/client/README.md) · [`apps/admin/README.md`](apps/admin/README.md)
- [`claude/`](claude/README.md) — team task-spec workflow (feature / update / test files)
# AI-Real-Estate-System
