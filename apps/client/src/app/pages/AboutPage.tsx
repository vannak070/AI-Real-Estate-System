import { useState } from "react";
import { Link } from "react-router";
import { Building2, Users, Award, Target, CheckCircle, TrendingUp, Globe, Heart, Phone, Mail, MessageSquare } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

type AboutTab = 'overview' | 'history' | 'team' | 'awards' | 'contact';

export function AboutPage() {
  const [activeTab, setActiveTab] = useState<AboutTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Company Overview', icon: Building2 },
    { id: 'history', label: 'Our History', icon: TrendingUp },
    { id: 'team', label: 'Our Team', icon: Users },
    { id: 'awards', label: 'Awards & Recognition', icon: Award },
    { id: 'contact', label: 'Contact Us', icon: Globe }
  ];

  const teamMembers = [
    {
      name: "Sok Channara",
      role: "CEO & Managing Director",
      bio: "20+ years of experience in Cambodia real estate market",
      image: "1507003211169-0a1dd7228f2d"
    },
    {
      name: "Phalla Sovanna",
      role: "Chief Operating Officer",
      bio: "Expert in property development and sales operations",
      image: "1573496359142-b8d87734a5a2"
    },
    {
      name: "Kimheng Raksmey",
      role: "Head of Sales",
      bio: "Leading our 10-member sales team to excellence",
      image: "1519085360753-af0119f7cbe7"
    },
    {
      name: "Dara Sophea",
      role: "Technology Director",
      bio: "Pioneering AI integration in Cambodia real estate",
      image: "1580489944761-15a19d654956"
    }
  ];

  const awards = [
    {
      year: "2025",
      title: "Best Real Estate Innovation",
      organization: "Cambodia Property Awards",
      description: "Recognized for pioneering AI-powered real estate solutions"
    },
    {
      year: "2024",
      title: "Top Real Estate Agency",
      organization: "Asia Pacific Property Excellence",
      description: "Outstanding performance in residential property sales"
    },
    {
      year: "2024",
      title: "Digital Transformation Leader",
      organization: "ASEAN Business Awards",
      description: "Excellence in implementing Odoo ERP integration"
    },
    {
      year: "2023",
      title: "Customer Service Excellence",
      organization: "Cambodia Business Awards",
      description: "Highest customer satisfaction ratings in the industry"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
          About ERA Cambodia
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Leading the future of real estate in Cambodia with innovative AI technology and exceptional service
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 border-2 border-gray-100">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AboutTab)}
                className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6" style={{ color: '#001F5B' }}>
                  Transforming Real Estate with AI
                </h2>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  ERA Cambodia is a pioneering real estate company that combines traditional expertise with cutting-edge artificial intelligence technology. We're revolutionizing how Cambodians buy, sell, and rent properties through our innovative AI-powered platform integrated with Odoo ERP.
                </p>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  With a portfolio of 5 premium projects across Phnom Penh and a dedicated team of 10 sales professionals, we're committed to delivering exceptional service and results to our clients.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2 text-[#EF2D2C] font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    <span>AI-Powered Matching</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#EF2D2C] font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    <span>24/7 Instant Response</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[#EF2D2C] font-semibold">
                    <CheckCircle className="w-5 h-5" />
                    <span>Odoo Integration</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop"
                  alt="ERA Cambodia Office"
                  className="rounded-2xl shadow-xl"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>5</div>
                <div className="text-gray-600">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>1,247+</div>
                <div className="text-gray-600">Leads Qualified</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>94.5%</div>
                <div className="text-gray-600">AI Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>10</div>
                <div className="text-gray-600">Sales Professionals</div>
              </div>
            </div>

            {/* Mission & Vision */}
            <div className="grid md:grid-cols-2 gap-8 pt-8 border-t">
              <div className="p-8 bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] rounded-2xl text-white">
                <Target className="w-12 h-12 mb-4 text-[#EF2D2C]" />
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="leading-relaxed">
                  To democratize access to quality real estate through innovative AI technology, making property search and transactions seamless, transparent, and efficient for all Cambodians.
                </p>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl">
                <Heart className="w-12 h-12 mb-4" style={{ color: '#EF2D2C' }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Our Values</h3>
                <ul className="space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF2D2C' }} />
                    <span className="text-gray-700">Innovation & Technology Excellence</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF2D2C' }} />
                    <span className="text-gray-700">Customer-First Approach</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF2D2C' }} />
                    <span className="text-gray-700">Integrity & Transparency</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold mb-8" style={{ color: '#001F5B' }}>Our Journey</h2>
            
            <div className="relative border-l-4 border-[#EF2D2C] pl-8 space-y-12">
              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-[#EF2D2C] border-4 border-white shadow"></div>
                <div className="text-sm text-[#EF2D2C] font-bold mb-2">2026 - Present</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#001F5B' }}>AI Integration Era</h3>
                <p className="text-gray-600">
                  Launched comprehensive AI Real Estate System with 6 intelligent agents, achieving 40% increase in conversion rates and 50-70% reduction in manual workload.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-[#001F5B] border-4 border-white shadow"></div>
                <div className="text-sm text-[#EF2D2C] font-bold mb-2">2024</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#001F5B' }}>Digital Transformation</h3>
                <p className="text-gray-600">
                  Implemented Odoo ERP integration, connecting CRM, Sales, and Inventory modules for seamless operations. Introduced multi-channel lead capture across Facebook, Website, Telegram, and WhatsApp.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-[#001F5B] border-4 border-white shadow"></div>
                <div className="text-sm text-[#EF2D2C] font-bold mb-2">2022</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#001F5B' }}>Rapid Expansion</h3>
                <p className="text-gray-600">
                  Expanded portfolio to 5 premium projects across Phnom Penh. Grew sales team to 10 professionals, handling over 400 monthly leads.
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-[#001F5B] border-4 border-white shadow"></div>
                <div className="text-sm text-[#EF2D2C] font-bold mb-2">2020</div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#001F5B' }}>Foundation</h3>
                <p className="text-gray-600">
                  ERA Cambodia was established with a vision to revolutionize the real estate industry through technology and exceptional customer service.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-12">
            {/* Leadership Section */}
            <div>
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#8B0A1C' }}>
                LEADERSHIP AND SUPPORT
              </h2>
              
              <div className="grid lg:grid-cols-[300px,1fr] gap-8 items-start">
                {/* Leader Photo */}
                <div className="mx-auto">
                  <div className="w-64 h-64 rounded-full overflow-hidden bg-gray-200 shadow-xl">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
                      alt="Kungkea Khorn"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Leader Bio */}
                <div className="p-8 rounded-2xl" style={{ backgroundColor: '#EF2D2C' }}>
                  <h3 className="text-2xl font-bold text-white mb-2">KUNGKEA KHORN</h3>
                  <p className="text-white/90 font-semibold mb-4">CHAIRMAN AND CEO</p>
                  <div className="space-y-3 text-white text-sm leading-relaxed">
                    <p>
                      Kungkea has an educational background in Business Management. He found his passion in Business and has since early years as refreshment he started to focus on entrepreneurship and gained his interest in property sector due to is natural appeal as well as high market demands.
                    </p>
                    <p>
                      Prior to set up ERA Cambodia, Kungkea was a Franchise Manager of an international real estate company. He is a Certified Real Estate Specialist (CIPS) and a Senior Real Estate Specialist (SRES), both are certified from USA. Kungkea is also an International Real Estate Speaker and Negotiator which he had successfully been invited to speak on big events and conferences locally and internationally.
                    </p>
                    <p>
                      In 2018, Kungkea had successfully set up ERA Cambodia where he brought the business up to a form of master franchise from USA to Cambodia. He is presently Chairman and CEO of ERA Cambodia.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operations Support Section */}
            <div className="pt-12 border-t-4" style={{ borderTopColor: '#EF2D2C' }}>
              <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#8B0A1C' }}>
                OPERATIONS SUPPORT
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {/* Row 1 */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&sat=-100"
                      alt="Ath Phearak"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">ATH PHEARAK</h4>
                  <p className="text-xs text-gray-600 uppercase">Design & Tech Supervisor</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop"
                      alt="Hoem Seiha"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">HOEM SEIHA</h4>
                  <p className="text-xs text-gray-600 uppercase">Director at ERA Data Intel</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                      alt="Chou Ratha"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">CHOU RATHA</h4>
                  <p className="text-xs text-gray-600 uppercase">Media Supervisor</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop"
                      alt="Ncel Rotana"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">NCEL ROTANA</h4>
                  <p className="text-xs text-gray-600 uppercase">Account Manager</p>
                </div>

                {/* Row 2 */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop"
                      alt="Khorn Chantrea"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">KHORN CHANTREA</h4>
                  <p className="text-xs text-gray-600 uppercase">Account Supervisor</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&sat=-100"
                      alt="Sinoun Sngoun"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">SINOUN SNGOUN</h4>
                  <p className="text-xs text-gray-600 uppercase">Sale and Marketing Manager</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&sat=-100"
                      alt="Khorn Seakleng"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">KHORN SEAKLENG</h4>
                  <p className="text-xs text-gray-600 uppercase">Account Officer</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&brightness=10"
                      alt="Thorn Sreyeng"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">THORN SREYENG</h4>
                  <p className="text-xs text-gray-600 uppercase">Senior Sales Executive</p>
                </div>

                {/* Row 3 */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&sat=-100"
                      alt="Yem Lyhour"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">YEM LYHOUR</h4>
                  <p className="text-xs text-gray-600 uppercase">Senior Sales Executive</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&brightness=15"
                      alt="En Chivorn"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">EN CHIVORN</h4>
                  <p className="text-xs text-gray-600 uppercase">Senior Sales Executive</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&brightness=5"
                      alt="Kien Chhenghor"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">KIEN CHHENGHOR</h4>
                  <p className="text-xs text-gray-600 uppercase">Recruitment Manager</p>
                </div>

                {/* Row 4 */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&brightness=20"
                      alt="Kim Chhay Ratanak"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">KIM CHHAY RATANAK</h4>
                  <p className="text-xs text-gray-600 uppercase">Graphic Designer</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&brightness=25"
                      alt="Khorn Chhengleang"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">KHORN CHHENGLEANG</h4>
                  <p className="text-xs text-gray-600 uppercase">Sales & Marketing Officer</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&brightness=10"
                      alt="Ngeav Chan Kresna"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">NGEAV CHAN KRESNA</h4>
                  <p className="text-xs text-gray-600 uppercase">Photographer / Editor</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&brightness=5"
                      alt="Chheang Dieng Sothearith"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">CHHEANG DIENG SOTHEARITH</h4>
                  <p className="text-xs text-gray-600 uppercase">Sales Internal</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&brightness=15"
                      alt="Meng Thovleng"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">MENG THOVLENG</h4>
                  <p className="text-xs text-gray-600 uppercase">Graphic Designer</p>
                </div>

                <div className="text-center">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&brightness=20"
                      alt="Nem Sothin"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">NEM SOTHIN</h4>
                  <p className="text-xs text-gray-600 uppercase">Content Creator</p>
                </div>
              </div>
            </div>

            {/* Join Team CTA */}
            <div className="mt-12 p-8 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl text-center">
              <Users className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF2D2C' }} />
              <h3 className="text-2xl font-bold mb-3" style={{ color: '#001F5B' }}>Join Our Growing Team</h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                We're always looking for talented individuals to join ERA Cambodia. If you're passionate about real estate and technology, we'd love to hear from you.
              </p>
              <button className="px-8 py-3 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl" style={{ backgroundColor: '#EF2D2C' }}>
                View Open Positions
              </button>
            </div>
          </div>
        )}

        {/* Awards Tab */}
        {activeTab === 'awards' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#001F5B' }}>Awards & Recognition</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our commitment to excellence has been recognized by leading industry organizations
              </p>
            </div>

            <div className="space-y-6">
              {awards.map((award, index) => (
                <div key={index} className="flex items-start space-x-6 p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl hover:border-[#EF2D2C]/30 transition-all">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {award.year}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold" style={{ color: '#001F5B' }}>{award.title}</h3>
                      <Award className="w-6 h-6 text-yellow-500" />
                    </div>
                    <p className="text-[#EF2D2C] font-semibold mb-2">{award.organization}</p>
                    <p className="text-gray-600">{award.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#001F5B' }}>Get In Touch</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Visit our office or contact us through any of these channels
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl">
                  <h3 className="text-xl font-bold mb-4" style={{ color: '#001F5B' }}>Head Office</h3>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Building2 className="w-5 h-5 mt-1" style={{ color: '#EF2D2C' }} />
                      <div>
                        <p className="font-semibold text-gray-900">Address</p>
                        <p className="text-gray-600">Street 240, BKK1<br/>Phnom Penh, Cambodia</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 mt-1" style={{ color: '#EF2D2C' }} />
                      <div>
                        <p className="font-semibold text-gray-900">Phone</p>
                        <p className="text-gray-600">+855 23 123 456</p>
                        <p className="text-gray-600">+855 12 345 678</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 mt-1" style={{ color: '#EF2D2C' }} />
                      <div>
                        <p className="font-semibold text-gray-900">Email</p>
                        <p className="text-gray-600">info@eracambodia.com</p>
                        <p className="text-gray-600">sales@eracambodia.com</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] text-white rounded-2xl">
                  <h3 className="text-xl font-bold mb-4">Business Hours</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Monday - Friday:</span>
                      <span className="font-semibold">8:00 AM - 6:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday:</span>
                      <span className="font-semibold">9:00 AM - 5:00 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday:</span>
                      <span className="font-semibold">Closed</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-sm text-gray-200">
                      💬 AI Chat Assistant available 24/7
                    </p>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden shadow-lg h-96">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=600&fit=crop"
                  alt="Office Location Map"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Quick Contact CTA */}
            <div className="text-center p-8 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl">
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Need Immediate Assistance?</h3>
              <p className="text-gray-600 mb-6">
                Chat with our AI assistant now for instant answers to your questions
              </p>
              <Link
                to="/chat"
                className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl font-semibold text-white transition-all shadow-lg hover:shadow-xl"
                style={{ backgroundColor: '#EF2D2C' }}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Start Chat</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}