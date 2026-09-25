import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { loadStoredChat } from "../lib/chat-storage";

/** How often a page other than /chat checks the visitor's conversation for a new reply. */
const CHECK_EVERY_MS = 30_000;

/**
 * true when the visitor's website chat has a reply they haven't seen — typically an ERA team
 * member answering from the admin Inbox after the visitor left the chat page. Only runs for a
 * visitor who has chatted (a stored conversation key); /chat itself marks everything seen.
 */
export function useChatReplyDot(pathname: string) {
  const [hasReply, setHasReply] = useState(false);
  const onChat = pathname.startsWith("/chat");

  useEffect(() => {
    if (onChat) {
      setHasReply(false);
      return;
    }
    let cancelled = false;
    const check = () => {
      const stored = loadStoredChat();
      if (!stored || document.hidden) return;
      api.messaging.web.history
        .query({ token: stored.token, afterId: stored.lastSeenId })
        .then((r) => !cancelled && setHasReply(r.found && r.messages.some((m) => m.sender !== "user")))
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    // Hidden tabs skip the check; look again the moment the visitor comes back to this one.
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [onChat]);

  return hasReply;
}
