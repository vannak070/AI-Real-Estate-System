/**
 * The conversation itself lives on the server (so the ERA team sees it in their Inbox and can
 * reply); this browser keeps only its key. localStorage, so a visitor who comes back later — even
 * days later — finds the conversation, and any reply from the team, waiting. The customer layout
 * reads the same key to show a "new reply" dot (useChatReplyDot).
 */
const CHAT_STORAGE_KEY = 'era-chat-v2';

export interface StoredChat {
  /** Opaque conversation key from the server — never parsed here. */
  token: string;
  propertyId?: string;
  propertyName?: string;
  /** The newest message this visitor has seen, for the "new reply" dot. */
  lastSeenId?: string;
}

export function loadStoredChat(): StoredChat | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredChat) : null;
    return parsed && typeof parsed.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredChat(state: StoredChat | null) {
  try {
    if (state) localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(CHAT_STORAGE_KEY);
    // The old, browser-only chat — superseded by the server-stored one.
    sessionStorage.removeItem('era-chat-session-v1');
  } catch {
    // Private browsing / disabled storage — the chat still works, it just won't be there next visit.
  }
}
