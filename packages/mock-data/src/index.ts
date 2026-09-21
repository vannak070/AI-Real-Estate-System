// Mock data for the real estate AI system

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'Facebook' | 'Website' | 'Telegram' | 'WhatsApp';
  status: 'New' | 'Contacted' | 'Qualified' | 'Viewing' | 'Negotiating' | 'Won' | 'Lost';
  score: number;
  category: 'Hot' | 'Warm' | 'Cold';
  budget: number;
  preferredLocation: string;
  unitType: string;
  timeline: string;
  assignedTo: string;
  createdAt: string;
  lastContact: string;
  notes: string;
}

export interface Property {
  id: string;
  projectName: string;
  location: string;
  totalUnits: number;
  availableUnits: number;
  priceRange: string;
  type: string[];
  amenities: string[];
  image: string;
  status: 'Active' | 'Sold Out' | 'Coming Soon';
  category: 'Sale' | 'Rent';
}

export interface Unit {
  id: string;
  projectId: string;
  projectName: string;
  unitNumber: string;
  type: string;
  size: number;
  bedrooms: number;
  bathrooms: number;
  price: number;
  floor: number;
  status: 'Available' | 'Reserved' | 'Sold';
  features: string[];
}

export interface SalesPerson {
  id: string;
  name: string;
  role: string;
  leadsAssigned: number;
  leadsConverted: number;
  conversionRate: number;
  revenue: number;
  avatar: string;
}

export interface AIAgent {
  id: string;
  name: string;
  type: string;
  description: string;
  status: 'Active' | 'Idle' | 'Error';
  tasksCompleted: number;
  accuracy: number;
  lastActivity: string;
}

