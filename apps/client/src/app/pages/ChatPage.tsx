import { useState, useRef, useEffect, Fragment, type KeyboardEvent, type ReactNode } from "react";
import { Send, Bot, User, MapPin, BedDouble, Ruler, Building2, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";
import { currentCampaignCode } from "../../lib/attribution";
import { loadStoredChat, saveStoredChat } from "../../lib/chat-storage";
import logo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";

type ServerMessage = Awaited<ReturnType<typeof api.messaging.web.send.mutate>>['messages'][number];

/** The property cards a bot reply can carry — exactly what the assistant's search_properties/
 * get_property tools returned server-side (see assistant.service.ts), never fabricated here. */
type AssistantProperty = ServerMessage['properties'][number];

interface Message {
  id: string;
  /** 'agent': an ERA staff member replying from the admin Inbox. */
  sender: 'user' | 'bot' | 'agent';
  message: string;
  agentName?: string | null;
  properties?: AssistantProperty[];
  /** Shown here only — never stored, and not part of the conversation (the greeting, errors). */
  local?: boolean;
  isError?: boolean;
}

const fromServer = (m: ServerMessage): Message => ({
  id: m.id,
  sender: m.sender,
  message: m.text,
  agentName: m.agentName,
  properties: m.properties.length > 0 ? m.properties : undefined,
});

/** How often an open chat checks for staff replies: often while the team has it, rarely otherwise. */
const POLL_WITH_TEAM_MS = 4_000;
const POLL_IDLE_MS = 15_000;

const TYPE_LABEL: Record<AssistantProperty['propertyType'], string> = {
  CONDO: 'Condo', HOUSE: 'House', VILLA: 'Villa', TOWNHOUSE: 'Townhouse',
  SHOPHOUSE: 'Shophouse', LAND: 'Land', BOREY: 'Borey', COMMERCIAL: 'Commercial',
};

/** Openers for an empty chat — the last one leads to the agent-callback flow (submit_lead). */
const STARTERS = [
  '2-bedroom condo for rent in BKK1',
  'Villas for sale in Siem Reap',
  'Land for sale under $100,000',
  "I'd like an agent to contact me",
];
const PROPERTY_STARTERS = ['What does it cost?', 'Which units are available?', "I'd like to book a viewing", 'Show me similar properties'];

function price(p: AssistantProperty) {
  if (p.startingPrice == null) return 'Price on request';
  return `$${p.startingPrice.toLocaleString()}${p.category === 'RENT' ? '/month' : ''}`;
}

/** "Studio", "2 bed", "1–3 bed" — null when the listing has no bedroom data. */
function bedsLabel(beds: number[]) {
  if (beds.length === 0) return null;
  const label = (n: number) => (n === 0 ? 'Studio' : `${n}`);
  if (beds.length === 1) return beds[0] === 0 ? 'Studio' : `${beds[0]} bed`;
  return `${label(beds[0]!)}–${beds[beds.length - 1]} bed`;
}

function sizeLabel(size: AssistantProperty['sizeSqm']) {
  if (!size) return null;
  const r = (n: number) => Math.round(n);
  return r(size.min) === r(size.max) ? `${r(size.min)} m²` : `${r(size.min)}–${r(size.max)} m²`;
}

/* ── Safe message formatting ──
 * The assistant may use **bold** and short "- " / "1. " lists. Rendered as React elements (never
 * HTML), so nothing in a reply can inject markup. */

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part.replace(/\*\*/g, '')}</Fragment>,
  );
}

function FormattedText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^#{1,6}\s+/, '');
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]!);
    } else {
      flush();
      if (line) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-2 break-words">{blocks}</div>;
}

/* ── Property cards ── */

