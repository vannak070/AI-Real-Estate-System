import { useState } from "react";
import { Link } from "react-router";
import { mockProperties } from '@era/mock-data';
import { MapPin, Building2, Home, Key, TrendingUp, Filter, Star, Crown } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

type PropertyCategory = 'All' | 'Sale' | 'Rent' | 'Exclusive';

export function PropertiesPage() {
  const [activeCategory, setActiveCategory] = useState<PropertyCategory>('All');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedPrice, setSelectedPrice] = useState('All Prices');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Filter properties by category
  const filteredProperties = activeCategory === 'All' 
    ? mockProperties 
    : activeCategory === 'Exclusive'
    ? mockProperties.filter(p => p.id === 'P002' || p.id === 'P005')
    : mockProperties.filter(p => p.category === activeCategory);

  // Count properties by category
  const saleCount = mockProperties.filter(p => p.category === 'Sale').length;
  const rentCount = mockProperties.filter(p => p.category === 'Rent').length;
  const exclusiveCount = 2;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
          Explore Our Properties
        </h1>
        <p className="text-xl text-gray-600">
          Discover {mockProperties.length} premium projects across Phnom Penh
        </p>
      </div>

      {/* Category Sub-Menu */}
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 border-2 border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* All Properties */}
          <button
            onClick={() => setActiveCategory('All')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'All'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span>All Properties</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              activeCategory === 'All' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {mockProperties.length}
            </span>
          </button>

          {/* Exclusive */}
          <button
            onClick={() => setActiveCategory('Exclusive')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'Exclusive'
                ? 'bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Crown className="w-5 h-5" />
            <span>Exclusive</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              activeCategory === 'Exclusive' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {exclusiveCount}
            </span>
          </button>

          {/* For Sale */}
          <button
            onClick={() => setActiveCategory('Sale')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'Sale'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>For Sale</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              activeCategory === 'Sale' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {saleCount}
            </span>
          </button>

          {/* For Rent */}
          <button
            onClick={() => setActiveCategory('Rent')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'Rent'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Key className="w-5 h-5" />
            <span>For Rent</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              activeCategory === 'Rent' 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}>
              {rentCount}
            </span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8 border-l-4" style={{ borderLeftColor: '#EF2D2C' }}>
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5" style={{ color: '#EF2D2C' }} />
          <h3 className="font-semibold text-lg" style={{ color: '#001F5B' }}>
            Filter Properties
          </h3>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Location
            </label>
            <select 
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option>All Locations</option>
              <option>BKK1</option>
              <option>BKK2</option>
              <option>Chamkarmon</option>
              <option>Riverside</option>
              <option>Diamond Island</option>
            </select>
          </div>

          {/* Price Range Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Price Range
            </label>
            <select 
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option>All Prices</option>
              {activeCategory === 'Sale' || activeCategory === 'All' ? (
                <>
                  <option>$50K - $150K</option>
                  <option>$150K - $300K</option>
                  <option>$300K+</option>
                </>
              ) : null}
              {activeCategory === 'Rent' || activeCategory === 'All' ? (
                <>
                  <option>$500 - $1,000/mo</option>
                  <option>$1,000 - $2,000/mo</option>
                  <option>$2,000+/mo</option>
                </>
              ) : null}
            </select>
          </div>

          {/* Unit Type Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Unit Type
            </label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option>All Types</option>
              <option>Studio</option>
              <option>1 Bedroom</option>
              <option>2 Bedrooms</option>
              <option>3+ Bedrooms</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Status
            </label>
            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option>All</option>
              <option>Active</option>
              <option>Coming Soon</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-gray-600">
          Showing <span className="font-semibold text-[#001F5B]">{filteredProperties.length}</span> properties
          {activeCategory !== 'All' && (
            <span className="ml-1">
              for <span className="font-semibold text-[#EF2D2C]">{activeCategory}</span>
            </span>
          )}
        </p>
        <select className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#EF2D2C] transition">
          <option>Sort by: Featured</option>
          <option>Price: Low to High</option>
          <option>Price: High to Low</option>
          <option>Newest First</option>
        </select>
      </div>
      
      {/* Properties Grid */}
      {filteredProperties.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProperties.map((property) => (
            <Link
              key={property.id}
              to={`/properties/${property.id}`}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group border-2 border-transparent hover:border-[#EF2D2C]/20"
            >
              {/* Property Image */}
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback
                  src={
                    property.id === 'P001' || property.id === 'P006' ? 'https://images.unsplash.com/photo-1717910370268-a8dc78aba03a?w=400&h=300&fit=crop' :
                    property.id === 'P002' || property.id === 'P007' ? 'https://images.unsplash.com/photo-1707922069493-318a1ac46183?w=400&h=300&fit=crop' :
                    property.id === 'P003' || property.id === 'P008' ? 'https://images.unsplash.com/photo-1769693100571-c8d6282ade83?w=400&h=300&fit=crop' :
                    property.id === 'P004' || property.id === 'P009' ? 'https://images.unsplash.com/photo-1772729489173-9ae6229330c5?w=400&h=300&fit=crop' :
                    'https://images.unsplash.com/photo-1655275194194-6ed866fe46b3?w=400&h=300&fit=crop'
                  }
                  alt={property.projectName}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Exclusive Badge - Show on Exclusive Properties */}
                {(property.id === 'P002' || property.id === 'P005') && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center space-x-1.5">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>EXCLUSIVE</span>
                  </div>
                )}
                
                {/* Status Badge */}
                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${
                  property.status === 'Active' ? 'bg-green-500 text-white' :
                  property.status === 'Sold Out' ? 'bg-red-500 text-white' :
                  'bg-yellow-500 text-white'
                }`}>
                  {property.status}
                </div>

                {/* Category Badge - Only show if not showing exclusive badge */}
                {!(property.id === 'P002' || property.id === 'P005') && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
                       style={{ 
                         backgroundColor: property.category === 'Sale' ? '#001F5B' : '#EF2D2C',
                         color: 'white' 
                       }}>
                    {property.category === 'Sale' ? 'FOR SALE' : 'FOR RENT'}
                  </div>
                )}

                {/* Quick View Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <button className="w-full py-2 bg-white/90 backdrop-blur-sm text-[#001F5B] font-semibold rounded-lg hover:bg-white transition">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Property Details */}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 group-hover:text-[#EF2D2C] transition" style={{ color: '#001F5B' }}>
                  {property.projectName}
                </h3>
                
                <div className="flex items-start text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-2 mt-1 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                  <span className="text-sm">{property.location}</span>
                </div>

                {/* Promotional Text for Exclusive Properties */}
                {(property.id === 'P002' || property.id === 'P005') && activeCategory === 'Exclusive' && (
                  <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FFF5F5' }}>
                    <p className="text-sm text-gray-700">
                      {property.id === 'P002' 
                        ? '🌟 Prime riverside location • Award-winning design • High ROI potential'
                        : '👑 Ultra-luxury living • Private marina • Limited collection of 80 residences'
                      }
                    </p>
                  </div>
                )}
                
                {/* Price & Availability */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">
                      {property.category === 'Sale' ? 'Price Range' : 'Monthly Rent'}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: '#EF2D2C' }}>
                      {property.priceRange}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 mb-1">Available</p>
                    <p className="font-bold text-gray-900">
                      {property.availableUnits}/{property.totalUnits}
                    </p>
                    <p className="text-xs text-gray-500">units</p>
                  </div>
                </div>
                
                {/* Unit Types */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {property.type.slice(0, 4).map((type, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 text-xs font-medium rounded-full" 
                      style={{ backgroundColor: '#FEF2F2', color: '#8B0A1C' }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
                
                {/* Amenities */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 line-clamp-1">
                    {property.amenities.slice(0, 3).join(' • ')}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Properties Found</h3>
          <p className="text-gray-500">Try adjusting your filters to see more results</p>
        </div>
      )}

      {/* CTA Section */}
      <div className="mt-16 bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] rounded-2xl p-8 lg:p-12 text-white text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-4" style={{ color: '#EF2D2C' }} />
        <h2 className="text-3xl font-bold mb-4">Can't Find What You're Looking For?</h2>
        <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
          Let our AI assistant help you find the perfect property based on your preferences
        </p>
        <Link 
          to="/chat" 
          className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
          style={{ backgroundColor: '#EF2D2C', color: 'white' }}
        >
          <span>Chat with AI Assistant</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}