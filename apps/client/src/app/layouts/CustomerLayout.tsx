import { Outlet, Link, useLocation } from "react-router";
import { MessageSquare, Home, Building2, Menu, X, Phone, Mail, ChevronDown, Info, MapPin, Facebook, Linkedin, Send } from "lucide-react";
import { useState } from "react";
import headerLogo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";
import footerLogo from "figma:asset/04fbd52ef60da91b44edcb17b864e7abb90acda5.png";

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isAboutActive = () => {
    return location.pathname.startsWith('/about');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5" />
                <span>+855 23 123 456</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2">
                <Mail className="w-3.5 h-3.5" />
                <span>info@eracambodia.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <img src={headerLogo} alt="ERA Cambodia" className="h-16 w-auto transition-transform group-hover:scale-105" />
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              <Link 
                to="/" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/') 
                    ? 'bg-[#001F5B] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="font-medium">Home</span>
              </Link>
              
              <Link 
                to="/properties" 
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isActive('/properties') 
                    ? 'bg-[#001F5B] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Properties</span>
              </Link>

              {/* About Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setAboutDropdownOpen(true)}
                onMouseLeave={() => setAboutDropdownOpen(false)}
              >
                <Link
                  to="/about"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isAboutActive()
                      ? 'bg-[#001F5B] text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span className="font-medium">About</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${aboutDropdownOpen ? 'rotate-180' : ''}`} />
                </Link>

                {/* Dropdown Menu */}
                {aboutDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border-2 border-gray-100 py-2 z-50">
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold">Company Overview</div>
                      <div className="text-xs text-gray-500">Who we are</div>
                    </Link>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold">Our History</div>
                      <div className="text-xs text-gray-500">Journey & milestones</div>
                    </Link>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold">Leadership Team</div>
                      <div className="text-xs text-gray-500">Meet our experts</div>
                    </Link>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold">Awards & Recognition</div>
                      <div className="text-xs text-gray-500">Our achievements</div>
                    </Link>
                    <div className="border-t border-gray-100 my-2"></div>
                    <Link
                      to="/about"
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-semibold text-[#EF2D2C]">Contact Us</div>
                      <div className="text-xs text-gray-500">Get in touch</div>
                    </Link>
                  </div>
                )}
              </div>
              
              {/* CTA Button */}
              <Link 
                to="/chat" 
                className="ml-4 flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                style={{ 
                  backgroundColor: '#EF2D2C', 
                  color: 'white',
                }}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat with AI Assistant</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 pt-2 pb-4 space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${
                  isActive('/') 
                    ? 'bg-[#001F5B] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </Link>
              <Link
                to="/properties"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${
                  isActive('/properties') 
                    ? 'bg-[#001F5B] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Properties</span>
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg ${
                  isAboutActive() 
                    ? 'bg-[#001F5B] text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Info className="w-5 h-5" />
                <span className="font-medium">About</span>
              </Link>
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2 px-4 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: '#EF2D2C', color: 'white' }}
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat with AI Assistant</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
      
      <main>
        <Outlet />
      </main>
      
      <footer className="text-white py-12 mt-20" style={{ backgroundColor: '#001F5B' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 mb-8">
            {/* Logo and About Section */}
            <div className="md:col-span-4">
              <Link to="/" className="inline-block mb-5 group">
                <img 
                  src={footerLogo} 
                  alt="ERA Cambodia" 
                  className="h-24 w-auto transition-transform group-hover:scale-105" 
                />
              </Link>
              <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-sm">
                Leading real estate company in Cambodia, powered by AI technology and integrated with Odoo ERP for seamless property management.
              </p>
              
              {/* Social Media */}
              <div>
                <h4 className="text-lg font-bold mb-3 text-white">Connect With Us</h4>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://m.me/ERAcambodia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label="Facebook Messenger"
                    title="Chat with us on Messenger"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#EF2D2C] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EF2D2C] group-hover:shadow-lg group-hover:shadow-[#EF2D2C]/50 group-hover:-translate-y-1">
                      <MessageSquare className="w-5 h-5 transition-all" />
                    </div>
                  </a>
                  <a
                    href="https://facebook.com/eracambodia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label="Facebook"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#EF2D2C] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EF2D2C] group-hover:shadow-lg group-hover:shadow-[#EF2D2C]/50 group-hover:-translate-y-1">
                      <Facebook className="w-5 h-5 transition-all" />
                    </div>
                  </a>
                  <a
                    href="https://linkedin.com/company/eracambodia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label="LinkedIn"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#EF2D2C] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EF2D2C] group-hover:shadow-lg group-hover:shadow-[#EF2D2C]/50 group-hover:-translate-y-1">
                      <Linkedin className="w-5 h-5 transition-all" />
                    </div>
                  </a>
                  <a
                    href="https://t.me/ERAcambodia_bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label="Telegram"
                    title="Chat with our Telegram Bot"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#EF2D2C] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EF2D2C] group-hover:shadow-lg group-hover:shadow-[#EF2D2C]/50 group-hover:-translate-y-1">
                      <Send className="w-5 h-5 transition-all" />
                    </div>
                  </a>
                  <a
                    href="https://wa.me/85512345678"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label="WhatsApp"
                    title="Chat with us on WhatsApp"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-[#EF2D2C] flex items-center justify-center transition-all duration-300 group-hover:bg-[#EF2D2C] group-hover:shadow-lg group-hover:shadow-[#EF2D2C]/50 group-hover:-translate-y-1">
                      <Phone className="w-5 h-5 transition-all" />
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="md:col-span-2">
              <h4 className="font-bold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Home</span>
                  </Link>
                </li>
                <li>
                  <Link to="/properties" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Properties</span>
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>About Us</span>
                  </Link>
                </li>
                <li>
                  <Link to="/chat" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>AI Chat Assistant</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* About ERA */}
            <div className="md:col-span-3">
              <h4 className="font-bold mb-4 text-white">About ERA</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Company Overview</span>
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Our History</span>
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Leadership Team</span>
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                    <span>Awards & Recognition</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="md:col-span-3">
              <h4 className="font-bold mb-4 text-white">Contact Info</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-start space-x-3 text-gray-300">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Street 240, BKK1<br/>Phnom Penh, Cambodia</span>
                </li>
                <li className="flex items-start space-x-3 text-gray-300">
                  <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <div>
                    <div>+855 23 123 456</div>
                    <div>+855 12 345 678</div>
                  </div>
                </li>
                <li className="flex items-start space-x-3 text-gray-300">
                  <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <div>
                    <div>info@eracambodia.com</div>
                    <div>sales@eracambodia.com</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm text-center md:text-left">
                © 2026 ERA Cambodia. All rights reserved.
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Powered by AI Agents + Odoo ERP</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}