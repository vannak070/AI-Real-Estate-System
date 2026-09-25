import { createApiClient } from '@era/api-client';

// Production (deploy/): the web server forwards /trpc and /uploads to the API on the same address,
// so the build sets VITE_API_BASE_URL=same-origin. Dev: the API on :4000 of whatever host this is.
const configuredApi = import.meta.env.VITE_API_BASE_URL;
export const apiBaseUrl =
  configuredApi === 'same-origin' ? window.location.origin : configuredApi || `http://${window.location.hostname}:4000`;

export const api = createApiClient({ baseUrl: apiBaseUrl });

/** Uploaded-image paths come back as "/uploads/..." relative to the API — resolve to a full URL for <img src>. */
export function resolveUploadUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${apiBaseUrl}${pathOrUrl}`;
}
