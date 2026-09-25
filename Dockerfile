# Production image for the whole system — see deploy/README.md.
#   target "api" — the backend (runs pending database migrations, then starts)
#   target "web" — Caddy serving both websites and forwarding API calls to "api"

FROM node:22-bookworm-slim AS base
# openssl: Prisma's query engine needs it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @era/api exec prisma generate
# The websites call the API on their own address (Caddy forwards /trpc and /uploads), so one
# build works on an IP address today and on a domain later.
ARG VITE_API_BASE_URL=same-origin
# The back office's "Customer Website" link.
ARG VITE_CLIENT_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL VITE_CLIENT_URL=$VITE_CLIENT_URL
RUN pnpm --filter @era/client build && pnpm --filter @era/admin build

FROM build AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 4000
# Apply any new migrations (safe to repeat), then start. Never runs the demo seed.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && exec node --import tsx src/main.ts"]

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/client/dist /srv/client
COPY --from=build /app/apps/admin/dist /srv/admin