export interface AIAssistantChannel {
  id: string;
  name: string;
  platform: 'Facebook' | 'Telegram' | 'WhatsApp';
  enabled: boolean;
  status: 'Connected' | 'Disconnected' | 'Error';
  responseTime: string;
  messagesHandled: number;
  lastActive: string;
  sampleLink?: string; // Optional sample link for each platform
  configuration: {
    autoReply: boolean;
    workingHours: string;
    language: string;
    fallbackToHuman: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  message: string;
  timestamp: string;
  options?: string[];
}

export const mockLeads: Lead[] = [
  {
    id: 'L001',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+855 12 345 678',
    source: 'Facebook',
    status: 'Qualified',
    score: 85,
    category: 'Hot',
    budget: 180000,
    preferredLocation: 'BKK1',
    unitType: '2 Bedroom',
    timeline: 'Within 30 days',
    assignedTo: 'John Smith',
    createdAt: '2026-04-01T10:30:00',
    lastContact: '2026-04-04T09:15:00',
    notes: 'Very interested in luxury units. Has financing pre-approved.'
  },
  {
    id: 'L002',
    name: 'Michael Chen',
    email: 'mchen@email.com',
    phone: '+855 23 456 789',
    source: 'Website',
    status: 'Viewing',
    score: 92,
    category: 'Hot',
    budget: 280000,
    preferredLocation: 'Chamkarmon',
    unitType: '3 Bedroom',
    timeline: 'Within 14 days',
    assignedTo: 'Sarah Williams',
    createdAt: '2026-03-28T14:20:00',
    lastContact: '2026-04-03T16:30:00',
    notes: 'Scheduled viewing for April 6th. Investment buyer.'
  },
  {
    id: 'L003',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+855 34 567 890',
    source: 'Telegram',
    status: 'Contacted',
    score: 65,
    category: 'Warm',
    budget: 120000,
    preferredLocation: 'BKK2',
    unitType: '1 Bedroom',
    timeline: '2-3 months',
    assignedTo: 'Mike Johnson',
    createdAt: '2026-04-02T11:45:00',
    lastContact: '2026-04-03T10:00:00',
    notes: 'First-time buyer. Needs more information.'
  },
  {
    id: 'L004',
    name: 'David Kim',
    email: 'dkim@email.com',
    phone: '+855 45 678 901',
    source: 'WhatsApp',
    status: 'New',
    score: 45,
    category: 'Cold',
    budget: 75000,
    preferredLocation: 'Toul Kork',
    unitType: 'Studio',
    timeline: '6+ months',
    assignedTo: 'AI Agent',
    createdAt: '2026-04-04T08:20:00',
    lastContact: '2026-04-04T08:20:00',
    notes: 'Just browsing. Budget unclear.'
  },
  {
    id: 'L005',
    name: 'Lisa Anderson',
    email: 'lisa.a@email.com',
    phone: '+855 56 789 012',
    source: 'Facebook',
    status: 'Negotiating',
    score: 88,
    category: 'Hot',
    budget: 220000,
    preferredLocation: 'BKK1',
    unitType: '2 Bedroom',
    timeline: 'Immediate',
    assignedTo: 'John Smith',
    createdAt: '2026-03-25T09:00:00',
    lastContact: '2026-04-04T11:00:00',
    notes: 'Negotiating price. Very close to closing.'
  }
];

export const mockProperties: Property[] = [
  {
    id: 'P001',
    projectName: 'BKK1 Residences',
    location: 'Street 240, BKK1, Phnom Penh',
    totalUnits: 150,
    availableUnits: 45,
    priceRange: '$150K - $350K',
    type: ['Studio', '1BR', '2BR', '3BR'],
    amenities: ['Pool', 'Gym', 'Sky Lounge', 'Parking', 'Security 24/7'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P002',
    projectName: 'Riverside Elite Tower',
    location: 'Sisowath Quay, Riverside, Phnom Penh',
    totalUnits: 200,
    availableUnits: 68,
    priceRange: '$200K - $550K',
    type: ['1BR', '2BR', '3BR', 'Penthouse'],
    amenities: ['Infinity Pool', 'Spa', 'Fitness Center', 'Concierge', 'River View'],
    image: 'cambodia-riverside-condo',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P003',
    projectName: 'BKK2 Modern Living',
    location: 'Street 306, BKK2, Phnom Penh',
    totalUnits: 100,
    availableUnits: 12,
    priceRange: '$100K - $250K',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Co-working Space', 'Rooftop Garden'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P004',
    projectName: 'Chamkarmon Plaza',
    location: 'Street 163, Chamkarmon, Phnom Penh',
    totalUnits: 250,
    availableUnits: 95,
    priceRange: '$80K - $220K',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Parking', 'Shuttle Service', 'Shopping Center'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P005',
    projectName: 'Diamond Island Luxury',
    location: 'Koh Pich, Diamond Island, Phnom Penh',
    totalUnits: 80,
    availableUnits: 0,
    priceRange: '$500K - $1.5M',
    type: ['2BR', '3BR', 'Penthouse'],
    amenities: ['Private Marina', 'Wine Cellar', 'Cinema', 'Spa', 'Concierge Service'],
    image: 'diamond-island-luxury-residence',
    status: 'Sold Out',
    category: 'Sale'
  },
  // Rental Properties
  {
    id: 'P006',
    projectName: 'Urban Living BKK1',
    location: 'Street 308, BKK1, Phnom Penh',
    totalUnits: 120,
    availableUnits: 28,
    priceRange: '$800 - $2,000/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Parking', 'Security 24/7', 'Near Shopping'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P007',
    projectName: 'Riverside Apartments',
    location: 'Street 110, Riverside, Phnom Penh',
    totalUnits: 85,
    availableUnits: 15,
    priceRange: '$1,200 - $3,500/mo',
    type: ['1BR', '2BR', '3BR'],
    amenities: ['River View', 'Pool', 'Gym', 'Restaurant', 'Concierge'],
    image: 'cambodia-riverside-condo',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P008',
    projectName: 'BKK2 Executive Suites',
    location: 'Street 310, BKK2, Phnom Penh',
    totalUnits: 60,
    availableUnits: 22,
    priceRange: '$600 - $1,500/mo',
    type: ['Studio', '1BR'],
    amenities: ['Fully Furnished', 'Gym', 'Parking', 'Housekeeping'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P009',
    projectName: 'Chamkarmon Residences',
    location: 'Street 155, Chamkarmon, Phnom Penh',
    totalUnits: 95,
    availableUnits: 34,
    priceRange: '$500 - $1,200/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Near Market', 'Parking', 'Elevator'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Rent'
  },
  // Additional Sale Properties
  {
    id: 'P010',
    projectName: 'Tonle Bassac Heights',
    location: 'Street 360, Tonle Bassac, Phnom Penh',
    totalUnits: 180,
    availableUnits: 52,
    priceRange: '$180K - $420K',
    type: ['1BR', '2BR', '3BR', 'Penthouse'],
    amenities: ['Rooftop Pool', 'Gym', 'Kids Playground', 'BBQ Area', 'Smart Home System'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P011',
    projectName: 'BKK1 Sky Garden',
    location: 'Street 278, BKK1, Phnom Penh',
    totalUnits: 120,
    availableUnits: 38,
    priceRange: '$220K - $500K',
    type: ['2BR', '3BR', 'Penthouse'],
    amenities: ['Sky Garden', 'Infinity Pool', 'Yoga Studio', 'Business Center', 'Pet Friendly'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P012',
    projectName: 'Olympic Stadium Tower',
    location: 'Street 282, Olympic, Phnom Penh',
    totalUnits: 220,
    availableUnits: 78,
    priceRange: '$90K - $280K',
    type: ['Studio', '1BR', '2BR', '3BR'],
    amenities: ['Pool', 'Gym', 'Tennis Court', 'Cafe', 'Mini Mart'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P013',
    projectName: 'Riverside Pearl',
    location: 'Street 104, Riverside, Phnom Penh',
    totalUnits: 140,
    availableUnits: 41,
    priceRange: '$250K - $600K',
    type: ['1BR', '2BR', '3BR', 'Penthouse'],
    amenities: ['River View', 'Infinity Pool', 'Wine Bar', 'Library', 'Valet Parking'],
    image: 'cambodia-riverside-condo',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P014',
    projectName: 'BKK2 Central Park',
    location: 'Street 320, BKK2, Phnom Penh',
    totalUnits: 160,
    availableUnits: 55,
    priceRange: '$130K - $320K',
    type: ['Studio', '1BR', '2BR', '3BR'],
    amenities: ['Central Park View', 'Pool', 'Gym', 'Co-working Space', 'Food Court'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P015',
    projectName: 'Daun Penh Premier',
    location: 'Street 118, Daun Penh, Phnom Penh',
    totalUnits: 100,
    availableUnits: 29,
    priceRange: '$170K - $380K',
    type: ['1BR', '2BR', '3BR'],
    amenities: ['Pool', 'Gym', 'Sauna', 'Garden', 'Security 24/7'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P016',
    projectName: 'Toul Kork Elite',
    location: 'Street 289, Toul Kork, Phnom Penh',
    totalUnits: 130,
    availableUnits: 47,
    priceRange: '$110K - $270K',
    type: ['Studio', '1BR', '2BR', '3BR'],
    amenities: ['Pool', 'Gym', 'Kids Play Area', 'Parking', 'Near School'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P017',
    projectName: 'Sen Sok Garden City',
    location: 'Street 371, Sen Sok, Phnom Penh',
    totalUnits: 280,
    availableUnits: 112,
    priceRange: '$65K - $180K',
    type: ['Studio', '1BR', '2BR', '3BR'],
    amenities: ['Garden', 'Pool', 'Gym', 'Basketball Court', 'Shopping Mall'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P018',
    projectName: 'Koh Pich Waterfront',
    location: 'Diamond Island, Koh Pich, Phnom Penh',
    totalUnits: 95,
    availableUnits: 18,
    priceRange: '$380K - $950K',
    type: ['2BR', '3BR', 'Penthouse'],
    amenities: ['Marina View', 'Private Beach', 'Spa', 'Fine Dining', 'Concierge'],
    image: 'diamond-island-luxury-residence',
    status: 'Active',
    category: 'Sale'
  },
  {
    id: 'P019',
    projectName: 'Russian Market Residences',
    location: 'Street 450, Toul Tom Poung, Phnom Penh',
    totalUnits: 110,
    availableUnits: 33,
    priceRange: '$95K - $240K',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Near Market', 'Restaurant', 'Parking'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Sale'
  },
  // Additional Rental Properties
  {
    id: 'P020',
    projectName: 'BKK1 Executive Apartments',
    location: 'Street 242, BKK1, Phnom Penh',
    totalUnits: 75,
    availableUnits: 19,
    priceRange: '$1,500 - $3,000/mo',
    type: ['1BR', '2BR', '3BR'],
    amenities: ['Fully Furnished', 'Pool', 'Gym', 'Housekeeping', 'High-speed Internet'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P021',
    projectName: 'Riverside Serviced Suites',
    location: 'Street 102, Riverside, Phnom Penh',
    totalUnits: 65,
    availableUnits: 11,
    priceRange: '$2,000 - $5,000/mo',
    type: ['1BR', '2BR', '3BR', 'Penthouse'],
    amenities: ['River View', 'Daily Cleaning', 'Restaurant', 'Concierge', 'Laundry Service'],
    image: 'cambodia-riverside-condo',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P022',
    projectName: 'Tonle Bassac Living',
    location: 'Street 368, Tonle Bassac, Phnom Penh',
    totalUnits: 90,
    availableUnits: 26,
    priceRange: '$700 - $1,800/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Parking', 'Security', 'Near Embassy'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P023',
    projectName: 'BKK2 Comfort Suites',
    location: 'Street 302, BKK2, Phnom Penh',
    totalUnits: 80,
    availableUnits: 24,
    priceRange: '$650 - $1,400/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Furnished', 'Pool', 'Gym', 'WiFi', 'Parking'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P024',
    projectName: 'Chamkarmon Studio Plus',
    location: 'Street 163, Chamkarmon, Phnom Penh',
    totalUnits: 120,
    availableUnits: 42,
    priceRange: '$400 - $900/mo',
    type: ['Studio', '1BR'],
    amenities: ['Gym', 'Parking', 'Elevator', 'Near Market', 'Security'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P025',
    projectName: 'Toul Kork Family Homes',
    location: 'Street 315, Toul Kork, Phnom Penh',
    totalUnits: 70,
    availableUnits: 18,
    priceRange: '$800 - $2,200/mo',
    type: ['2BR', '3BR'],
    amenities: ['Pool', 'Kids Play Area', 'Gym', 'Parking', 'Near School'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P026',
    projectName: 'Diamond Island Luxury Rentals',
    location: 'Koh Pich, Diamond Island, Phnom Penh',
    totalUnits: 45,
    availableUnits: 8,
    priceRange: '$3,500 - $7,000/mo',
    type: ['2BR', '3BR', 'Penthouse'],
    amenities: ['Marina View', 'Full Service', 'Spa', 'Fine Dining', 'Private Beach'],
    image: 'diamond-island-luxury-residence',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P027',
    projectName: 'Daun Penh City Apartments',
    location: 'Street 136, Daun Penh, Phnom Penh',
    totalUnits: 85,
    availableUnits: 23,
    priceRange: '$600 - $1,500/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Gym', 'Parking', 'Near Central Market', 'Security', 'WiFi'],
    image: 'phnom-penh-luxury-condo',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P028',
    projectName: 'Sen Sok Affordable Living',
    location: 'Street 385, Sen Sok, Phnom Penh',
    totalUnits: 140,
    availableUnits: 56,
    priceRange: '$300 - $800/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Pool', 'Gym', 'Parking', 'Near Mall', 'Security'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P029',
    projectName: 'Olympic Commercial Suites',
    location: 'Street 271, Olympic, Phnom Penh',
    totalUnits: 55,
    availableUnits: 14,
    priceRange: '$900 - $2,500/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Business Center', 'Gym', 'Meeting Rooms', 'Parking', 'High-speed Internet'],
    image: 'modern-phnom-penh-apartment',
    status: 'Active',
    category: 'Rent'
  },
  {
    id: 'P030',
    projectName: 'Russian Market Lofts',
    location: 'Street 440, Toul Tom Poung, Phnom Penh',
    totalUnits: 60,
    availableUnits: 17,
    priceRange: '$550 - $1,300/mo',
    type: ['Studio', '1BR', '2BR'],
    amenities: ['Loft Style', 'Gym', 'Near Market', 'Cafe', 'Parking'],
    image: 'cambodia-urban-residential',
    status: 'Active',
    category: 'Rent'
  }
];

export const mockUnits: Unit[] = [
  {
    id: 'U001',
    projectId: 'P001',
    projectName: 'BKK1 Residences',
    unitNumber: 'A-1205',
    type: '2 Bedroom',
    size: 85,
    bedrooms: 2,
    bathrooms: 2,
    price: 245000,
    floor: 12,
    status: 'Available',
    features: ['Corner Unit', 'City View', 'Balcony', 'Built-in Kitchen']
  },
  {
    id: 'U002',
    projectId: 'P001',
    projectName: 'BKK1 Residences',
    unitNumber: 'B-0804',
    type: '1 Bedroom',
    size: 45,
    bedrooms: 1,
    bathrooms: 1,
    price: 165000,
    floor: 8,
    status: 'Available',
    features: ['Smart Home', 'Pool View', 'Walk-in Closet']
  },
  {
    id: 'U003',
    projectId: 'P002',
    projectName: 'Riverside Elite Tower',
    unitNumber: 'T-2201',
    type: '3 Bedroom',
    size: 125,
    bedrooms: 3,
    bathrooms: 3,
    price: 485000,
    floor: 22,
    status: 'Available',
    features: ['Riverside View', 'Master Suite', 'Guest Room', 'Study Room']
  },
  {
    id: 'U004',
    projectId: 'P003',
    projectName: 'BKK2 Modern Living',
    unitNumber: 'C-0605',
    type: '1 Bedroom',
    size: 52,
    bedrooms: 1,
    bathrooms: 1,
    price: 135000,
    floor: 6,
    status: 'Reserved',
    features: ['Garden View', 'Modern Kitchen', 'Smart Lock']
  },
  {
    id: 'U005',
    projectId: 'P004',
    projectName: 'Chamkarmon Plaza',
    unitNumber: 'D-1508',
    type: 'Studio',
    size: 32,
    bedrooms: 1,
    bathrooms: 1,
    price: 95000,
    floor: 15,
    status: 'Available',
    features: ['High Floor', 'City View', 'Near Shopping']
  }
];

export const mockSalesTeam: SalesPerson[] = [
  {
    id: 'S001',
    name: 'John Smith',
    role: 'Senior Sales Manager',
    leadsAssigned: 45,
    leadsConverted: 18,
    conversionRate: 40,
    revenue: 3200000,
    avatar: 'business-professional-man'
  },
  {
    id: 'S002',
    name: 'Sarah Williams',
    role: 'Sales Executive',
    leadsAssigned: 38,
    leadsConverted: 12,
    conversionRate: 31.6,
    revenue: 2400000,
    avatar: 'business-professional-woman'
  },
  {
    id: 'S003',
    name: 'Mike Johnson',
    role: 'Sales Executive',
    leadsAssigned: 42,
    leadsConverted: 14,
    conversionRate: 33.3,
    revenue: 2600000,
    avatar: 'business-man-smiling'
  },
  {
    id: 'S004',
    name: 'Emily Chen',
    role: 'Junior Sales',
    leadsAssigned: 35,
    leadsConverted: 8,
    conversionRate: 22.9,
    revenue: 1500000,
    avatar: 'young-professional-woman'
  },
  {
    id: 'S005',
    name: 'David Park',
    role: 'Junior Sales',
    leadsAssigned: 30,
    leadsConverted: 6,
    conversionRate: 20,
    revenue: 1200000,
    avatar: 'young-professional-man'
  }
];

export const mockAIAgents: AIAgent[] = [
  {
    id: 'A001',
    name: 'Lead Qualification Bot',
    type: 'Lead Qualification',
    description: 'Engages with new leads and collects structured qualification data',
    status: 'Active',
    tasksCompleted: 1247,
    accuracy: 94.5,
    lastActivity: '2 minutes ago'
  },
  {
    id: 'A002',
    name: 'Smart Scorer',
    type: 'Lead Scoring',
    description: 'Analyzes lead behavior and assigns priority scores',
    status: 'Active',
    tasksCompleted: 1189,
    accuracy: 91.2,
    lastActivity: '5 minutes ago'
  },
  {
    id: 'A003',
    name: 'Property Matcher',
    type: 'Property Matching',
    description: 'Recommends best-fit properties based on customer preferences',
    status: 'Active',
    tasksCompleted: 856,
    accuracy: 88.7,
    lastActivity: '1 minute ago'
  },
  {
    id: 'A004',
    name: 'Follow-Up Automator',
    type: 'Follow-Up',
    description: 'Manages automated engagement sequences across multiple channels',
    status: 'Active',
    tasksCompleted: 2341,
    accuracy: 96.8,
    lastActivity: '10 minutes ago'
  },
  {
    id: 'A005',
    name: 'Price Optimizer',
    type: 'Pricing',
    description: 'Analyzes market data and suggests optimal pricing strategies',
    status: 'Idle',
    tasksCompleted: 423,
    accuracy: 85.4,
    lastActivity: '2 hours ago'
  },
  {
    id: 'A006',
    name: 'Insight Generator',
    type: 'Analytics',
    description: 'Generates actionable business insights from sales and lead data',
    status: 'Active',
    tasksCompleted: 645,
    accuracy: 92.1,
    lastActivity: '30 minutes ago'
  }
];

export const mockAIAssistantChannels: AIAssistantChannel[] = [
  {
    id: 'C001',
    name: 'Facebook Messenger',
    platform: 'Facebook',
    enabled: true,
    status: 'Connected',
    responseTime: '1 minute',
    messagesHandled: 500,
    lastActive: '5 minutes ago',
    sampleLink: 'https://m.me/ERAcambodia',
    configuration: {
      autoReply: true,
      workingHours: '9 AM - 5 PM',
      language: 'English',
      fallbackToHuman: true
    }
  },
  {
    id: 'C002',
    name: 'Telegram Bot',
    platform: 'Telegram',
    enabled: true,
    status: 'Connected',
    responseTime: '30 seconds',
    messagesHandled: 300,
    lastActive: '2 minutes ago',
    sampleLink: 'https://t.me/ERAcambodia_bot',
    configuration: {
      autoReply: true,
      workingHours: '24/7',
      language: 'English',
      fallbackToHuman: false
    }
  },
  {
    id: 'C003',
    name: 'WhatsApp Chatbot',
    platform: 'WhatsApp',
    enabled: true,
    status: 'Connected',
    responseTime: '1 minute',
    messagesHandled: 400,
    lastActive: '3 minutes ago',
    sampleLink: 'https://wa.me/85512345678',
    configuration: {
      autoReply: true,
      workingHours: '9 AM - 5 PM',
      language: 'English',
      fallbackToHuman: true
    }
  }
];

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'M001',
    sender: 'bot',
    message: 'Hello! Welcome to our real estate AI assistant. I\'m here to help you find your perfect property. What\'s your name?',
    timestamp: '2026-04-04T10:00:00'
  }
];

// Analytics data
export const leadSourceData = [
  { id: 'ls-1', source: 'Facebook', count: 145, percentage: 35 },
  { id: 'ls-2', source: 'Website', count: 120, percentage: 29 },
  { id: 'ls-3', source: 'Telegram', count: 85, percentage: 21 },
  { id: 'ls-4', source: 'WhatsApp', count: 62, percentage: 15 }
];

export const conversionFunnelData = [
  { id: 'cf-1', stage: 'Leads', count: 412, percentage: 100 },
  { id: 'cf-2', stage: 'Qualified', count: 248, percentage: 60 },
  { id: 'cf-3', stage: 'Viewing', count: 156, percentage: 38 },
  { id: 'cf-4', stage: 'Negotiating', count: 98, percentage: 24 },
  { id: 'cf-5', stage: 'Won', count: 67, percentage: 16 }
];

export const monthlyPerformanceData = [
  { id: 'mp-1', month: 'Oct', leads: 95, conversions: 12, revenue: 58 },
  { id: 'mp-2', month: 'Nov', leads: 108, conversions: 15, revenue: 72 },
  { id: 'mp-3', month: 'Dec', leads: 125, conversions: 18, revenue: 89 },
  { id: 'mp-4', month: 'Jan', leads: 142, conversions: 22, revenue: 105 },
  { id: 'mp-5', month: 'Feb', leads: 156, conversions: 25, revenue: 118 },
  { id: 'mp-6', month: 'Mar', leads: 178, conversions: 28, revenue: 134 }
];

export const projectPerformanceData = [
  { id: 'pp-1', project: 'BKK1 Residences', leads: 95, conversions: 22, revenue: 5.4 },
  { id: 'pp-2', project: 'Riverside Elite', leads: 88, conversions: 18, revenue: 8.7 },
  { id: 'pp-3', project: 'BKK2 Modern', leads: 76, conversions: 15, revenue: 2.8 },
  { id: 'pp-4', project: 'Chamkarmon Plaza', leads: 102, conversions: 20, revenue: 1.9 },
  { id: 'pp-5', project: 'Diamond Island', leads: 51, conversions: 12, revenue: 9.6 }
];