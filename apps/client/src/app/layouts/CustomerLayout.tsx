import { Outlet, Link, useLocation } from "react-router";
import { MessageSquare, Home, Building2, Menu, X, Phone, Mail, ChevronDown, Info, MapPin, Facebook, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ABOUT_SECTIONS, aboutHref, parseAboutTab } from "../aboutSections";
import { captureCampaignFromUrl } from "../../lib/attribution";
import headerLogo from "figma:asset/d35bb1cd7b17aae1ece93ea47adf754effd39a17.png";
import footerLogo from "figma:asset/04fbd52ef60da91b44edcb17b864e7abb90acda5.png";

/** Bottom-right footer icons. Telegram opens the live AI bot. */
const FOOTER_SOCIAL = [
  { href: 'https://facebook.com/eracambodia', label: 'Facebook', Icon: Facebook, external: true },
  { href: 'tel:+85523123456', label: 'Call us: +855 23 123 456', Icon: Phone, external: false },
  { href: 'https://t.me/ERACambodiaAI_bot', label: 'Chat with our AI assistant on Telegram', Icon: Send, external: true },
];

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutDropdownOpen, setAboutDropdownOpen] = useState(false);
  const location = useLocation();
  const aboutMenuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAboutTab = location.pathname.startsWith('/about') ? parseAboutTab(new URLSearchParams(location.search).get('tab')) : null;

  // Hover-intent: open at once, close after a short pause, so crossing the gap between the button
  // and the menu (or a slightly shaky mouse) doesn't snap it shut.
  const openAbout = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setAboutDropdownOpen(true);
  };
  const closeAboutSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setAboutDropdownOpen(false), 180);
  };

  // Any navigation (picking a section, Back, …) closes the menus.
  useEffect(() => {
    setAboutDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close on Esc or a click/tap outside the menu (touch screens have no mouse-leave).
  useEffect(() => {
    if (!aboutDropdownOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAboutDropdownOpen(false);
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!aboutMenuRef.current?.contains(e.target as Node)) setAboutDropdownOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [aboutDropdownOpen]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Every page can be an ad's landing page, so capture ?utm_campaign= wherever the visitor lands.
  useEffect(() => {
    captureCampaignFromUrl(location.search);
  }, [location.search]);

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
              <div ref={aboutMenuRef} className="relative" onMouseEnter={openAbout} onMouseLeave={closeAboutSoon}>
                <div
                  className={`flex items-center rounded-lg transition-all ${
                    isAboutActive() ? 'bg-[#001F5B] text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Link to="/about" className="flex items-center space-x-2 py-2 pl-4 pr-1">
                    <Info className="w-4 h-4" />
                    <span className="font-medium">About</span>
                  </Link>
                  {/* Separate button so touch and keyboard users can open the menu too. */}
                  <button
                    type="button"
                    aria-label="Show About sections"
                    aria-expanded={aboutDropdownOpen}
                    aria-haspopup="menu"
                    onClick={() => (aboutDropdownOpen ? setAboutDropdownOpen(false) : openAbout())}
                    className="py-2 pl-1 pr-3"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${aboutDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {aboutDropdownOpen && (
                  // pt-2 (not mt-2): the padding is part of the hover area, so there's no dead gap.
                  <div className="absolute left-0 top-full z-50 pt-2" role="menu">
                    <div className="w-64 rounded-xl border border-gray-100 bg-white py-2 shadow-xl">
                      {ABOUT_SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const current = currentAboutTab === section.id;
                        return (
                          <Link
                            key={section.id}
                            to={aboutHref(section.id)}
                            role="menuitem"
                            aria-current={current ? 'page' : undefined}
                            onClick={() => setAboutDropdownOpen(false)}
                            className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                              current ? 'bg-[#001F5B]/5' : 'hover:bg-gray-50'
                            } ${section.id === 'contact' ? 'mt-1 border-t border-gray-100 pt-3.5' : ''}`}
                          >
                            <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${current ? 'text-[#EF2D2C]' : 'text-gray-400'}`} />
                            <span>
                              <span className={`block text-sm font-semibold ${current ? 'text-[#001F5B]' : 'text-gray-800'}`}>
                                {section.label}
                              </span>
                              <span className="block text-xs text-gray-500">{section.hint}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
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
              <div className="ml-6 border-l border-gray-200 pl-3">
                {ABOUT_SECTIONS.map((section) => (
                  <Link
                    key={section.id}
                    to={aboutHref(section.id)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm ${
                      currentAboutTab === section.id ? 'font-semibold text-[#001F5B]' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {section.label}
                  </Link>
                ))}
              </div>
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
              <p className="text-gray-300 text-sm leading-relaxed max-w-sm">
                Leading real estate company in Cambodia, powered by AI technology for a faster, smarter property search.
              </p>
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
                {ABOUT_SECTIONS.filter((section) => section.id !== 'contact').map((section) => (
                  <li key={section.id}>
                    <Link to={aboutHref(section.id)} className="text-gray-300 hover:text-[#EF2D2C] transition flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-[#EF2D2C] rounded-full"></span>
                      <span>{section.label}</span>
                    </Link>
                  </li>
                ))}
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
          <div className="flex flex-col-reverse items-center gap-4 border-t border-gray-700/50 pt-8 sm:flex-row sm:justify-between">
            <p className="text-sm text-gray-400">© 2026 ERA Cambodia · Powered by AI Agent</p>
            <div className="flex gap-3">
              {FOOTER_SOCIAL.map(({ href, label, Icon, external }) => (
                <a
                  key={label}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  aria-label={label}
                  title={label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#EF2D2C] hover:bg-[#EF2D2C] hover:shadow-lg hover:shadow-[#EF2D2C]/40"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}