function PropertyCard({ prop }: { prop: AssistantProperty }) {
  // `?? …`: cards stored by an older version of the chat lack these fields.
  const beds = bedsLabel(prop.bedrooms ?? []);
  const size = sizeLabel(prop.sizeSqm ?? null);
  return (
    <div className="flex w-60 flex-shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-[#EF2D2C] hover:shadow-md">
      <div className="relative h-32 bg-gray-100">
        {prop.imageUrls[0] ? (
          <ImageWithFallback src={resolveUploadUrl(prop.imageUrls[0])} alt={prop.name} className="h-full w-full object-cover" />
        ) : (
          // No photo on file — an honest placeholder, never a stock photo passed off as this property.
          <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
            <Building2 className="h-8 w-8" />
            <span className="mt-1 text-xs">Photo coming soon</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
          {prop.category === 'RENT' ? 'For rent' : 'For sale'} · {TYPE_LABEL[prop.propertyType]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">{prop.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{prop.location}</span>
        </div>
        <div className="mt-2 text-base font-bold" style={{ color: '#EF2D2C' }}>
          {price(prop)}
        </div>
        {(beds || size) && (
          <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
            {beds && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" /> {beds}
              </span>
            )}
            {size && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3.5 w-3.5" /> {size}
              </span>
            )}
          </div>
        )}
        <Link
          to={`/properties/${prop.id}`}
          className="mt-3 block rounded-lg px-3 py-2 text-center text-sm font-semibold text-white transition-all hover:shadow-md"
          style={{ backgroundColor: '#EF2D2C' }}
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

function greetingFor(propertyName?: string): Message {
  return {
    id: 'greeting',
    sender: 'bot',
    local: true,
    message: propertyName
      ? `Hello! 👋 I'm the ERA Cambodia AI Property Assistant. I see you're interested in **${propertyName}** — ask me anything about it: pricing, availability, or how to book a viewing.`
      : "Hello! 👋 I'm the ERA Cambodia AI Property Assistant. Tell me what you're looking for — to buy or rent, the area, your budget — and I'll find real listings for you, or connect you with our team.",
  };
}

export function ChatPage() {
  const location = useLocation();
  const propertyContext = location.state as { propertyId?: string; propertyName?: string } | null;

  // The visitor's conversation always resumes (with any reply the team left meanwhile) — even
  // from a property's "Chat about this property" link, which just moves the chat onto that
  // property, so a visitor the team is already talking to never loses the thread.
  const [initial] = useState(() => loadStoredChat());
  const [context, setContext] = useState<{ propertyId?: string; propertyName?: string }>({
    propertyId: propertyContext?.propertyId ?? initial?.propertyId,
    propertyName: propertyContext?.propertyId ? propertyContext.propertyName : initial?.propertyName,
  });
  const switchedProperty = !!initial && !!propertyContext?.propertyId && propertyContext.propertyId !== initial.propertyId;

  const [token, setToken] = useState<string | undefined>(initial?.token);
  const [messages, setMessages] = useState<Message[]>(() => [greetingFor(initial ? undefined : context.propertyName)]);
  const [restoring, setRestoring] = useState(!!initial);
  const [withTeam, setWithTeam] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isSending]);

  /** Adds server messages not shown yet (a poll can overlap a send). */
  const merge = (incoming: ServerMessage[]) =>
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id)).map(fromServer);
      return fresh.length ? [...prev, ...fresh] : prev;
    });

  const lastServerId = [...messages].reverse().find((m) => !m.local)?.id;

  // Remember the key, and the newest message seen (the layout's "new reply" dot compares to it).
  useEffect(() => {
    saveStoredChat(token ? { token, propertyId: context.propertyId, propertyName: context.propertyName, lastSeenId: lastServerId } : null);
  }, [token, context, lastServerId]);

  // A returning visitor: load the conversation from the server.
  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    api.messaging.web.history
      .query({ token: initial.token })
      .then((result) => {
        if (cancelled) return;
        if (!result.found) {
          setToken(undefined);
          return;
        }
        merge(result.messages);
        setWithTeam(result.withTeam);
        if (switchedProperty && context.propertyName) {
          setMessages((prev) => [
            ...prev,
            { id: 'property-switch', sender: 'bot', local: true, message: `You're now looking at **${context.propertyName}** — ask me anything about it.` },
          ]);
        }
      })
      .catch(() => {
        // Offline / server down — the visitor can still type; their next message resumes it.
      })
      .finally(() => !cancelled && setRestoring(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the conversation restored on mount
  }, []);

  // Staff replies from the admin Inbox arrive by polling — often while the team has the chat.
  const lastIdRef = useRef(lastServerId);
  lastIdRef.current = lastServerId;
  useEffect(() => {
    if (!token || restoring) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      api.messaging.web.history
        .query({ token, afterId: lastIdRef.current })
        .then((result) => {
          if (!result.found) return;
          merge(result.messages);
          setWithTeam(result.withTeam);
        })
        .catch(() => {});
    }, withTeam ? POLL_WITH_TEAM_MS : POLL_IDLE_MS);
    return () => clearInterval(timer);
  }, [token, restoring, withTeam]);

  /** The one real write path this page ever triggers is inside the assistant's own submit_lead
   * tool (assistant.service.ts, server-side) — this function only ever sends the visitor's
   * message and shows whatever real, tool-grounded reply (or staff reply) comes back. */
  async function send(text: string) {
    const pending: Message = { id: `pending-${Date.now()}`, sender: 'user', message: text, local: true };
    setMessages((prev) => [...prev, pending]);
    setInput("");
    setIsSending(true);

    try {
      const result = await api.messaging.web.send.mutate({
        token,
        text,
        propertyId: context.propertyId,
        propertyName: context.propertyName,
        campaignCode: currentCampaignCode(),
      });
      setToken(result.token);
      setWithTeam(result.withTeam);
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const next = prev.filter((m) => m.id !== pending.id);
        next.push(...result.messages.filter((m) => !seen.has(m.id)).map(fromServer));
        if (result.notice) next.push({ id: `notice-${Date.now()}`, sender: 'bot', message: result.notice, local: true, isError: true });
        return next;
      });
    } catch (err) {
      // The server's own wording for a message it refused (too fast, too long); anything else is a connection problem.
      const refused = err instanceof Error && /too fast|a bit fast|too long|type a message/i.test(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'bot',
          message: refused
            ? (err as Error).message
            : "Sorry, I'm having trouble connecting right now. Please try again, or call us directly at +855 23 123 456.",
          local: true,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
      // Back to the text box so the visitor can simply keep typing.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  const handleSend = (text: string = input) => {
    if (!text.trim() || isSending) return;
    send(text.trim());
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Khmer/Chinese keyboards use Enter to finish composing a word — only a real Enter sends.
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend();
  };

  // The old conversation stays in the team's Inbox; this browser just stops following it.
  const startNewChat = () => {
    setContext({});
    setToken(undefined);
    setWithTeam(false);
    setMessages([greetingFor()]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const showStarters = messages.length === 1 && !isSending && !restoring;
  const starters = context.propertyName ? PROPERTY_STARTERS : STARTERS;

  return (
    <div className="mx-auto max-w-5xl px-2 py-4 sm:px-4 sm:py-8">
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ height: 'calc(100dvh - 140px)', minHeight: 480 }}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 text-white sm:p-6" style={{ background: 'linear-gradient(135deg, #001F5B 0%, #8B0A1C 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="flex flex-shrink-0 items-center justify-center rounded-full bg-white p-2" style={{ width: '48px', height: '48px' }}>
              <img src={logo} alt="ERA Cambodia" className="h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold sm:text-xl">AI Property Assistant</h2>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                <span className="text-sm text-gray-100">
                  {withTeam ? 'Chatting with the ERA team' : 'Online · English, ខ្មែរ, 中文'}
                </span>
              </div>
            </div>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={startNewChat}
                disabled={isSending}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex min-w-0 max-w-full items-start gap-2 sm:max-w-2xl ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.sender === 'agent' ? (
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: '#001F5B' }}
                    >
                      {(msg.agentName ?? 'E').charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 rounded-full p-2" style={{ backgroundColor: msg.sender === 'user' ? '#EF2D2C' : '#f3f4f6' }}>
                      {msg.sender === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-gray-700" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    {msg.sender === 'agent' && (
                      <div className="mb-1 text-xs font-semibold" style={{ color: '#001F5B' }}>
                        {msg.agentName ?? 'ERA team'} · ERA Cambodia team
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                        msg.sender === 'user'
                          ? 'text-white'
                          : msg.sender === 'agent'
                            ? 'border border-[#001F5B]/15 bg-[#001F5B]/5 text-gray-900'
                            : msg.isError
                              ? 'bg-red-50 text-red-800'
                              : 'bg-gray-100 text-gray-900'
                      }`}
                      style={msg.sender === 'user' ? { backgroundColor: '#EF2D2C' } : {}}
                    >
                      {msg.sender === 'bot' ? <FormattedText text={msg.message} /> : <p className="whitespace-pre-line break-words">{msg.message}</p>}
                    </div>
                    {msg.properties && msg.properties.length > 0 && (
                      <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
                        {msg.properties.map((prop) => (
                          <PropertyCard key={prop.id} prop={prop} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {showStarters && (
              <div className="flex flex-wrap gap-2 pl-10">
                {starters.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-[#EF2D2C]/40 bg-white px-3 py-1.5 text-sm text-[#8B0A1C] transition hover:bg-[#EF2D2C] hover:text-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {isSending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="rounded-full p-2" style={{ backgroundColor: '#f3f4f6' }}>
                    <Bot className="h-4 w-4 text-gray-700" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-3">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-xs text-gray-500">{withTeam ? 'Sending…' : 'Checking our listings…'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0 border-t bg-gray-50 p-3 sm:p-6">
          <div className="flex gap-2 sm:gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your message..."
              disabled={isSending}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#EF2D2C] disabled:bg-gray-100"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isSending || !input.trim()}
              aria-label="Send"
              className="flex flex-shrink-0 items-center gap-2 rounded-lg px-4 py-3 text-white transition disabled:opacity-50 sm:px-6"
              style={{ backgroundColor: '#EF2D2C' }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#8B0A1C')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#EF2D2C')}
            >
              <Send className="h-5 w-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">Your details go straight to our sales team</p>
        </div>
      </div>
    </div>
  );
}
