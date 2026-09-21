import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Home, DollarSign, MapPin, Calendar, Phone, Mail, Building2, Bed, Bath, Maximize, Eye } from "lucide-react";
import { motion } from "motion/react";
import { mockProperties, mockUnits } from '@era/mock-data';
import { Link, useLocation } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import logo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";

interface Message {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
  options?: string[];
  properties?: any[];
}

export function ChatPage() {
  const location = useLocation();
  const propertyContext = location.state as { propertyId?: string; propertyName?: string } | null;
  
  // Initialize messages based on context
  const getInitialMessages = (): Message[] => {
    if (propertyContext?.propertyId) {
      const property = mockProperties.find(p => p.id === propertyContext.propertyId);
      const units = mockUnits.filter(u => u.projectId === propertyContext.propertyId && u.status === "Available");
      
      if (property) {
        return [
          {
            id: '1',
            sender: 'bot',
            message: `Hello! 👋 Welcome to ERA Cambodia AI Property Assistant.\n\nI see you're interested in **${property.projectName}** 🏢\n\n📍 **Location:** ${property.location}\n💰 **Price Range:** ${property.priceRange}\n🏠 **Unit Types:** ${property.type.join(', ')}\n📊 **Available Units:** ${property.availableUnits} out of ${property.totalUnits}\n⭐ **Status:** ${property.status}\n\n✨ **Key Amenities:**\n${property.amenities.slice(0, 6).map(a => `• ${a}`).join('\n')}\n\nI can help you with:\n• Detailed unit information & pricing\n• Payment plans & financing options\n• Scheduling property viewings\n• Comparing available units\n• Investment ROI projections\n\nWhat would you like to know about ${property.projectName}?`,
            timestamp: new Date().toISOString(),
            options: [
              "Show Available Units",
              "Payment Plans",
              "Schedule Viewing",
              "Investment Analysis",
              "Compare with Other Properties"
            ]
          }
        ];
      }
    }
    
    // Default general conversation
    return [
      {
        id: '1',
        sender: 'bot',
        message: "Hello! 👋 Welcome to ERA Cambodia AI Property Assistant. I'm here to help you find your dream property in Phnom Penh.\n\nI can help you with:\n• Finding properties that match your budget\n• Exploring different locations\n• Comparing property types\n• Scheduling property viewings\n\nWhat's your name?",
        timestamp: new Date().toISOString()
      }
    ];
  };
  
  const [messages, setMessages] = useState<Message[]>(getInitialMessages());
  const [input, setInput] = useState("");
  const [step, setStep] = useState(propertyContext?.propertyId ? -1 : 0); // -1 for property-specific mode
  const [leadData, setLeadData] = useState<any>({});
  const [schedulingData, setSchedulingData] = useState<any>({}); // For storing viewing schedule selections
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      // Use scrollTop for immediate and reliable scrolling
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Scroll immediately and after a short delay to account for animations
    scrollToBottom();
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const conversationFlow = [
    { question: "What's your name?", field: "name" },
    { question: "Great to meet you, {name}! 😊 Are you looking to buy or rent a property?", field: "propertyCategory", options: ["Buy", "Rent", "Not sure yet"] },
    { 
      question: "What type of property are you interested in?", 
      field: "rentalType", 
      options: [] // Will be set dynamically if Rent is selected
    },
    { 
      question: "Perfect! What's your monthly budget range?", 
      field: "budget", 
      options: [] // Will be set dynamically based on propertyCategory and rentalType
    },
    { question: "Excellent! Which area in Phnom Penh interests you most?", field: "location", options: ["BKK1", "BKK2", "Chamkarmon", "Riverside", "Diamond Island", "Any location"] },
    { 
      question: "What type of property are you looking for?", 
      field: "unitType", 
      options: [] // Will be set dynamically based on rentalType
    },
    { question: "When are you planning to make a decision?", field: "timeline", options: ["Within 30 days", "2-3 months", "3-6 months", "Just exploring"] },
    { question: "Great! To send you personalized recommendations, what's your phone number?", field: "phone" },
    { question: "And your email address for property updates?", field: "email" }
  ];
  
  // Rental type options (only for Rent category)
  const getRentalTypeOptions = (category: string) => {
    if (category === "Rent") {
      return {
        question: "What type of property would you like to rent?",
        options: ["Apartment / Condo", "Office Space", "Either"]
      };
    }
    return null;
  };
  
  // Budget options based on property category and rental type
  const getBudgetOptions = (category: string, rentalType?: string) => {
    if (category === "Buy") {
      return {
        question: "Perfect! What's your budget range for buying?",
        options: ["$60K-120K", "$120K-200K", "$200K-350K", "$350K-500K", "$500K+"]
      };
    } else if (category === "Rent") {
      if (rentalType === "Office Space") {
        return {
          question: "Perfect! What's your monthly budget for office space?",
          options: ["$500-1000/month", "$1000-2000/month", "$2000-4000/month", "$4000-7000/month", "$7000+/month"]
        };
      } else if (rentalType === "Apartment / Condo") {
        return {
          question: "Perfect! What's your monthly budget for apartment rental?",
          options: ["$300-600/month", "$600-1000/month", "$1000-1500/month", "$1500-2500/month", "$2500+/month"]
        };
      } else {
        // "Either" or not specified
        return {
          question: "Perfect! What's your monthly rental budget?",
          options: ["$300-600/month", "$600-1500/month", "$1500-3000/month", "$3000-5000/month", "$5000+/month"]
        };
      }
    } else {
      return {
        question: "Perfect! What's your budget range?",
        options: ["Under $100K", "$100K-250K", "$250K-500K", "$500K+", "Not sure yet"]
      };
    }
  };
  
  // Unit type options based on rental type
  const getUnitTypeOptions = (category: string, rentalType?: string) => {
    if (category === "Rent" && rentalType === "Office Space") {
      return {
        question: "What size office do you need?",
        options: ["Small Office (20-50 sqm)", "Medium Office (50-100 sqm)", "Large Office (100-200 sqm)", "Executive Suite (200+ sqm)", "Flexible"]
      };
    } else if (category === "Rent" && rentalType === "Apartment / Condo") {
      return {
        question: "What type of apartment are you looking for?",
        options: ["Studio", "1 Bedroom", "2 Bedrooms", "3+ Bedrooms", "Penthouse"]
      };
    } else {
      // Buy or "Either"
      return {
        question: "What type of property are you looking for?",
        options: ["Studio", "1 Bedroom", "2 Bedrooms", "3+ Bedrooms", "Penthouse"]
      };
    }
  };
  
  const findMatchingProperties = (data: any) => {
    let filtered = [...mockProperties];
    const exactMatches: any[] = [];
    const partialMatches: any[] = [];

    // Filter by category (buy/rent)
    if (data.propertyCategory === "Buy") {
      filtered = filtered.filter(p => p.category === "Sale");
    } else if (data.propertyCategory === "Rent") {
      filtered = filtered.filter(p => p.category === "Rent");
    }

    // Only show active properties
    filtered = filtered.filter(p => p.status === "Active");

    // Separate exact matches and partial matches
    filtered.forEach(prop => {
      let matchScore = 0;

      // Check location match
      if (data.location && data.location !== "Any location") {
        if (prop.location.includes(data.location)) {
          matchScore += 2;
        }
      } else {
        matchScore += 1; // Any location preference
      }

      // Check unit type match
      if (data.unitType) {
        const typeMap: any = {
          "Studio": "Studio",
          "1 Bedroom": "1BR",
          "2 Bedrooms": "2BR",
          "3+ Bedrooms": "3BR",
          "Penthouse": "Penthouse"
        };
        const searchType = typeMap[data.unitType];
        if (searchType && prop.type.includes(searchType)) {
          matchScore += 2;
        }
      } else {
        matchScore += 1; // No specific type preference
      }

      // Exact matches have score >= 3, partial matches have score < 3
      if (matchScore >= 3) {
        exactMatches.push(prop);
      } else {
        partialMatches.push(prop);
      }
    });

    // Always return exactly 3 properties
    let results: any[] = [];

    // First, add exact matches
    results = [...exactMatches.slice(0, 3)];

    // If we need more properties to reach 3, add partial matches
    if (results.length < 3) {
      const needed = 3 - results.length;
      results = [...results, ...partialMatches.slice(0, needed)];
    }

    // If still not enough, add any active properties from the same category
    if (results.length < 3) {
      const needed = 3 - results.length;
      const category = data.propertyCategory === "Buy" ? "Sale" :
                       data.propertyCategory === "Rent" ? "Rent" : null;

      const additionalProperties = mockProperties.filter(p =>
        p.status === "Active" &&
        (!category || p.category === category) &&
        !results.some(r => r.id === p.id)
      );

      results = [...results, ...additionalProperties.slice(0, needed)];
    }

    // Final fallback: if still not 3, just get any active properties
    if (results.length < 3) {
      const needed = 3 - results.length;
      const fallbackProperties = mockProperties.filter(p =>
        p.status === "Active" &&
        !results.some(r => r.id === p.id)
      );
      results = [...results, ...fallbackProperties.slice(0, needed)];
    }

    return results;
  };
  
  const calculateLeadScore = (data: any) => {
    let score = 50; // Base score
    
    // Budget factor
    if (data.budget && !data.budget.includes("Not sure")) score += 15;
    
    // Timeline factor
    if (data.timeline === "Within 30 days") score += 20;
    else if (data.timeline === "2-3 months") score += 15;
    else if (data.timeline === "3-6 months") score += 10;
    else score += 5;
    
    // Has specific preferences
    if (data.location && data.location !== "Any location") score += 10;
    if (data.unitType) score += 10;
    
    return Math.min(score, 95); // Max 95
  };
  
  const getLeadCategory = (score: number) => {
    if (score >= 80) return { category: "Hot", emoji: "🔥", color: "#EF2D2C" };
    if (score >= 60) return { category: "Warm", emoji: "⚡", color: "#F59E0B" };
    return { category: "Cold", emoji: "❄️", color: "#3B82F6" };
  };
  
  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      message: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    const currentInput = input;
    setInput("");

    // Scroll to bottom after adding user message
    setTimeout(scrollToBottom, 50);
    
    // Check if we're in scheduling flow (property-specific mode)
    if (step === -1 && schedulingData.date && schedulingData.time && !schedulingData.email) {
      setTimeout(() => {
        let responseMessage = "";
        let responseOptions: string[] | undefined;
        
        if (!schedulingData.name && !currentInput.includes("@") && !currentInput.match(/^\+?\d/)) {
          // Customer provided name
          const updatedScheduling = { ...schedulingData, name: currentInput };
          setSchedulingData(updatedScheduling);
          
          responseMessage = `Thank you, ${currentInput}! 😊\n\n` +
            `Please provide your phone number (WhatsApp preferred):\n\n` +
            `Example: +855 12 345 678`;
          responseOptions = undefined;
        } else if (schedulingData.name && !schedulingData.phone && currentInput.match(/^\+?\d/)) {
          // Customer provided phone
          const updatedScheduling = { ...schedulingData, phone: currentInput };
          setSchedulingData(updatedScheduling);
          
          responseMessage = `Great! 📱\n\n` +
            `Lastly, please provide your email address:`;
          responseOptions = undefined;
        } else if (schedulingData.name && schedulingData.phone && currentInput.includes("@")) {
          // Complete! All info collected
          const updatedScheduling = { ...schedulingData, email: currentInput };
          setSchedulingData(updatedScheduling);
          
          responseMessage = `🎉 **Viewing Confirmed!**\n\n` +
            `✅ **Booking Details:**\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Name: ${schedulingData.name}\n` +
            `📱 Phone: ${schedulingData.phone}\n` +
            `📧 Email: ${currentInput}\n\n` +
            `🏢 **Property Viewing:**\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏘️ ${schedulingData.property}\n` +
            `📅 Date: ${schedulingData.date}\n` +
            `⏰ Time: ${schedulingData.time}\n\n` +
            `📲 **Confirmation Details:**\n` +
            `• You'll receive a confirmation SMS within 5 minutes\n` +
            `• Email confirmation with property details sent\n` +
            `• Our consultant will call you 1 day before\n` +
            `• Google Calendar invite attached\n\n` +
            `📍 **Meeting Point:**\n` +
            `Property lobby/showroom - exact location in confirmation email\n\n` +
            `💼 **What to Bring:**\n` +
            `• Government ID (for security)\n` +
            `• Questions about the property\n` +
            `• Optional: Financial documents (if interested in financing)\n\n` +
            `🔄 **Need to Reschedule?**\n` +
            `Call us at +855 23 123 456 or reply to the confirmation email.\n\n` +
            `We look forward to showing you your future home! 🏡✨`;
          responseOptions = ["See Available Units", "Payment Plans", "Compare Properties", "Talk to Agent Now"];
          
          // Reset scheduling data for next booking
          setTimeout(() => setSchedulingData({}), 1000);
        }
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: responseMessage,
          timestamp: new Date().toISOString(),
          options: responseOptions
        };
        setMessages(prev => [...prev, botResponse]);
      }, 800);
      return;
    }
    
    // Regular conversation flow for general consultation
    const currentStep = conversationFlow[step];
    const updatedLeadData = { ...leadData, [currentStep.field]: currentInput };
    setLeadData(updatedLeadData);
    
    // Generate bot response
    setTimeout(() => {
      if (step < conversationFlow.length - 1) {
        const nextStep = step + 1;
        const nextQuestion = conversationFlow[nextStep];
        let questionText = nextQuestion.question;
        
        // Replace placeholders
        Object.keys(updatedLeadData).forEach(key => {
          questionText = questionText.replace(`{${key}}`, updatedLeadData[key]);
        });
        
        // Set rental type options dynamically
        if (nextQuestion.field === "rentalType") {
          if (updatedLeadData.propertyCategory === "Rent") {
            const rentalTypeOptions = getRentalTypeOptions(updatedLeadData.propertyCategory);
            if (rentalTypeOptions) {
              questionText = rentalTypeOptions.question;
              nextQuestion.options = rentalTypeOptions.options;
            }
          } else {
            // Skip rental type question for Buy or Not sure yet
            setStep(nextStep + 1);
            const skippedStep = nextStep + 1;
            const skippedQuestion = conversationFlow[skippedStep];
            let skippedQuestionText = skippedQuestion.question;
            
            // Replace placeholders
            Object.keys(updatedLeadData).forEach(key => {
              skippedQuestionText = skippedQuestionText.replace(`{${key}}`, updatedLeadData[key]);
            });
            
            // Set budget options for Buy
            if (skippedQuestion.field === "budget") {
              const budgetOptions = getBudgetOptions(updatedLeadData.propertyCategory);
              skippedQuestionText = budgetOptions.question;
              skippedQuestion.options = budgetOptions.options;
            }
            
            const botMessage: Message = {
              id: (Date.now() + 1).toString(),
              sender: 'bot',
              message: skippedQuestionText,
              timestamp: new Date().toISOString(),
              options: skippedQuestion.options
            };
            setMessages(prev => [...prev, botMessage]);
            return;
          }
        }
        
        // Set budget options dynamically
        if (nextQuestion.field === "budget" && updatedLeadData.propertyCategory) {
          const budgetOptions = getBudgetOptions(updatedLeadData.propertyCategory, updatedLeadData.rentalType);
          questionText = budgetOptions.question;
          nextQuestion.options = budgetOptions.options;
        }
        
        // Set unit type options dynamically
        if (nextQuestion.field === "unitType") {
          const unitTypeOptions = getUnitTypeOptions(updatedLeadData.propertyCategory, updatedLeadData.rentalType);
          questionText = unitTypeOptions.question;
          nextQuestion.options = unitTypeOptions.options;
        }
        
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: questionText,
          timestamp: new Date().toISOString(),
          options: nextQuestion.options
        };
        setMessages(prev => [...prev, botMessage]);
        setStep(nextStep);
      } else {
        // Find matching properties
        const matchingProperties = findMatchingProperties(updatedLeadData);
        const leadScore = calculateLeadScore(updatedLeadData);
        const leadInfo = getLeadCategory(leadScore);
        
        // Get unit details for matched properties
        const propertyDetails = matchingProperties.map(prop => {
          const units = mockUnits.filter(u => u.projectId === prop.id && u.status === "Available");
          return { ...prop, units };
        });
        
        // Final message with recommendations
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          message: `Thank you, ${updatedLeadData.name}! 🎉\n\n✅ **Your Profile Summary:**\n• Interest: ${updatedLeadData.propertyCategory}\n• Budget: ${updatedLeadData.budget}\n• Location: ${updatedLeadData.location}\n• Type: ${updatedLeadData.unitType}\n• Timeline: ${updatedLeadData.timeline}\n\n📊 **Lead Score: ${leadScore}/100** ${leadInfo.emoji} (${leadInfo.category} Lead)\n\n🏠 **Here are 3 excellent property options for you:**`,
          timestamp: new Date().toISOString(),
          properties: propertyDetails
        };
        setMessages(prev => [...prev, botMessage]);
        
        // Add follow-up message
        setTimeout(() => {
          const followUpMessage: Message = {
            id: (Date.now() + 2).toString(),
            sender: 'bot',
            message: `\n💼 **Next Steps:**\n\nOne of our senior sales consultants will contact you at:\n📞 ${updatedLeadData.phone}\n📧 ${updatedLeadData.email}\n\nExpected response time: Within 1 hour during business hours (9 AM - 6 PM)\n\nWhat would you like to do next?`,
            timestamp: new Date().toISOString(),
            options: ["Schedule Viewing", "See All Properties", "Talk to Agent Now", "Get Price Details"]
          };
          setMessages(prev => [...prev, followUpMessage]);
        }, 1500);
      }
    }, 1000);
  };
  
  const handleOptionClick = (option: string) => {
    setInput(option);
    setTimeout(() => {
      // Handle property-specific options
      if (step === -1 && propertyContext?.propertyId) {
        const property = mockProperties.find(p => p.id === propertyContext.propertyId);
        const units = mockUnits.filter(u => u.projectId === propertyContext.propertyId && u.status === "Available");
        
        const userMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          message: option,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        
        setTimeout(() => {
          let responseMessage = "";
          let responseOptions: string[] | undefined;
          
          if (option === "Show Available Units" && property) {
            const unitsList = units.map(u => 
              `\n🏠 **Unit ${u.unitNumber}** - ${u.type}\n` +
              `💰 Price: $${(u.price / 1000).toFixed(0)}K\n` +
              `📐 Size: ${u.size} sqm | 🛏️ ${u.bedrooms} Bed | 🚿 ${u.bathrooms} Bath\n` +
              `🏢 Floor: ${u.floor} | ✨ Status: ${u.status}\n` +
              `📝 Features: ${u.features.join(', ')}`
            ).join('\n\n');
            
            responseMessage = `🏢 **Available Units at ${property.projectName}**\n\nWe have ${units.length} available units:\n${unitsList}\n\nAll units come with premium amenities and flexible payment options.\n\nWould you like to know more about any specific unit?`;
            responseOptions = ["Payment Plans", "Schedule Viewing", "Investment Analysis", "Talk to Agent Now"];
          } else if (option === "Payment Plans" && property) {
            responseMessage = `💳 **Flexible Payment Plans for ${property.projectName}**\n\n` +
              `We offer multiple payment options:\n\n` +
              `**Option 1: Cash Purchase** 💰\n` +
              `• 5% discount on total price\n` +
              `• Immediate unit selection priority\n` +
              `• Free legal processing\n\n` +
              `**Option 2: Installment Plan** 📅\n` +
              `• 30% down payment\n` +
              `• Balance payable over 12-36 months\n` +
              `• 0% interest for 12 months\n` +
              `• Flexible payment schedule\n\n` +
              `**Option 3: Bank Financing** 🏦\n` +
              `• Partner with 5+ major banks\n` +
              `• Up to 80% loan approval\n` +
              `• Competitive interest rates (6-8%)\n` +
              `• Loan tenure up to 20 years\n\n` +
              `**Special Promotion:** Early bird gets additional 2% discount! 🎉\n\n` +
              `Would you like detailed calculations for your preferred unit?`;
            responseOptions = ["Show Available Units", "Schedule Viewing", "Talk to Agent Now"];
          } else if (option === "Schedule Viewing") {
            // Start the interactive scheduling flow
            setSchedulingData({ property: property?.projectName });
            responseMessage = `📅 **Schedule Your Property Viewing**\n\n` +
              `Great choice! I'll arrange a personalized viewing for **${property?.projectName}**.\n\n` +
              `**What's included:**\n` +
              `✅ Guided tour by senior property consultant\n` +
              `✅ See multiple units (if available)\n` +
              `✅ Explore all amenities & facilities\n` +
              `✅ Neighborhood tour\n` +
              `✅ Free refreshments\n` +
              `✅ Virtual tour option available\n\n` +
              `**Available viewing times:**\n` +
              `• Weekdays: 9 AM - 6 PM\n` +
              `• Weekends: 10 AM - 5 PM\n` +
              `• Private evening viewing: By appointment\n\n` +
              `When would you like to schedule your viewing?`;
            responseOptions = ["Today", "Tomorrow", "This Week", "Next Week", "Choose Specific Date"];
          } else if (["Today", "Tomorrow", "This Week", "Next Week", "Choose Specific Date"].includes(option)) {
            // Date selection - now ask for time slot
            const updatedScheduling = { ...schedulingData, date: option };
            setSchedulingData(updatedScheduling);
            
            const dateText = option === "Choose Specific Date" 
              ? "your preferred date" 
              : option === "Today" || option === "Tomorrow"
              ? option.toLowerCase()
              : option.toLowerCase().replace(" ", " ");
            
            responseMessage = `Perfect! You've selected **${option}** for your viewing.\n\n` +
              `📍 Property: **${schedulingData.property}**\n\n` +
              `Now, what time works best for you ${dateText}?`;
            responseOptions = [
              "Morning (9 AM - 12 PM)",
              "Afternoon (12 PM - 3 PM)",
              "Late Afternoon (3 PM - 6 PM)",
              "Evening (By Appointment)"
            ];
          } else if (option.includes("Morning") || option.includes("Afternoon") || option.includes("Evening") || option.includes("Late Afternoon")) {
            // Time slot selected - now ask for contact info
            const updatedScheduling = { ...schedulingData, time: option };
            setSchedulingData(updatedScheduling);
            
            responseMessage = `Excellent choice! ⏰\n\n` +
              `📋 **Your Viewing Details:**\n` +
              `🏢 Property: **${schedulingData.property}**\n` +
              `📅 Date: **${schedulingData.date}**\n` +
              `⏰ Time: **${option}**\n\n` +
              `To confirm your appointment, I'll need your contact information.\n\n` +
              `Please provide your name:`;
            responseOptions = undefined; // Free text input mode
          } else if (schedulingData.date && schedulingData.time && !schedulingData.name && !option.includes("@") && !option.match(/^\+?\d/)) {
            // Customer provided name
            const updatedScheduling = { ...schedulingData, name: option };
            setSchedulingData(updatedScheduling);
            
            responseMessage = `Thank you, ${option}! 😊\n\n` +
              `Please provide your phone number (WhatsApp preferred):\n\n` +
              `Example: +855 12 345 678`;
            responseOptions = undefined;
          } else if (schedulingData.name && !schedulingData.phone && option.match(/^\+?\d/)) {
            // Customer provided phone
            const updatedScheduling = { ...schedulingData, phone: option };
            setSchedulingData(updatedScheduling);
            
            responseMessage = `Great! 📱\n\n` +
              `Lastly, please provide your email address:`;
            responseOptions = undefined;
          } else if (schedulingData.name && schedulingData.phone && option.includes("@") && !schedulingData.email) {
            // Complete! All info collected
            const updatedScheduling = { ...schedulingData, email: option };
            setSchedulingData(updatedScheduling);
            
            responseMessage = `🎉 **Viewing Confirmed!**\n\n` +
              `✅ **Booking Details:**\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `👤 Name: ${schedulingData.name}\n` +
              `📱 Phone: ${schedulingData.phone}\n` +
              `📧 Email: ${option}\n\n` +
              `🏢 **Property Viewing:**\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `🏘️ ${schedulingData.property}\n` +
              `📅 Date: ${schedulingData.date}\n` +
              `⏰ Time: ${schedulingData.time}\n\n` +
              `📲 **Confirmation Details:**\n` +
              `• You'll receive a confirmation SMS within 5 minutes\n` +
              `• Email confirmation with property details sent\n` +
              `• Our consultant will call you 1 day before\n` +
              `• Google Calendar invite attached\n\n` +
              `📍 **Meeting Point:**\n` +
              `Property lobby/showroom - exact location in confirmation email\n\n` +
              `💼 **What to Bring:**\n` +
              `• Government ID (for security)\n` +
              `• Questions about the property\n` +
              `• Optional: Financial documents (if interested in financing)\n\n` +
              `🔄 **Need to Reschedule?**\n` +
              `Call us at +855 23 123 456 or reply to the confirmation email.\n\n` +
              `We look forward to showing you your future home! 🏡✨`;
            responseOptions = ["See Available Units", "Payment Plans", "Compare Properties", "Talk to Agent Now"];
            
            // Reset scheduling data for next booking
            setTimeout(() => setSchedulingData({}), 1000);
          } else if (option === "Investment Analysis" && property) {
            const avgUnitPrice = units.length > 0 
              ? (units.reduce((sum, u) => sum + u.price, 0) / units.length / 1000).toFixed(0)
              : "N/A";
            
            responseMessage = `📊 **Investment Analysis for ${property.projectName}**\n\n` +
              `**Property Investment Overview:**\n\n` +
              `📈 **ROI Projections**\n` +
              `• Average Price: $${avgUnitPrice}K\n` +
              `• Expected Appreciation: 8-12% per year\n` +
              `• Rental Yield: 5-7% annually\n` +
              `• 5-Year Projected ROI: 40-60%\n\n` +
              `🏗️ **Location Advantage**\n` +
              `• ${property.location} - Prime area\n` +
              `• High demand rental market\n` +
              `• Growing business district\n` +
              `• Easy access to amenities\n\n` +
              `💼 **Rental Income Potential**\n` +
              `• Studio: $500-800/month\n` +
              `• 1BR: $800-1,200/month\n` +
              `• 2BR: $1,200-1,800/month\n` +
              `• 3BR+: $1,800-2,500/month\n\n` +
              `✨ **Investment Benefits**\n` +
              `• High-quality construction\n` +
              `• Premium amenities attract tenants\n` +
              `• Professional property management available\n` +
              `• Strong capital appreciation potential\n\n` +
              `Would you like a detailed investment proposal for a specific unit?`;
            responseOptions = ["Show Available Units", "Payment Plans", "Talk to Agent Now"];
          } else if (option === "Compare with Other Properties") {
            const similarProperties = mockProperties
              .filter(p => 
                p.id !== propertyContext.propertyId && 
                p.status === "Active" &&
                p.category === property?.category &&
                p.location.split(',')[1]?.trim() === property?.location.split(',')[1]?.trim()
              )
              .slice(0, 2);
            
            responseMessage = `🔍 **Property Comparison**\n\n` +
              `Here are similar properties in the same area:\n\n` +
              `**Current Selection: ${property?.projectName}**\n` +
              `📍 ${property?.location}\n` +
              `💰 ${property?.priceRange}\n` +
              `🏠 ${property?.type.join(', ')}\n` +
              `⭐ ${property?.availableUnits} units available\n\n` +
              (similarProperties.length > 0 
                ? similarProperties.map((p, i) => 
                    `**Alternative ${i + 1}: ${p.projectName}**\n` +
                    `📍 ${p.location}\n` +
                    `💰 ${p.priceRange}\n` +
                    `🏠 ${p.type.join(', ')}\n` +
                    `⭐ ${p.availableUnits} units available`
                  ).join('\n\n') + '\n\n'
                : 'No similar properties found in this area.\n\n') +
              `Our property consultant can provide detailed comparisons.\n\n` +
              `Would you like to schedule viewings for multiple properties?`;
            responseOptions = ["Schedule Viewing", "Show Available Units", "Talk to Agent Now"];
          } else if (option === "Talk to Agent Now") {
            responseMessage = `👨‍💼 **Connecting to Senior Property Consultant**\n\n` +
              `I'm connecting you with our expert team who specializes in ${property?.projectName}.\n\n` +
              `**Contact Information:**\n` +
              `📞 Direct Line: +855 23 123 456\n` +
              `📱 WhatsApp: https://wa.me/85512345678\n` +
              `💬 Telegram: https://t.me/ERAcambodia_bot\n` +
              `💬 Messenger: https://m.me/ERAcambodia\n` +
              `📧 Email: sales@eracambodia.com\n\n` +
              `**Our consultants can help with:**\n` +
              `• Personalized unit recommendations\n` +
              `• Detailed pricing & payment plans\n` +
              `• Property viewing arrangements\n` +
              `• Investment consulting\n` +
              `• Legal & financing assistance\n\n` +
              `⏱️ **Average Response Time:** 2-5 minutes\n` +
              `🕐 **Office Hours:** Mon-Sat, 9 AM - 6 PM\n\n` +
              `You can also leave your contact details and we'll call you immediately!`;
            responseOptions = ["Provide Contact Info", "Show Available Units", "See More Properties"];
          } else if (option === "Provide Contact Info") {
            responseMessage = `📋 **Contact Information**\n\n` +
              `Thank you for your interest in ${property?.projectName}! 🎉\n\n` +
              `Please provide:\n` +
              `1️⃣ Your full name\n` +
              `2️⃣ Phone number (WhatsApp preferred)\n` +
              `3️⃣ Email address\n` +
              `4️⃣ Preferred contact time\n\n` +
              `Our senior property consultant will contact you within 1 hour with:\n` +
              `✅ Detailed property information\n` +
              `✅ Viewing schedule options\n` +
              `✅ Special promotional offers\n` +
              `✅ Personalized recommendations\n\n` +
              `You can type your details or use the voice message feature.`;
            responseOptions = undefined;
          } else if (option === "See More Properties") {
            responseMessage = `🏢 **Explore More Properties**\n\n` +
              `ERA Cambodia offers ${mockProperties.length}+ premium properties across Phnom Penh.\n\n` +
              `**Browse by:**\n` +
              `🏙️ Location: BKK1, BKK2, Chamkarmon, Riverside, Diamond Island\n` +
              `💰 Budget: $60K - $500K+ (Buy) | $300-$7000/month (Rent)\n` +
              `🏠 Type: Studio, 1BR, 2BR, 3BR+, Penthouse, Office\n\n` +
              `Would you like me to find properties matching your specific criteria?`;
            responseOptions = ["Start Property Search", "Talk to Agent Now", "Back to " + property?.projectName];
          }
          
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            message: responseMessage,
            timestamp: new Date().toISOString(),
            options: responseOptions
          };
          setMessages(prev => [...prev, botResponse]);
        }, 800);
        
        return;
      }
      
      // Handle general conversation options
      if (step >= conversationFlow.length - 1) {
        // Handle post-conversation options
        const userMessage: Message = {
          id: Date.now().toString(),
          sender: 'user',
          message: option,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, userMessage]);
        
        setTimeout(() => {
          let responseMessage = "";
          if (option === "Schedule Viewing") {
            responseMessage = "Great! 📅 Our team will contact you within the next hour to schedule viewings for your selected properties. You'll receive:\n\n✅ Viewing appointment confirmation\n✅ Property location details\n✅ Meet & greet with property consultant\n✅ Virtual tour option available\n\nIs there anything else I can help you with?";
          } else if (option === "See All Properties") {
            responseMessage = "Perfect! 🏢 Click the button below to browse all available properties. You can filter by location, price, and property type.\n\nOur AI will continue to learn your preferences and send you personalized recommendations!";
          } else if (option === "Talk to Agent Now") {
            responseMessage = "Connecting you to our senior property consultant... 👨‍💼\n\nMeanwhile, you can also reach us at:\n📞 +855 23 123 456\n📱 WhatsApp: https://wa.me/85512345678\n💬 Telegram: https://t.me/ERAcambodia_bot\n💬 Messenger: https://m.me/ERAcambodia\n\nAverage response time: 2-5 minutes";
          } else if (option === "Get Price Details") {
            responseMessage = "I'll send detailed pricing information including:\n\n💰 Unit prices & payment plans\n📊 Price breakdown & fees\n🏦 Financing options available\n📈 ROI projections\n\nThis will be sent to your email within 15 minutes. Our consultant will also call you to discuss further!";
          }
          
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            message: responseMessage,
            timestamp: new Date().toISOString(),
            options: option === "See All Properties" ? undefined : ["See All Properties", "Restart Consultation"]
          };
          setMessages(prev => [...prev, botResponse]);
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
                <span className="text-sm text-gray-100">Online • Instant Response</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Messages */}
        <div ref={messagesContainerRef} className="p-6 overflow-y-auto" style={{ height: 'calc(100% - 200px)' }}>
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-2xl ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`rounded-full p-2`} style={{ backgroundColor: msg.sender === 'user' ? '#EF2D2C' : '#f3f4f6' }}>
                    {msg.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-gray-700" />
                    )}
                  </div>
                  <div>
                    <div className={`p-4 rounded-2xl ${
                      msg.sender === 'user' 
                        ? 'text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                    style={msg.sender === 'user' ? { backgroundColor: '#EF2D2C' } : {}}
                    >
                      <p className="whitespace-pre-line">{msg.message}</p>
                    </div>
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(option)}
                            className="px-4 py-2 bg-white border-2 rounded-lg transition text-sm font-medium"
                            style={{ 
                              borderColor: '#EF2D2C',
                              color: '#EF2D2C'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#EF2D2C';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                              e.currentTarget.style.color = '#EF2D2C';
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.properties && msg.properties.length > 0 && (
                      <div className="mt-4 space-y-4">
                        {msg.properties.map((prop: any, idx: number) => {
                          // Define property images
                          const propertyImages = [
                            "https://images.unsplash.com/photo-1594904578869-c011783103c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMHBobm9tJTIwcGVuaHxlbnwxfHx8fDE3NzUyODE5NzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                            "https://images.unsplash.com/photo-1603072388139-565853396b38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb25kbyUyMGludGVyaW9yJTIwYmVkcm9vbXxlbnwxfHx8fDE3NzUyODE5NzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
                            "https://images.unsplash.com/photo-1760611655987-d348d6d28174?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBwZW50aG91c2UlMjBsaXZpbmclMjBzcGFjZXxlbnwxfHx8fDE3NzUyODE5Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                          ];
                          
                          return (
                            <motion.div 
                              key={idx} 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: idx * 0.1 }}
                              className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#EF2D2C] hover:shadow-lg transition-all"
                            >
                              {/* Property Image */}
                              <div className="relative h-48 overflow-hidden">
                                <ImageWithFallback
                                  src={propertyImages[idx % 3]}
                                  alt={prop.projectName}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-lg">
                                  {prop.availableUnits} Available
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                  <h3 className="text-xl font-bold text-white">{prop.projectName}</h3>
                                  <div className="flex items-center space-x-1 text-sm text-white mt-1">
                                    <MapPin className="w-4 h-4" />
                                    <span>{prop.location}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Property Details */}
                              <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-700">{prop.type.join(', ')}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <DollarSign className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                                    <span className="font-bold text-gray-900">{prop.priceRange}</span>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {prop.amenities.slice(0, 4).map((amenity: string, i: number) => (
                                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      {amenity}
                                    </span>
                                  ))}
                                </div>
                                
                                <Link
                                  to="/properties"
                                  className="block w-full text-center px-4 py-2.5 rounded-lg font-semibold text-white transition-all hover:shadow-md"
                                  style={{ backgroundColor: '#EF2D2C' }}
                                >
                                  View Details →
                                </Link>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef}></div>
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
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B0A1C'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF2D2C'}
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Your data is securely stored in Odoo CRM • Response time: &lt;1 second
          </p>
        </div>
      </div>
    </div>
  );
}