import { createApiClient } from '@era/api-client';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:4000`;

export const api = createApiClient({ baseUrl: apiBaseUrl });

/** Uploaded-image paths come back as "/uploads/..." relative to the API — resolve to a full URL for <img src>. */
export function resolveUploadUrl(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${apiBaseUrl}${pathOrUrl}`;
}
