import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, DollarSign, MapPin, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";
import { currentCampaignCode } from "../../lib/attribution";
import logo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";

/** The property cards a bot reply can carry — exactly what the assistant's search_properties/
 * get_property tools returned server-side (see assistant.service.ts), never fabricated here. */
type AssistantProperty = Awaited<ReturnType<typeof api.assistant.public.chat.mutate>>['properties'][number];

interface Message {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
  properties?: AssistantProperty[];
  isError?: boolean;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop';

const STATUS_LABEL: Record<AssistantProperty['status'], string> = {
  PLANNING: 'Coming Soon',
  SELLING: 'Selling Now',
  SOLD_OUT: 'Sold Out',
  HANDOVER: 'Handover',
  COMPLETED: 'Completed',
};

const TYPE_LABEL: Record<AssistantProperty['propertyType'], string> = {
  CONDO: 'Condo', HOUSE: 'House', VILLA: 'Villa', TOWNHOUSE: 'Townhouse',
  SHOPHOUSE: 'Shophouse', LAND: 'Land', BOREY: 'Borey', COMMERCIAL: 'Commercial',
};

function money(n: number | null) {
  return n == null ? 'Contact for pricing' : `$${n.toLocaleString()}`;
}

function greetingFor(propertyName?: string): Message {
  return {
    id: '1',
    sender: 'bot',
    message: propertyName
      ? `Hello! 👋 I'm the ERA Cambodia AI Property Assistant. I see you're interested in **${propertyName}** — ask me anything about it: pricing, availability, amenities, or how to schedule a viewing.`
      : "Hello! 👋 I'm the ERA Cambodia AI Property Assistant. I can help you find a property to buy or rent from our real, current listings, answer questions about pricing and availability, and connect you with our sales team. What are you looking for today?",
    timestamp: new Date().toISOString(),
  };
}

/** Persists the conversation across a route change (e.g. clicking "View Details" on a property
 * card navigates to /properties/:id, unmounting this page) so coming back to /chat resumes
 * instead of restarting from the greeting. sessionStorage, not localStorage: this is "don't
 * lose my place this browsing session," not a permanent record. */
const CHAT_STORAGE_KEY = 'era-chat-session-v1';

interface PersistedChat {
  messages: Message[];
  propertyId?: string;
  propertyName?: string;
  /** Signed reference to the lead this conversation created, so a later correction of phone/email
   * updates that same CRM record instead of being lost (or duplicated). Opaque — never parsed here. */
  leadToken?: string;
}

function loadPersistedChat(): PersistedChat | null {
  try {
    const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedChat;
    return Array.isArray(parsed.messages) && parsed.messages.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function savePersistedChat(state: PersistedChat) {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing / quota / disabled storage — chat still works, it just won't survive navigation.
  }
}

export function ChatPage() {
  const location = useLocation();
  const propertyContext = location.state as { propertyId?: string; propertyName?: string } | null;

  // A fresh "Chat about THIS property" link (from a property's own page) always starts a new
  // conversation for that property — but a plain return to /chat with no such link (browser
  // back, the nav bar's "Chat with AI Assistant", or clicking "View Details" on a property card
  // and coming back) resumes the visitor's prior conversation instead of throwing away
  // everything they already told the assistant.
  const [initial] = useState(() => {
    const restored = loadPersistedChat();
    const freshPropertyId = propertyContext?.propertyId;
    return restored && (!freshPropertyId || freshPropertyId === restored.propertyId) ? restored : null;
  });
  const effectivePropertyId = initial?.propertyId ?? propertyContext?.propertyId;
  const effectivePropertyName = initial?.propertyName ?? propertyContext?.propertyName;

  const [messages, setMessages] = useState<Message[]>(initial?.messages ?? [greetingFor(effectivePropertyName)]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [leadToken, setLeadToken] = useState<string | undefined>(initial?.leadToken);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Keeps sessionStorage in sync so a route change away from /chat and back (e.g. "View Details"
  // on a property card) can resume this conversation instead of restarting it — see
  // loadPersistedChat()/the `initial` state above for the restore side of this.
  useEffect(() => {
    savePersistedChat({ messages, propertyId: effectivePropertyId, propertyName: effectivePropertyName, leadToken });
  }, [messages, effectivePropertyId, effectivePropertyName, leadToken]);

  /** The one real write path this page ever triggers is inside the assistant's own submit_lead
   * tool (assistant.service.ts, server-side) — this function only ever sends the visitor's
   * message and appends whatever real, tool-grounded reply comes back. Nothing here fabricates
   * property facts or lead confirmations; that's the whole point of Tier 1 over the old
   * scripted flow. */
  async function sendToAssistant(text: string) {
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', message: text, timestamp: new Date().toISOString() };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setIsSending(true);

    try {
      const result = await api.assistant.public.chat.mutate({
        messages: history.map((m) => ({ role: m.sender === 'user' ? ('user' as const) : ('assistant' as const), content: m.message })),
        propertyId: effectivePropertyId,
        propertyName: effectivePropertyName,
        leadToken,
        campaignCode: currentCampaignCode(),
      });
      if (result.leadToken) setLeadToken(result.leadToken);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: result.reply,
          timestamp: new Date().toISOString(),
          properties: result.properties.length > 0 ? result.properties : undefined,
        },
      ]);
    } catch (err) {
      const tooMany = err instanceof Error && err.message.toLowerCase().includes('too many');
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: tooMany
            ? "You're sending messages a bit fast — please wait a moment and try again."
            : "Sorry, I'm having trouble connecting right now. Please try again, or call us directly at +855 23 123 456.",
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendToAssistant(input);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Header */}
        <div className="text-white p-6" style={{ background: 'linear-gradient(135deg, #001F5B 0%, #8B0A1C 100%)' }}>
          <div className="flex items-center space-x-3">
            <div className="bg-white rounded-full p-2 flex items-center justify-center" style={{ width: '56px', height: '56px' }}>
              <img src={logo} alt="ERA Cambodia" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Property Assistant</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-100">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-2xl ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className="rounded-full p-2" style={{ backgroundColor: msg.sender === 'user' ? '#EF2D2C' : '#f3f4f6' }}>
                    {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-700" />}
                  </div>
                  <div>
                    <div
                      className={`p-4 rounded-2xl ${msg.sender === 'user' ? 'text-white' : msg.isError ? 'bg-red-50 text-red-800' : 'bg-gray-100 text-gray-900'}`}
                      style={msg.sender === 'user' ? { backgroundColor: '#EF2D2C' } : {}}
                    >
                      <p className="whitespace-pre-line">{msg.message}</p>
                    </div>
                    {msg.properties && msg.properties.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {msg.properties.map((prop) => (
                          <motion.div
                            key={prop.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#EF2D2C] hover:shadow-lg transition-all"
                          >
                            <div className="relative h-48 overflow-hidden">
                              <ImageWithFallback
                                src={prop.imageUrls[0] ? resolveUploadUrl(prop.imageUrls[0]) : FALLBACK_IMAGE}
                                alt={prop.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                                {prop.availableUnits} Available
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <h3 className="text-xl font-bold text-white">{prop.name}</h3>
                                <div className="flex items-center space-x-1 text-sm text-white mt-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{prop.location}</span>
                                </div>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2 text-sm">
                                  <Building2 className="w-4 h-4 text-gray-500" />
                                  <span className="text-gray-700">{TYPE_LABEL[prop.propertyType]} · {STATUS_LABEL[prop.status]}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                                  <span className="font-bold text-gray-900">{money(prop.startingPrice)}</span>
                                </div>
                              </div>

                              {prop.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {prop.amenities.slice(0, 4).map((amenity) => (
                                    <span key={amenity} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <Link
                                to={`/properties/${prop.id}`}
                                className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:shadow-md"
                                style={{ backgroundColor: '#EF2D2C' }}
                              >
                                View Details →
                              </Link>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isSending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="rounded-full p-2" style={{ backgroundColor: '#f3f4f6' }}>
                    <Bot className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-100 flex space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EF2D2C] disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="text-white px-6 py-3 rounded-lg transition flex items-center space-x-2 disabled:opacity-50"
              style={{ backgroundColor: '#EF2D2C' }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#8B0A1C')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#EF2D2C')}
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Your details go straight to our sales team</p>
        </div>
      </div>
    </div>
  );
}
