# @era/admin — back office

Internal React + Vite SPA: dashboard, leads, AI agents, analytics, inventory,
manage-about, settings. Runs on **:5174**.

```bash
npm install      # or, from the repo root once pnpm is set up: pnpm install
npm run dev
```

- Routes are rooted at `/` (see `src/app/routes.tsx`), wrapped by `AdminLayout`
  — there is no `/admin` prefix; this is its own deployment.
- The "Customer Website" link points at `VITE_CLIENT_URL` (the separate
  `@era/client` app), default `http://localhost:5173`.
- Data still comes from `@era/mock-data`; brand tokens from `@era/theme`.
- This app has **no auth yet** — add a route guard in `AdminLayout` when the
  backend session is wired.
