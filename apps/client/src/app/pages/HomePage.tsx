import { Link } from "react-router";
import { MessageSquare, Zap, TrendingUp, Brain, Building2, Bot, CheckCircle, ArrowRight, Star, Shield, Clock, Users } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function HomePage() {
  return (
    <div>
      {/* Hero Section - Modern & Eye-catching */}
      <section className="relative overflow-hidden">
        {/* Background with Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#001F5B] via-[#001F5B] to-[#8B0A1C]">
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-[#EF2D2C] rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">AI-Powered Real Estate Platform</span>
              </div>

              {/* Main Heading */}
              <div>
                <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                  Find Your Dream
                  <span className="block text-[#EF2D2C]">Property in Cambodia</span>
                </h1>
                <p className="text-xl text-gray-200 leading-relaxed">
                  Experience the future of property search with AI-powered recommendations, 
                  instant responses, and expert guidance - all integrated with Odoo ERP for 
                  seamless transactions.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  to="/chat" 
                  className="group inline-flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
                  style={{ backgroundColor: '#EF2D2C', color: 'white' }}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Start AI Chat</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/properties" 
                  className="inline-flex items-center justify-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-[#001F5B]"
                >
                  <Building2 className="w-5 h-5" />
                  <span>Browse Properties</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#EF2D2C] border-2 border-white flex items-center justify-center text-xs font-bold">5K+</div>
                  </div>
                  <span className="text-sm text-gray-300">Happy Clients</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="ml-2 text-sm font-semibold">4.9/5</span>
                </div>
              </div>
            </div>

            {/* Right Content - Hero Image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <ImageWithFallback 
                  src="https://images.unsplash.com/photo-1613977257592-4871e5fcd7c4?w=800&h=600&fit=crop"
                  alt="Luxury Property in Phnom Penh"
                  className="w-full h-auto"
                />
                {/* Floating Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-white rounded-xl p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg bg-[#EF2D2C]/10 flex items-center justify-center">
                        <Bot className="w-6 h-6 text-[#EF2D2C]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">AI Assistant Ready</p>
                        <p className="text-sm text-gray-600">Average response: &lt;1 min</p>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#EF2D2C] rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#EF2D2C] rounded-full opacity-20 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Improved Layout */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-[#EF2D2C]/10 text-[#EF2D2C] rounded-full px-4 py-2 mb-4">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold">Why Choose ERA Cambodia</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
              AI-Powered Real Estate Experience
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Transform how you find and buy property with cutting-edge AI technology 
              integrated seamlessly with Odoo ERP
            </p>
          </div>
          
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Instant AI Response</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                Get immediate answers 24/7 from our intelligent AI assistant. No waiting for callbacks or office hours.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Average response time &lt;1 minute</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Available 24/7/365</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 2 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <Brain className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Smart Property Matching</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                AI analyzes your preferences, budget, and requirements to recommend properties that perfectly match your needs.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Personalized recommendations</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>94.5% matching accuracy</span>
                </li>
              </ul>
            </div>
            
            {/* Feature 3 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Data-Driven Insights</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                Make informed decisions with real-time market data, pricing intelligence, and predictive analytics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Real-time market analysis</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Price trend predictions</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Secure & Verified</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                All properties are verified and transactions are secured through our Odoo ERP integration.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>100% verified listings</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Secure payment processing</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Automated Follow-ups</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                Never miss an opportunity with intelligent automated follow-ups and appointment scheduling.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Smart reminder system</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Auto-scheduling viewings</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="group bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all border-2 border-transparent hover:border-[#EF2D2C]/20">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-3 text-center" style={{ color: '#001F5B' }}>Expert Sales Team</h3>
              <p className="text-gray-600 mb-3 text-center text-sm">
                Our 10 experienced sales professionals are ready to assist you, backed by AI insights.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Professional consultants</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-[#EF2D2C]" />
                  <span>Multi-language support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Stats Section - Redesigned */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#001F5B] to-[#8B0A1C]"></div>
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%23ffffff" fill-opacity="1" fill-rule="evenodd"/%3E%3C/svg%3E")',
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Proven Results & Performance
            </h2>
            <p className="text-xl text-gray-300">
              Real numbers from our AI-powered platform
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r from-[#EF2D2C] to-white bg-clip-text text-transparent">
                1,247+
              </div>
              <div className="text-gray-300 font-medium">Leads Qualified</div>
              <div className="text-sm text-gray-400 mt-1">by AI agents</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r from-[#EF2D2C] to-white bg-clip-text text-transparent">
                94.5%
              </div>
              <div className="text-gray-300 font-medium">AI Accuracy</div>
              <div className="text-sm text-gray-400 mt-1">matching rate</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r from-[#EF2D2C] to-white bg-clip-text text-transparent">
                &lt;1min
              </div>
              <div className="text-gray-300 font-medium">Response Time</div>
              <div className="text-sm text-gray-400 mt-1">average</div>
            </div>
            <div className="text-center">
              <div className="text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r from-[#EF2D2C] to-white bg-clip-text text-transparent">
                40%
              </div>
              <div className="text-gray-300 font-medium">Conversion Boost</div>
              <div className="text-sm text-gray-400 mt-1">vs traditional</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-[#EF2D2C]/10 text-[#EF2D2C] rounded-full px-4 py-2 mb-4">
              <Bot className="w-4 h-4" />
              <span className="text-sm font-semibold">Simple Process</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started in 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg h-full border-2 border-gray-100 hover:border-[#EF2D2C]/30 transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  1
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Start a Chat</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Begin a conversation with our AI assistant. Tell us about your property preferences, budget, and location requirements.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg h-full border-2 border-gray-100 hover:border-[#EF2D2C]/30 transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  2
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Get Matches</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Our AI analyzes your needs and instantly recommends properties that match your criteria from our verified inventory.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-lg h-full border-2 border-gray-100 hover:border-[#EF2D2C]/30 transition-all">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#EF2D2C] to-[#8B0A1C] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  3
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold mb-4" style={{ color: '#001F5B' }}>Schedule Viewing</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Book a property viewing with our sales team. We'll handle all the details and guide you through the process.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section - Enhanced */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#001F5B] via-[#001F5B] to-[#8B0A1C]"></div>
        <div className="absolute inset-0 opacity-10" style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-12">
            <div className="inline-flex items-center space-x-2 bg-[#EF2D2C] text-white rounded-full px-4 py-2 mb-6">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold">Free Consultation</span>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Ready to Find Your Perfect Property?
            </h2>
            <p className="text-xl text-gray-200 mb-10 leading-relaxed">
              Chat with our AI assistant now and get personalized property recommendations 
              in seconds. No commitment required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/chat" 
                className="group inline-flex items-center justify-center space-x-2 px-10 py-5 rounded-xl text-lg font-bold transition-all shadow-2xl transform hover:scale-105"
                style={{ backgroundColor: '#EF2D2C', color: 'white' }}
              >
                <MessageSquare className="w-6 h-6" />
                <span>Start Free Consultation</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                to="/properties" 
                className="inline-flex items-center justify-center space-x-2 px-10 py-5 rounded-xl text-lg font-bold transition-all bg-white text-[#001F5B] hover:bg-gray-100"
              >
                <Building2 className="w-6 h-6" />
                <span>View All Properties</span>
              </Link>
            </div>

            {/* Trust Badge */}
            <div className="mt-10 pt-8 border-t border-white/20">
              <p className="text-sm text-gray-300 mb-4">Trusted by thousands of property buyers in Cambodia</p>
              <div className="flex items-center justify-center space-x-6 text-white">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-[#EF2D2C]" />
                  <span className="text-sm">Verified Listings</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-[#EF2D2C]" />
                  <span className="text-sm">24/7 Support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-sm">4.9/5 Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}