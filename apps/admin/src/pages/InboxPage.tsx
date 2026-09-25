import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Bot, Image as ImageIcon, Send, UserRound } from 'lucide-react';
import { PageHeader, Tabs, Badge, Button, EmptyState, cn } from '@era/ui';
import {
  useConversation,
  useHandBack,
  useInbox,
  useMarkRead,
  useSendReply,
  useTakeOver,
  type ConversationThread,
  type InboxFilter,
  type InboxRow,
} from '../data/inbox';
import { useUsers, userLabel } from '../data/identity';
import { useAuth, useCan } from '../store/auth';
import { titleCase } from '../lib/format';

/* ── Formatting helpers ── */

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)}h`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

function customerName(c: { displayName: string | null; username: string | null }) {
  return c.displayName || (c.username ? `@${c.username}` : 'Telegram customer');
}

const initialsOf = (name: string) =>
  name
    .replace(/^@/, '')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

type Part = { kind: 'text'; text: string } | { kind: 'card'; text: string } | { kind: 'quote'; text: string } | { kind: 'tap'; text: string };

/**
 * Stored messages carry markers written for the AI — show them as what the customer actually saw
 * or did: photo cards, a swipe-reply to a card, a button tap.
 */
function parseMessage(role: string, text: string): Part[] {
  if (role === 'USER') {
    const tap = /^(Tell me more about|I'd like to book a viewing of) "(.+?)" \(property id [^)]+\)\.?$/.exec(text);
    if (tap) return [{ kind: 'tap', text: `${tap[1] === 'Tell me more about' ? 'ℹ️ More details' : '📅 Book a viewing'} — ${tap[2]}` }];
    const reply = /^\[Replying to(?: photo card)?: "(.+?)"(?: \(property id [^)]+\))?\]\s*([\s\S]*)$/.exec(text);
    if (reply) return [{ kind: 'quote', text: reply[1]! }, { kind: 'text', text: reply[2]! }];
    return [{ kind: 'text', text }];
  }
  const parts: Part[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const t = buffer.join('\n').trim();
    if (t) parts.push({ kind: 'text', text: t });
    buffer = [];
  };
  for (const line of text.split('\n')) {
    const card = /^\s*\[Photo card (\d+) shown: (.+?) — (.+?) — (.+?) — \S+\]\s*$/.exec(line);
    if (card) {
      flush();
      parts.push({ kind: 'card', text: `${card[1]}. ${card[2]} · ${card[3]} · ${card[4]}` });
    } else if (/^\s*https?:\/\/\S+\/properties\/\S+\s*$/.test(line)) {
      continue; // a raw property link from before photo cards existed
    } else {
      buffer.push(line);
    }
  }
  flush();
  return parts;
}

/* ── Conversation list ── */

function ConversationItem({ row, active, onOpen, handlerName }: { row: InboxRow; active: boolean; onOpen: () => void; handlerName: string }) {
  const name = row.lead?.contactName || customerName(row);
  const preview = row.lastMessage
    ? `${row.lastMessage.role === 'USER' ? '' : row.lastMessage.role === 'AGENT' ? 'Team: ' : 'AI: '}${row.lastMessage.text.replace(/\[Photo card[^\]]*\]/g, '🖼').replace(/\s+/g, ' ')}`
    : 'No messages yet';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex w-full gap-3 border-b border-black/5 px-4 py-3 text-left transition-colors',
        active ? 'bg-[var(--era-navy)]/5' : 'hover:bg-gray-50',
      )}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--era-navy)] text-sm font-bold text-white">
        {initialsOf(name) || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate text-sm text-gray-900', row.unreadCount > 0 ? 'font-bold' : 'font-semibold')}>{name}</span>
          <span className="ml-auto flex-shrink-0 text-xs text-gray-400">{ago(row.lastMessageAt)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-500">{preview}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="blue">{titleCase(row.channel)}</Badge>
          {row.needsAgent && <Badge tone="red">Wants a person</Badge>}
          {row.mode === 'AGENT' && <Badge tone="purple">Team · {handlerName}</Badge>}
          {row.unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-[var(--era-red)] px-1.5 text-[11px] font-bold text-white">{row.unreadCount}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Thread ── */

function MessageBubble({ message, agentName }: { message: ConversationThread['messages'][number]; agentName: string }) {
  const mine = message.role !== 'USER';
  const parts = parseMessage(message.role, message.text);
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className="max-w-[75%]">
        <div className={cn('mb-1 flex items-center gap-1 text-[11px] text-gray-400', mine && 'justify-end')}>
          {message.role === 'ASSISTANT' && <Bot className="h-3 w-3" />}
          {message.role === 'AGENT' && <UserRound className="h-3 w-3" />}
          <span>{message.role === 'USER' ? 'Customer' : message.role === 'AGENT' ? agentName : 'AI assistant'}</span>
          <span>· {clock(message.createdAt)}</span>
        </div>
        <div
          className={cn(
            'space-y-1.5 rounded-2xl px-3.5 py-2 text-sm',
            message.role === 'USER' && 'rounded-tl-sm bg-white text-gray-800 ring-1 ring-black/5',
            message.role === 'ASSISTANT' && 'rounded-tr-sm bg-slate-100 text-gray-800',
            message.role === 'AGENT' && 'rounded-tr-sm bg-[var(--era-navy)] text-white',
          )}
        >
          {parts.map((p, i) =>
            p.kind === 'card' ? (
              <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white/70 px-2 py-1 text-xs text-gray-700 ring-1 ring-black/5">
                <ImageIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                <span>{p.text}</span>
              </div>
            ) : p.kind === 'quote' ? (
              <div key={i} className="border-l-2 border-[var(--era-navy)]/40 pl-2 text-xs text-gray-500">
                Replying to photo: {p.text}
              </div>
            ) : p.kind === 'tap' ? (
              <div key={i} className="text-xs italic text-gray-500">
                Tapped {p.text}
              </div>
            ) : (
              <div key={i} className="whitespace-pre-wrap break-words">
                {p.text}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

/** Mounted per conversation (keyed), so the draft never leaks between chats. */
function Composer({ conversationId, enabled }: { conversationId: string; enabled: boolean }) {
  const [text, setText] = useState('');
  const send = useSendReply();
  const submit = () => {
    const t = text.trim();
    if (!t || send.isPending) return;
    send.mutate({ id: conversationId, text: t }, { onSuccess: () => setText('') });
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };
  return (
    <div className="border-t border-black/5 bg-white p-3">
      {send.error && <p className="mb-2 text-xs text-[var(--era-red)]">{send.error.message}</p>}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={text}
          disabled={!enabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={enabled ? 'Type a reply — Enter to send, Shift+Enter for a new line' : 'Take over the conversation to reply'}
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--era-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--era-navy)] disabled:bg-gray-50"
        />
        <Button onClick={submit} disabled={!enabled || !text.trim() || send.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
      {enabled && <p className="mt-1.5 text-[11px] text-gray-400">Sent through the ERA bot, signed with your first name.</p>}
    </div>
  );
}

function ConversationPane({ id }: { id: string }) {
  const { data, isLoading, error } = useConversation(id);
  const { data: users } = useUsers();
  const { user } = useAuth();
  const canWrite = useCan('crm:write');
  const markRead = useMarkRead();
  const takeOver = useTakeOver();
  const handBack = useHandBack();
  const scroller = useRef<HTMLDivElement>(null);
  const count = data?.messages.length ?? 0;
  const unread = data?.conversation.unreadCount ?? 0;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [id, count]);

  // Opening the chat counts as reading it.
  useEffect(() => {
    if (unread > 0) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the chat or its unread count changes
  }, [id, unread]);

  if (isLoading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (error || !data) return <div className="p-6 text-sm text-[var(--era-red)]">{error?.message ?? 'Conversation not found.'}</div>;

  const { conversation: c, lead, messages, rules } = data;
  const handledByMe = c.handledById === user?.id;
  const actionError = takeOver.error ?? handBack.error;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/5 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <div className="truncate font-bold text-[var(--era-navy)]">{lead?.contactName || customerName(c)}</div>
            <div className="text-xs text-gray-500">
              {titleCase(c.channel)}
              {c.username ? ` · @${c.username}` : ''}
              {lead ? (
                <>
                  {' · '}
                  {lead.phone ?? lead.email ?? 'no phone'}
                  {' · '}
                  <Link to={`/leads?open=${lead.id}`} className="font-medium text-[var(--era-navy)] underline">
                    Open lead ({titleCase(lead.stage)})
                  </Link>
                </>
              ) : (
                ' · no contact details yet'
              )}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {c.mode === 'AGENT' ? (
              <>
                <span className="text-xs text-gray-500">
                  Handled by <b>{handledByMe ? 'you' : userLabel(users, c.handledById)}</b>
                </span>
                {canWrite && (
                  <Button size="sm" variant="outline" disabled={handBack.isPending} onClick={() => handBack.mutate(id)}>
                    <Bot className="mr-1 h-4 w-4" /> Hand back to AI
                  </Button>
                )}
              </>
            ) : (
              <>
                <span className="text-xs text-gray-500">The AI is answering</span>
                {canWrite && (
                  <Button size="sm" disabled={takeOver.isPending} onClick={() => takeOver.mutate(id)}>
                    <UserRound className="mr-1 h-4 w-4" /> Take over
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {c.needsAgent && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
            <b>The customer wants a person:</b> {c.needsAgentReason ?? 'asked for a team member'}
          </div>
        )}
        {c.mode === 'AGENT' && !handledByMe && (
          <div className="mt-2 rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-800">
            A team member is handling this chat — the AI is paused.
          </div>
        )}
        {c.mode === 'AGENT' && rules.autoHandbackMinutes > 0 && (
          <p className="mt-2 text-[11px] text-gray-400">
            The AI steps back in if the customer waits {rules.autoHandbackMinutes} min without a reply
            {rules.idleReleaseHours > 0 ? `, or after ${rules.idleReleaseHours} h with no activity` : ''}.
          </p>
        )}
        {actionError && <p className="mt-2 text-xs text-[var(--era-red)]">{actionError.message}</p>}
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-[#F8F9FA] px-5 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} agentName={m.agentId === user?.id ? 'You' : userLabel(users, m.agentId)} />
        ))}
      </div>

      {canWrite && <Composer key={id} conversationId={id} enabled={c.mode === 'AGENT'} />}
    </div>
  );
}

/* ── Page ── */

export function InboxPage() {
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<InboxFilter>('attention');
  const { data: rows, isLoading } = useInbox(filter);
  const { data: users } = useUsers();
  const openId = params.get('c');
  const list = rows ?? [];

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle="Customer chats with the Telegram AI bot. Take over any chat to reply as yourself; hand it back when you're done."
      />
      <Tabs
        tabs={[
          { id: 'attention', label: 'Needs attention' },
          { id: 'agent', label: 'Handled by team' },
          { id: 'all', label: 'All chats' },
        ]}
        active={filter}
        onChange={(t) => setFilter(t as InboxFilter)}
      />
      <div className="grid h-[calc(100vh-15rem)] min-h-[480px] grid-cols-[340px_1fr] overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        <div className="overflow-y-auto border-r border-black/5">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-400">Loading…</div>
          ) : list.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={filter === 'attention' ? 'Nothing waiting' : 'No chats here'}
                hint={
                  filter === 'attention'
                    ? 'Chats appear here when a customer asks for a person, or writes to a chat your team is handling.'
                    : 'Conversations with the Telegram bot will appear here.'
                }
              />
            </div>
          ) : (
            list.map((row) => (
              <ConversationItem
                key={row.id}
                row={row}
                active={row.id === openId}
                handlerName={userLabel(users, row.handledById)}
                onOpen={() => setParams({ c: row.id })}
              />
            ))
          )}
        </div>
        <div className="min-w-0">
          {openId ? (
            <ConversationPane key={openId} id={openId} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-gray-400">Choose a conversation</div>
          )}
        </div>
      </div>
    </div>
  );
}
