import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, DollarSign, MapPin, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { Link, useLocation } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";
import logo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";

interface Message {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
  options?: string[];
  properties?: PublicProject[];
}

type PublicProject = Awaited<ReturnType<typeof api.inventory.public.projects.list.query>>[number];
type PublicProjectDetail = NonNullable<Awaited<ReturnType<typeof api.inventory.public.projects.get.query>>>;
type PublicUnit = Awaited<ReturnType<typeof api.inventory.public.units.list.query>>[number];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop';

const STATUS_LABEL: Record<PublicProject['status'], string> = {
  PLANNING: 'Coming Soon',
  SELLING: 'Selling Now',
  SOLD_OUT: 'Sold Out',
  HANDOVER: 'Handover',
  COMPLETED: 'Completed',
};

const TYPE_LABEL: Record<PublicProject['propertyType'], string> = {
  CONDO: 'Condo', HOUSE: 'House', VILLA: 'Villa', TOWNHOUSE: 'Townhouse',
  SHOPHOUSE: 'Shophouse', LAND: 'Land', BOREY: 'Borey', COMMERCIAL: 'Commercial',
};

function money(n: number | null) {
  return n == null ? 'Contact for pricing' : `$${n.toLocaleString()}`;
}

const GENERIC_GREETING: Message = {
  id: '1',
  sender: 'bot',
  message: "Hello! 👋 Welcome to ERA Cambodia AI Property Assistant. I'm here to help you find your dream property in Phnom Penh.\n\nI can help you with:\n• Finding properties that match your budget\n• Exploring different locations\n• Comparing property types\n• Scheduling property viewings\n\nWhat's your name?",
  timestamp: new Date().toISOString(),
};

function buildPropertyGreeting(proj: PublicProjectDetail, units: PublicUnit[]): Message {
  const unitTypeNames = Array.from(new Set(units.map((u) => u.unitTypeName).filter((n): n is string => !!n)));
  return {
    id: '1',
    sender: 'bot',
    message: `Hello! 👋 Welcome to ERA Cambodia AI Property Assistant.\n\nI see you're interested in **${proj.name}** 🏢\n\n📍 **Location:** ${proj.location}\n💰 **Starting from:** ${money(proj.startingPrice)}\n🏠 **Unit Types:** ${unitTypeNames.join(', ') || 'Contact us for details'}\n📊 **Available Units:** ${proj.availableUnits} out of ${proj.totalUnits}\n⭐ **Status:** ${STATUS_LABEL[proj.status]}\n\n✨ **Key Amenities:**\n${proj.amenities.slice(0, 6).map((a) => `• ${a}`).join('\n') || '• Ask us about amenities'}\n\nI can help you with:\n• Detailed unit information & pricing\n• Payment plans & financing options\n• Scheduling property viewings\n• Investment ROI projections\n• Comparing with other properties\n\nWhat would you like to know about ${proj.name}?`,
    timestamp: new Date().toISOString(),
    options: ["Show Available Units", "Payment Plans", "Schedule Viewing", "Investment Analysis", "Compare with Other Properties"],
  };
}

