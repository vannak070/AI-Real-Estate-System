/**
 * Typed client for @era/api. Wraps `@trpc/client` against the live `AppRouter`
 * type exported from `apps/api` — no code generation, no drift: change a
 * procedure's input/output in the api and this client (and every call site)
 * fails to typecheck until it's updated.
 *
 * Usage (per app):
 *   const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL });
 *   const me = await api.auth.me.query();
 *   const leads = await api.crm.leads.list.query();
 */
import { createTRPCClient, httpBatchLink, TRPCClientError, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '@era/api/trpc';

export interface ApiClientOptions {
  baseUrl: string;
}

export type ApiClient = TRPCClient<AppRouter>;

export function createApiClient(opts: ApiClientOptions): ApiClient {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${opts.baseUrl}/trpc`,
        // the session lives in an httpOnly cookie — always send it
        fetch(url, init) {
          return fetch(url, { ...init, credentials: 'include' });
        },
      }),
    ],
  });
}

export type { AppRouter };
export { TRPCClientError };
