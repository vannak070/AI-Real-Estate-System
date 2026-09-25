import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, Users, Award, Target, CheckCircle, TrendingUp, Globe, Heart, Phone, Mail, MessageSquare } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";

type AboutTab = 'overview' | 'history' | 'team' | 'awards' | 'contact';
type PublicAbout = Awaited<ReturnType<typeof api.settings.public.about.query>>;

const AVATAR_COLORS = ['#001F5B', '#EF2D2C', '#8B0A1C', '#0F766E', '#7C3AED', '#B45309'];

function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ name, photoUrl, size, idx = 0 }: { name: string; photoUrl: string | null; size: number; idx?: number }) {
  if (photoUrl) {
    return (
      <ImageWithFallback
        src={resolveUploadUrl(photoUrl)}
        alt={name}
        className="w-full h-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center w-full h-full font-bold text-white"
      style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length], fontSize: size / 3 }}
    >
      {initials(name)}
    </div>
  );
}

export function AboutPage() {
  const [activeTab, setActiveTab] = useState<AboutTab>('overview');
  const [about, setAbout] = useState<PublicAbout | null>(null);

  useEffect(() => {
    api.settings.public.about.query().then(setAbout).catch(() => setAbout(null));
  }, []);

  const tabs = [
    { id: 'overview', label: 'Company Overview', icon: Building2 },
    { id: 'history', label: 'Our History', icon: TrendingUp },
    { id: 'team', label: 'Our Team', icon: Users },
    { id: 'awards', label: 'Awards & Recognition', icon: Award },
    { id: 'contact', label: 'Contact Us', icon: Globe },
  ];

  const content = about?.content;
  const milestones = about?.milestones ?? [];
  const team = about?.team ?? [];
  const awards = about?.awards ?? [];
  const leader = team.find((m) => m.isLeader);
  const rest = team.filter((m) => !m.isLeader);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
          {content?.pageTitle ?? 'About ERA Cambodia'}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">{content?.subtitle}</p>
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
        {!about && <div className="text-center py-16 text-gray-400">Loading…</div>}

        {/* Overview Tab */}
        {about && activeTab === 'overview' && (
          <div className="space-y-12">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6" style={{ color: '#001F5B' }}>
                  Transforming Real Estate with AI
                </h2>
                {content?.paragraph1 && <p className="text-gray-600 mb-4 leading-relaxed">{content.paragraph1}</p>}
                {content?.paragraph2 && <p className="text-gray-600 mb-6 leading-relaxed">{content.paragraph2}</p>}
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
                    <span>Integrated CRM & Sales</span>
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
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>{content?.statProjects ?? '—'}</div>
                <div className="text-gray-600">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>{content?.statLeads ?? '—'}</div>
                <div className="text-gray-600">Leads Qualified</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>{content?.statAccuracy ?? '—'}</div>
                <div className="text-gray-600">AI Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2" style={{ color: '#EF2D2C' }}>{content?.statTeamSize ?? '—'}</div>
                <div className="text-gray-600">Sales Professionals</div>
              </div>
            </div>

            {/* Mission & Values */}
            <div className="grid md:grid-cols-2 gap-8 pt-8 border-t">
              <div className="p-8 bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] rounded-2xl text-white">
                <Target className="w-12 h-12 mb-4 text-[#EF2D2C]" />
                <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                <p className="leading-relaxed">{content?.mission}</p>
              </div>
              <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl">
                <Heart className="w-12 h-12 mb-4" style={{ color: '#EF2D2C' }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Our Values</h3>
                <ul className="space-y-2">
                  {(content?.values ?? []).map((value) => (
                    <li key={value} className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: '#EF2D2C' }} />
                      <span className="text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {about && activeTab === 'history' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold mb-8" style={{ color: '#001F5B' }}>Our Journey</h2>

            <div className="relative border-l-4 border-[#EF2D2C] pl-8 space-y-12">
              {milestones.map((m, idx) => (
                <div key={m.id} className="relative">
                  <div
                    className="absolute -left-10 w-6 h-6 rounded-full border-4 border-white shadow"
                    style={{ backgroundColor: idx === 0 ? '#EF2D2C' : '#001F5B' }}
                  />
                  <div className="text-sm text-[#EF2D2C] font-bold mb-2">{m.year}</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: '#001F5B' }}>{m.title}</h3>
                  <p className="text-gray-600">{m.description}</p>
                </div>
              ))}
              {milestones.length === 0 && <p className="text-gray-400">No history yet.</p>}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {about && activeTab === 'team' && (
          <div className="space-y-12">
            {leader && (
              <div>
                <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#8B0A1C' }}>
                  LEADERSHIP AND SUPPORT
                </h2>

                <div className="grid lg:grid-cols-[300px,1fr] gap-8 items-start">
                  <div className="mx-auto">
                    <div className="w-64 h-64 rounded-full overflow-hidden bg-gray-200 shadow-xl">
                      <Avatar name={leader.name} photoUrl={leader.photoUrl} size={256} />
                    </div>
                  </div>

                  <div className="p-8 rounded-2xl" style={{ backgroundColor: '#EF2D2C' }}>
                    <h3 className="text-2xl font-bold text-white mb-2">{leader.name}</h3>
                    <p className="text-white/90 font-semibold mb-4">{leader.position}</p>
                    {leader.bio && <p className="text-white text-sm leading-relaxed">{leader.bio}</p>}
                  </div>
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className={leader ? 'pt-12 border-t-4' : ''} style={leader ? { borderTopColor: '#EF2D2C' } : undefined}>
                <h2 className="text-3xl font-bold text-center mb-10" style={{ color: '#8B0A1C' }}>
                  OPERATIONS SUPPORT
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {rest.map((member, idx) => (
                    <div key={member.id} className="text-center">
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-200 mb-3 shadow-lg">
                        <Avatar name={member.name} photoUrl={member.photoUrl} size={128} idx={idx} />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{member.name}</h4>
                      <p className="text-xs text-gray-600 uppercase">{member.position}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        {about && activeTab === 'awards' && (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#001F5B' }}>Awards & Recognition</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our commitment to excellence has been recognized by leading industry organizations
              </p>
            </div>

            <div className="space-y-6">
              {awards.map((award) => (
                <div key={award.id} className="flex items-start space-x-6 p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-2xl hover:border-[#EF2D2C]/30 transition-all">
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
                    {award.description && <p className="text-gray-600">{award.description}</p>}
                  </div>
                </div>
              ))}
              {awards.length === 0 && <p className="text-gray-400 text-center">No awards yet.</p>}
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