export function ChatPage() {
  const location = useLocation();
  const propertyContext = location.state as { propertyId?: string; propertyName?: string } | null;

  const [messages, setMessages] = useState<Message[]>(
    propertyContext?.propertyId
      ? [{ id: '1', sender: 'bot', message: 'One moment — pulling up the details… 🔍', timestamp: new Date().toISOString() }]
      : [GENERIC_GREETING],
  );
  const [input, setInput] = useState("");
  const [step, setStep] = useState(propertyContext?.propertyId ? -1 : 0); // -1 = property-specific mode, while loading or resolved
  const [leadData, setLeadData] = useState<Record<string, string>>({});
  const [schedulingData, setSchedulingData] = useState<Record<string, string>>({});
  const [property, setProperty] = useState<PublicProjectDetail | null>(null);
  const [propertyUnits, setPropertyUnits] = useState<PublicUnit[]>([]);
  const [allProjects, setAllProjects] = useState<PublicProject[]>([]);
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
  }, [messages]);

  // Every recommendation and every property-specific answer reads from the real inventory API —
  // the old version read a disconnected, stale mock dataset with fabricated `P00x` ids that no
  // longer match anything real (see memory-bank/progress.md's Tier 0 chat fix for the history).
  useEffect(() => {
    api.inventory.public.projects.list.query().then(setAllProjects).catch(() => setAllProjects([]));
  }, []);

  useEffect(() => {
    if (!propertyContext?.propertyId) return;
    let cancelled = false;
    Promise.all([
      api.inventory.public.projects.get.query({ id: propertyContext.propertyId }),
      api.inventory.public.units.list.query({ projectId: propertyContext.propertyId }),
    ])
      .then(([proj, units]) => {
        if (cancelled) return;
        if (proj) {
          setProperty(proj);
          setPropertyUnits(units);
          setMessages([buildPropertyGreeting(proj, units)]);
        } else {
          setStep(0);
          setMessages([GENERIC_GREETING]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStep(0);
        setMessages([GENERIC_GREETING]);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyContext?.propertyId]);

  const conversationFlow = [
    { question: "What's your name?", field: "name" },
    { question: "Great to meet you, {name}! 😊 Are you looking to buy or rent a property?", field: "propertyCategory", options: ["Buy", "Rent", "Not sure yet"] },
    { question: "What type of property are you interested in?", field: "rentalType", options: [] as string[] },
    { question: "Perfect! What's your monthly budget range?", field: "budget", options: [] as string[] },
    { question: "Excellent! Which area in Phnom Penh interests you most?", field: "location", options: ["BKK1", "BKK2", "Chamkarmon", "Riverside", "Diamond Island", "Any location"] },
    { question: "What type of property are you looking for?", field: "unitType", options: [] as string[] },
    { question: "When are you planning to make a decision?", field: "timeline", options: ["Within 30 days", "2-3 months", "3-6 months", "Just exploring"] },
    { question: "Great! To send you personalized recommendations, what's your phone number?", field: "phone" },
    { question: "And your email address for property updates?", field: "email" },
  ];

  const getRentalTypeOptions = (category: string) =>
    category === "Rent" ? { question: "What type of property would you like to rent?", options: ["Apartment / Condo", "Office Space", "Either"] } : null;

  const getBudgetOptions = (category: string, rentalType?: string) => {
    if (category === "Buy") {
      return { question: "Perfect! What's your budget range for buying?", options: ["$60K-120K", "$120K-200K", "$200K-350K", "$350K-500K", "$500K+"] };
    } else if (category === "Rent") {
      if (rentalType === "Office Space") {
        return { question: "Perfect! What's your monthly budget for office space?", options: ["$500-1000/month", "$1000-2000/month", "$2000-4000/month", "$4000-7000/month", "$7000+/month"] };
      } else if (rentalType === "Apartment / Condo") {
        return { question: "Perfect! What's your monthly budget for apartment rental?", options: ["$300-600/month", "$600-1000/month", "$1000-1500/month", "$1500-2500/month", "$2500+/month"] };
      }
      return { question: "Perfect! What's your monthly rental budget?", options: ["$300-600/month", "$600-1500/month", "$1500-3000/month", "$3000-5000/month", "$5000+/month"] };
    }
    return { question: "Perfect! What's your budget range?", options: ["Under $100K", "$100K-250K", "$250K-500K", "$500K+", "Not sure yet"] };
  };

  const getUnitTypeOptions = (category: string, rentalType?: string) => {
    if (category === "Rent" && rentalType === "Office Space") {
      return { question: "What size office do you need?", options: ["Small Office (20-50 sqm)", "Medium Office (50-100 sqm)", "Large Office (100-200 sqm)", "Executive Suite (200+ sqm)", "Flexible"] };
    } else if (category === "Rent" && rentalType === "Apartment / Condo") {
      return { question: "What type of apartment are you looking for?", options: ["Studio", "1 Bedroom", "2 Bedrooms", "3+ Bedrooms", "Penthouse"] };
    }
    return { question: "What type of property are you looking for?", options: ["Studio", "1 Bedroom", "2 Bedrooms", "3+ Bedrooms", "Penthouse"] };
  };

  /** Real projects, filtered by real category + a location text match — no fabricated data,
   * though coarser than the old (fake) unit-type scoring since the public projects list doesn't
   * carry a per-project unit-type rollup. */
  const findMatchingProperties = (data: Record<string, string>) => {
    const category = data.propertyCategory === "Buy" ? 'SALE' : data.propertyCategory === "Rent" ? 'RENT' : null;
    let pool = allProjects.filter((p) => p.availableUnits > 0);
    if (category) pool = pool.filter((p) => p.category === category);

    const scored = pool.map((p) => {
      let score = 0;
      if (data.location && data.location !== "Any location") {
        if ((p.city ?? p.location).toLowerCase().includes(data.location.toLowerCase())) score += 2;
      } else {
        score += 1;
      }
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.p);
  };

  const calculateLeadScore = (data: Record<string, string>) => {
    let score = 50;
    if (data.budget && !data.budget.includes("Not sure")) score += 15;
    if (data.timeline === "Within 30 days") score += 20;
    else if (data.timeline === "2-3 months") score += 15;
    else if (data.timeline === "3-6 months") score += 10;
    else score += 5;
    if (data.location && data.location !== "Any location") score += 10;
    if (data.unitType) score += 10;
    return Math.min(score, 95);
  };

  const getLeadCategory = (score: number) => {
    if (score >= 80) return { category: "Hot", emoji: "🔥" };
    if (score >= 60) return { category: "Warm", emoji: "⚡" };
    return { category: "Cold", emoji: "❄️" };
  };

  function pushBotMessage(message: string, options?: string[]) {
    setMessages((prev) => [...prev, { id: (Date.now() + Math.random()).toString(), sender: 'bot', message, timestamp: new Date().toISOString(), options }]);
  }

  /** The one real write path in this whole page — everything else is just conversation UI.
   * Submits through the same public.submitLead the rest of the site uses, so a real Lead lands
   * in the admin Pipeline exactly like a Properties-page enquiry does. */
  async function submitViewingRequest(data: { property?: string; date?: string; time?: string; name?: string; phone?: string; email?: string }) {
    try {
      await api.crm.public.submitLead.mutate({
        name: data.name ?? 'Chat visitor',
        phone: data.phone,
        email: data.email,
        preferredProjectId: property?.id,
        message: `Requested a viewing for ${data.property ?? 'a property'} — preferred ${data.date ?? 'date TBC'}, ${data.time ?? 'time TBC'}.`,
      });
      pushBotMessage(
        `🎉 **Viewing Request Sent!**\n\n✅ **Your Details:**\n━━━━━━━━━━━━━━━━━━━━\n👤 Name: ${data.name}\n📱 Phone: ${data.phone}\n📧 Email: ${data.email}\n\n🏢 **Property Viewing:**\n━━━━━━━━━━━━━━━━━━━━\n🏘️ ${data.property}\n📅 Date: ${data.date}\n⏰ Time: ${data.time}\n\nOne of our property consultants will reach out to confirm your appointment.\n\n🔄 **Need to reschedule?**\nCall us at +855 23 123 456.\n\nWe look forward to showing you your future home! 🏡✨`,
        ["Show Available Units", "Payment Plans", "Compare with Other Properties", "Talk to Agent Now"],
      );
    } catch {
      pushBotMessage(
        "Sorry, something went wrong sending your viewing request. Please call us directly at +855 23 123 456, or try again.",
        ["Talk to Agent Now"],
      );
    } finally {
      setSchedulingData({});
    }
  }

  async function submitGeneralLead(data: Record<string, string>) {
    try {
      await api.crm.public.submitLead.mutate({
        name: data.name,
        phone: data.phone,
        email: data.email,
        message: `AI chat enquiry — looking to ${data.propertyCategory?.toLowerCase() ?? 'find'} ${data.unitType ?? 'a property'} in ${data.location ?? 'any location'}, budget ${data.budget ?? 'not specified'}, timeline ${data.timeline ?? 'not specified'}.`,
      });
      setTimeout(() => {
        pushBotMessage(
          `💼 **Next Steps:**\n\nOne of our senior sales consultants will contact you at:\n📞 ${data.phone}\n📧 ${data.email}\n\nExpected response time: within 1 business day.\n\nWhat would you like to do next?`,
          ["Schedule Viewing", "See All Properties", "Talk to Agent Now"],
        );
      }, 800);
    } catch {
      pushBotMessage("I couldn't submit your details just now — please call us directly at +855 23 123 456, or try again.", ["Talk to Agent Now"]);
    }
  }

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', message: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);

    const currentInput = input;
    setInput("");
    setTimeout(scrollToBottom, 50);

    // Mid-scheduling free-text (name/phone/email) in property-specific mode.
    if (step === -1 && property && schedulingData.date && schedulingData.time && !schedulingData.email) {
      setTimeout(() => {
        if (!schedulingData.name && !currentInput.includes("@") && !currentInput.match(/^\+?\d/)) {
          setSchedulingData({ ...schedulingData, name: currentInput });
          pushBotMessage(`Thank you, ${currentInput}! 😊\n\nPlease provide your phone number (WhatsApp preferred):\n\nExample: +855 12 345 678`);
        } else if (schedulingData.name && !schedulingData.phone && currentInput.match(/^\+?\d/)) {
          setSchedulingData({ ...schedulingData, phone: currentInput });
          pushBotMessage("Great! 📱\n\nLastly, please provide your email address:");
        } else if (schedulingData.name && schedulingData.phone && currentInput.includes("@")) {
          const finalScheduling = { ...schedulingData, email: currentInput };
          setSchedulingData(finalScheduling);
          submitViewingRequest(finalScheduling);
        }
      }, 800);
      return;
    }

    if (step === -1) return; // property-specific mode, not in scheduling — free text has nowhere to go yet

    const currentStep = conversationFlow[step];
    const updatedLeadData = { ...leadData, [currentStep.field]: currentInput };
    setLeadData(updatedLeadData);

    setTimeout(() => {
      if (step < conversationFlow.length - 1) {
        const nextStep = step + 1;
        const nextQuestion = conversationFlow[nextStep];
        let questionText = nextQuestion.question;
        Object.keys(updatedLeadData).forEach((key) => {
          questionText = questionText.replace(`{${key}}`, updatedLeadData[key]);
        });

        if (nextQuestion.field === "rentalType") {
          if (updatedLeadData.propertyCategory === "Rent") {
            const rentalTypeOptions = getRentalTypeOptions(updatedLeadData.propertyCategory);
            if (rentalTypeOptions) {
              questionText = rentalTypeOptions.question;
              nextQuestion.options = rentalTypeOptions.options;
            }
          } else {
            setStep(nextStep + 1);
            const skippedStep = nextStep + 1;
            const skippedQuestion = conversationFlow[skippedStep];
            let skippedQuestionText = skippedQuestion.question;
            Object.keys(updatedLeadData).forEach((key) => {
              skippedQuestionText = skippedQuestionText.replace(`{${key}}`, updatedLeadData[key]);
            });
            if (skippedQuestion.field === "budget") {
              const budgetOptions = getBudgetOptions(updatedLeadData.propertyCategory);
              skippedQuestionText = budgetOptions.question;
              skippedQuestion.options = budgetOptions.options;
            }
            pushBotMessage(skippedQuestionText, skippedQuestion.options);
            return;
          }
        }

        if (nextQuestion.field === "budget" && updatedLeadData.propertyCategory) {
          const budgetOptions = getBudgetOptions(updatedLeadData.propertyCategory, updatedLeadData.rentalType);
          questionText = budgetOptions.question;
          nextQuestion.options = budgetOptions.options;
        }

        if (nextQuestion.field === "unitType") {
          const unitTypeOptions = getUnitTypeOptions(updatedLeadData.propertyCategory, updatedLeadData.rentalType);
          questionText = unitTypeOptions.question;
          nextQuestion.options = unitTypeOptions.options;
        }

        pushBotMessage(questionText, nextQuestion.options);
        setStep(nextStep);
      } else {
        const matchingProperties = findMatchingProperties(updatedLeadData);
        const leadScore = calculateLeadScore(updatedLeadData);
        const leadInfo = getLeadCategory(leadScore);

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            message: `Thank you, ${updatedLeadData.name}! 🎉\n\n✅ **Your Profile Summary:**\n• Interest: ${updatedLeadData.propertyCategory}\n• Budget: ${updatedLeadData.budget}\n• Location: ${updatedLeadData.location}\n• Type: ${updatedLeadData.unitType}\n• Timeline: ${updatedLeadData.timeline}\n\n📊 **Lead Score: ${leadScore}/100** ${leadInfo.emoji} (${leadInfo.category} Lead)\n\n🏠 **Here ${matchingProperties.length === 1 ? 'is' : 'are'} ${matchingProperties.length || 'no'} matching propert${matchingProperties.length === 1 ? 'y' : 'ies'} for you:**`,
            timestamp: new Date().toISOString(),
            properties: matchingProperties,
          },
        ]);

        submitGeneralLead(updatedLeadData);
      }
    }, 1000);
  };

  const handleOptionClick = (option: string) => {
    setInput(option);
    setTimeout(() => {
      if (step === -1 && property) {
        const userMessage: Message = { id: Date.now().toString(), sender: 'user', message: option, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, userMessage]);

        setTimeout(() => {
          const available = propertyUnits.filter((u) => u.status === 'AVAILABLE');

          if (option === "Show Available Units") {
            const unitsList = available
              .map(
                (u) =>
                  `\n🏠 **Unit ${u.code}** - ${u.unitTypeName ?? 'Unit'}\n` +
                  `💰 Price: ${money(u.listPrice)}\n` +
                  `📐 Size: ${u.areaSqm ?? '—'} sqm | 🛏️ ${u.bedrooms ?? '—'} Bed | 🚿 ${u.bathrooms ?? '—'} Bath\n` +
                  `🏢 Floor: ${u.floor ?? '—'}`,
              )
              .join('\n\n');
            pushBotMessage(
              `🏢 **Available Units at ${property.name}**\n\nWe have ${available.length} available unit${available.length === 1 ? '' : 's'}:\n${unitsList || '\n(No units currently listed as available — an agent can confirm the latest availability.)'}\n\nWould you like to know more about any specific unit?`,
              ["Payment Plans", "Schedule Viewing", "Investment Analysis", "Talk to Agent Now"],
            );
          } else if (option === "Payment Plans") {
            pushBotMessage(
              `💳 **Flexible Payment Plans for ${property.name}**\n\n` +
                `We offer multiple payment options:\n\n` +
                `**Option 1: Cash Purchase** 💰\n• 5% discount on total price\n• Immediate unit selection priority\n• Free legal processing\n\n` +
                `**Option 2: Installment Plan** 📅\n• 30% down payment\n• Balance payable over 12-36 months\n• 0% interest for 12 months\n\n` +
                `**Option 3: Bank Financing** 🏦\n• Partner with 5+ major banks\n• Up to 80% loan approval\n• Competitive interest rates (6-8%)\n\n` +
                `Would you like detailed calculations for your preferred unit?`,
              ["Show Available Units", "Schedule Viewing", "Talk to Agent Now"],
            );
          } else if (option === "Schedule Viewing") {
            setSchedulingData({ property: property.name });
            pushBotMessage(
              `📅 **Schedule Your Property Viewing**\n\nGreat choice! I'll arrange a personalized viewing for **${property.name}**.\n\n**What's included:**\n✅ Guided tour by a property consultant\n✅ See multiple units (if available)\n✅ Explore amenities & facilities\n✅ Virtual tour option available\n\n**Available viewing times:**\n• Weekdays: 9 AM - 6 PM\n• Weekends: 10 AM - 5 PM\n\nWhen would you like to schedule your viewing?`,
              ["Today", "Tomorrow", "This Week", "Next Week", "Choose Specific Date"],
            );
          } else if (["Today", "Tomorrow", "This Week", "Next Week", "Choose Specific Date"].includes(option)) {
            const updated: Record<string, string> = { ...schedulingData, date: option };
            setSchedulingData(updated);
            pushBotMessage(
              `Perfect! You've selected **${option}** for your viewing.\n\n📍 Property: **${updated.property}**\n\nNow, what time works best for you?`,
              ["Morning (9 AM - 12 PM)", "Afternoon (12 PM - 3 PM)", "Late Afternoon (3 PM - 6 PM)", "Evening (By Appointment)"],
            );
          } else if (option.includes("Morning") || option.includes("Afternoon") || option.includes("Evening")) {
            const updated: Record<string, string> = { ...schedulingData, time: option };
            setSchedulingData(updated);
            pushBotMessage(
              `Excellent choice! ⏰\n\n📋 **Your Viewing Details:**\n🏢 Property: **${updated.property}**\n📅 Date: **${updated.date}**\n⏰ Time: **${option}**\n\nTo confirm your appointment, I'll need your contact information.\n\nPlease type your name:`,
            );
          } else if (option === "Investment Analysis") {
            const avgUnitPrice = available.length > 0 ? Math.round(available.reduce((sum, u) => sum + u.listPrice, 0) / available.length / 1000) : null;
            pushBotMessage(
              `📊 **Investment Analysis for ${property.name}**\n\n` +
                `📈 **Pricing**\n• Average available unit price: ${avgUnitPrice != null ? `$${avgUnitPrice}K` : 'contact us for details'}\n• Starting from: ${money(property.startingPrice)}\n\n` +
                `🏗️ **Location**\n• ${property.location}\n• ${TYPE_LABEL[property.propertyType]} in a ${property.category === 'RENT' ? 'rental' : 'sale'} listing\n\n` +
                `Would you like a detailed proposal for a specific unit, or to speak with an investment consultant?`,
              ["Show Available Units", "Payment Plans", "Talk to Agent Now"],
            );
          } else if (option === "Compare with Other Properties") {
            const similar = allProjects
              .filter((p) => p.id !== property.id && p.category === property.category && (p.city ?? '') === (property.city ?? ''))
              .slice(0, 2);
            const fallbackSimilar = similar.length > 0 ? similar : allProjects.filter((p) => p.id !== property.id && p.category === property.category).slice(0, 2);
            pushBotMessage(
              `🔍 **Property Comparison**\n\n**Current Selection: ${property.name}**\n📍 ${property.location}\n💰 ${money(property.startingPrice)}\n⭐ ${property.availableUnits} units available\n\n` +
                (fallbackSimilar.length > 0
                  ? fallbackSimilar.map((p) => `**Alternative: ${p.name}**\n📍 ${p.location}\n💰 ${money(p.startingPrice)}\n⭐ ${p.availableUnits} units available`).join('\n\n')
                  : 'No similar properties found right now — our consultants can suggest alternatives.'),
              ["Schedule Viewing", "Show Available Units", "Talk to Agent Now"],
            );
          } else if (option === "Talk to Agent Now") {
            pushBotMessage(
              `👨‍💼 **Connecting to a Property Consultant**\n\n📞 Direct Line: +855 23 123 456\n📱 WhatsApp: https://wa.me/85512345678\n💬 Telegram: https://t.me/ERAcambodia_bot\n📧 Email: sales@eracambodia.com\n\n🕐 **Office Hours:** Mon-Sat, 9 AM - 6 PM\n\nOr leave your contact details here and we'll call you.`,
              ["Show Available Units", "See More Properties"],
            );
          } else if (option === "See More Properties") {
            pushBotMessage(
              `🏢 **Explore More Properties**\n\nERA Cambodia lists ${allProjects.length}+ properties across Cambodia. Browse the full list to filter by location, price, and type.`,
              ["Talk to Agent Now"],
            );
          } else if (schedulingData.date && schedulingData.time && !schedulingData.name && !option.includes("@") && !option.match(/^\+?\d/)) {
            setSchedulingData({ ...schedulingData, name: option });
            pushBotMessage(`Thank you, ${option}! 😊\n\nPlease provide your phone number (WhatsApp preferred):\n\nExample: +855 12 345 678`);
          }
        }, 800);
        return;
      }

      if (step >= conversationFlow.length - 1) {
        const userMessage: Message = { id: Date.now().toString(), sender: 'user', message: option, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, userMessage]);

        setTimeout(() => {
          if (option === "Schedule Viewing") {
            pushBotMessage(
              "Great! 📅 Our team will contact you within the next business day to schedule your viewing. Is there anything else I can help you with?",
              ["See All Properties", "Talk to Agent Now"],
            );
          } else if (option === "See All Properties") {
            pushBotMessage("Perfect! 🏢 Click Properties in the menu above to browse everything currently listed, with real filters for location, price, and type.");
          } else if (option === "Talk to Agent Now") {
            pushBotMessage(
              "Connecting you to our property consultant team… 👨‍💼\n\n📞 +855 23 123 456\n📱 WhatsApp: https://wa.me/85512345678\n💬 Telegram: https://t.me/ERAcambodia_bot",
              ["See All Properties"],
            );
          }
        }, 800);
      } else {
        handleSend();
      }
    }, 100);
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
                    <div className={`p-4 rounded-2xl ${msg.sender === 'user' ? 'text-white' : 'bg-gray-100 text-gray-900'}`} style={msg.sender === 'user' ? { backgroundColor: '#EF2D2C' } : {}}>
                      <p className="whitespace-pre-line">{msg.message}</p>
                    </div>
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(option)}
                            className="px-4 py-2 bg-white border-2 rounded-lg transition text-sm font-medium"
                            style={{ borderColor: '#EF2D2C', color: '#EF2D2C' }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#EF2D2C'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = '#EF2D2C'; }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
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
                                  <span className="text-gray-700">{TYPE_LABEL[prop.propertyType]}</span>
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
          </div>
        </div>

        {/* Input */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EF2D2C]"
            />
            <button
              onClick={handleSend}
              className="text-white px-6 py-3 rounded-lg transition flex items-center space-x-2"
              style={{ backgroundColor: '#EF2D2C' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8B0A1C')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#EF2D2C')}
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
