import { useState } from "react";
import { 
  Building2, 
  Users, 
  Award, 
  Target, 
  Heart,
  Save,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  FileText
} from "lucide-react";

export function ManageAboutPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'team' | 'awards'>('overview');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const sections = [
    { id: 'overview' as const, label: 'Company Overview', icon: Building2 },
    { id: 'history' as const, label: 'Company History', icon: Calendar },
    { id: 'team' as const, label: 'Team Members', icon: Users },
    { id: 'awards' as const, label: 'Awards & Recognition', icon: Award },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage About Page</h1>
        <p className="text-gray-600">Update company information displayed on the About page</p>
      </div>

      {saved && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
          <p className="text-green-700 font-medium">✓ About page content saved successfully!</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Section Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-[#001F5B] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Content */}
        <div className="p-8">
          {/* Company Overview Section */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Company Overview Content</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  defaultValue="About ERA Cambodia"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subtitle
                </label>
                <textarea
                  rows={2}
                  defaultValue="Leading the future of real estate in Cambodia with innovative AI technology and exceptional service"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Description (Paragraph 1)
                </label>
                <textarea
                  rows={4}
                  defaultValue="ERA Cambodia is a pioneering real estate company that combines traditional expertise with cutting-edge artificial intelligence technology. We're revolutionizing how Cambodians buy, sell, and rent properties through our innovative AI-powered platform integrated with Odoo ERP."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Main Description (Paragraph 2)
                </label>
                <textarea
                  rows={3}
                  defaultValue="With a portfolio of 5 premium projects across Phnom Penh and a dedicated team of 10 sales professionals, we're committed to delivering exceptional service and results to our clients."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Statistics</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Active Projects
                    </label>
                    <input
                      type="text"
                      defaultValue="5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Leads Qualified
                    </label>
                    <input
                      type="text"
                      defaultValue="1,247+"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      AI Accuracy
                    </label>
                    <input
                      type="text"
                      defaultValue="94.5%"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Sales Professionals
                    </label>
                    <input
                      type="text"
                      defaultValue="10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Mission Statement</h3>
                <textarea
                  rows={3}
                  defaultValue="To democratize access to quality real estate through innovative AI technology, making property search and transactions seamless, transparent, and efficient for all Cambodians."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Values</h3>
                <div className="space-y-3">
                  {[
                    'Innovation & Technology Excellence',
                    'Customer-First Approach',
                    'Integrity & Transparency'
                  ].map((value, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        defaultValue={value}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                      />
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button className="flex items-center space-x-2 px-4 py-2 text-[#001F5B] hover:bg-gray-50 rounded-lg transition">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Value</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Overview</span>
              </button>
            </div>
          )}

          {/* Company History Section */}
          {activeSection === 'history' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Company History Timeline</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition">
                  <Plus className="w-4 h-4" />
                  <span>Add Milestone</span>
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    year: '2026 - Present',
                    title: 'AI Integration Era',
                    description: 'Launched comprehensive AI Real Estate System with 6 intelligent agents, achieving 40% increase in conversion rates and 50-70% reduction in manual workload.'
                  },
                  {
                    year: '2024',
                    title: 'Digital Transformation',
                    description: 'Implemented Odoo ERP integration, connecting CRM, Sales, and Inventory modules for seamless operations. Introduced multi-channel lead capture across Facebook, Website, Telegram, and WhatsApp.'
                  },
                  {
                    year: '2022',
                    title: 'Rapid Expansion',
                    description: 'Expanded portfolio to 5 premium projects across Phnom Penh. Grew sales team to 10 professionals, handling over 400 monthly leads.'
                  },
                  {
                    year: '2020',
                    title: 'Foundation',
                    description: 'ERA Cambodia was established with a vision to revolutionize the real estate industry through technology and exceptional customer service.'
                  }
                ].map((milestone, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <input
                            type="text"
                            defaultValue={milestone.year}
                            className="px-3 py-1.5 text-sm font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                            placeholder="Year"
                          />
                        </div>
                        <input
                          type="text"
                          defaultValue={milestone.title}
                          className="w-full mb-3 px-3 py-2 font-semibold text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          placeholder="Milestone Title"
                        />
                        <textarea
                          rows={3}
                          defaultValue={milestone.description}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          placeholder="Description"
                        />
                      </div>
                      <button className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save History</span>
              </button>
            </div>
          )}

          {/* Team Members Section */}
          {activeSection === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Team Management</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition">
                  <Plus className="w-4 h-4" />
                  <span>Add Team Member</span>
                </button>
              </div>

              {/* CEO Section */}
              <div className="p-6 bg-gradient-to-br from-[#EF2D2C]/10 to-white border-2 border-[#EF2D2C]/30 rounded-xl">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-[#EF2D2C]" />
                  <span>Leadership (CEO)</span>
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      defaultValue="KUNGKEA KHORN"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input
                      type="text"
                      defaultValue="CHAIRMAN AND CEO"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Biography</label>
                    <textarea
                      rows={6}
                      defaultValue="Kungkea has an educational background in Business Management. Prior to set up ERA Cambodia, Kungkea was a Franchise Manager of an international real estate company. He is a Certified Real Estate Specialist (CIPS) and a Senior Real Estate Specialist (SRES). In 2018, Kungkea had successfully set up ERA Cambodia where he brought the business up to a form of master franchise from USA to Cambodia."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                    />
                  </div>
                </div>
              </div>

              {/* Operations Team */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Operations Support Team</h3>
                <div className="space-y-3">
                  {[
                    { name: 'ATH PHEARAK', position: 'Design & Tech Supervisor' },
                    { name: 'HOEM SEIHA', position: 'Director at ERA Data Intel' },
                    { name: 'CHOU RATHA', position: 'Media Supervisor' },
                    { name: 'NCEL ROTANA', position: 'Account Manager' },
                  ].map((member, idx) => (
                    <div key={idx} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          defaultValue={member.name}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          placeholder="Full Name"
                        />
                        <input
                          type="text"
                          defaultValue={member.position}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          placeholder="Position"
                        />
                      </div>
                      <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Team</span>
              </button>
            </div>
          )}

          {/* Awards Section */}
          {activeSection === 'awards' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Awards & Recognition</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition">
                  <Plus className="w-4 h-4" />
                  <span>Add Award</span>
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    year: '2025',
                    title: 'Best Real Estate Innovation',
                    organization: 'Cambodia Property Awards',
                    description: 'Recognized for pioneering AI-powered real estate solutions'
                  },
                  {
                    year: '2024',
                    title: 'Top Real Estate Agency',
                    organization: 'Asia Pacific Property Excellence',
                    description: 'Outstanding performance in residential property sales'
                  },
                  {
                    year: '2024',
                    title: 'Digital Transformation Leader',
                    organization: 'ASEAN Business Awards',
                    description: 'Excellence in implementing Odoo ERP integration'
                  }
                ].map((award, idx) => (
                  <div key={idx} className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                            <input
                              type="text"
                              defaultValue={award.year}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Organization</label>
                            <input
                              type="text"
                              defaultValue={award.organization}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Award Title</label>
                          <input
                            type="text"
                            defaultValue={award.title}
                            className="w-full px-3 py-2 font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            rows={2}
                            defaultValue={award.description}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001F5B]"
                          />
                        </div>
                      </div>
                      <button className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-6 py-3 bg-[#001F5B] text-white rounded-lg hover:bg-[#EF2D2C] transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Awards</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
