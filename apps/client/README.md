# @era/client — customer website

Public-facing React + Vite SPA: home, property search, property detail, AI chat,
about. Runs on **:5173**.

```bash
npm install      # or, from the repo root once pnpm is set up: pnpm install
npm run dev
```

- Routes are rooted at `/` (see `src/app/routes.tsx`), wrapped by `CustomerLayout`.
- This is public-only — there is no link into the back office (`@era/admin`).
- Data still comes from `@era/mock-data`; brand tokens from `@era/theme`.
