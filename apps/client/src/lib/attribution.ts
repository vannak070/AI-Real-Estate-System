/**
 * Ad-campaign attribution. Ads link to the site with `?utm_campaign=<campaign code>` (the code is
 * shown and copied in the back office's Campaigns page). We remember it for 30 days — a visitor
 * who clicks an ad today and enquires next week still counts — and the latest ad click wins.
 * The code is sent with website enquiries and AI-chat leads; the server links the lead to the
 * campaign (unknown codes are simply ignored). Storage can be unavailable (private browsing,
 * blocked cookies), so every access is guarded and the site works the same without it.
 */
const STORAGE_KEY = 'era-campaign';
const WINDOW_MS = 30 * 86_400_000;

export function captureCampaignFromUrl(search: string) {
  const code = new URLSearchParams(search).get('utm_campaign')?.trim().toLowerCase();
  if (!code || code.length > 80) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // storage unavailable — attribution just won't persist
  }
}

export function currentCampaignCode(): string | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const { code, at } = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof code !== 'string' || typeof at !== 'number' || Date.now() - at > WINDOW_MS) return undefined;
    return code;
  } catch {
    return undefined;
  }
}
