import { useState } from "react";
import { useParams, Link } from "react-router";
import { mockProperties, mockUnits } from '@era/mock-data';
import { MapPin, Bed, Bath, Maximize, Calendar, ArrowLeft, MessageSquare, Star, CheckCircle, Phone, Mail, Share2, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Custom Arrow Components
function NextArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-xl flex items-center justify-center transition-all hover:scale-110"
      style={{ color: '#EF2D2C' }}
    >
      <ChevronRight className="w-6 h-6" />
    </button>
  );
}

function PrevArrow(props: any) {
  const { onClick } = props;
  return (
    <button
      onClick={onClick}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-xl flex items-center justify-center transition-all hover:scale-110"
      style={{ color: '#EF2D2C' }}
    >
      <ChevronLeft className="w-6 h-6" />
    </button>
  );
}

export function PropertyDetailPage() {
  const { id } = useParams();
  const property = mockProperties.find(p => p.id === id);
  const units = mockUnits.filter(u => u.projectId === id);
  const [isFavorite, setIsFavorite] = useState(false);
  
  if (!property) {
    return <div className="text-center py-20">Property not found</div>;
  }

  // Get property images (multiple images for carousel)
  const propertyImages = [
    property.id === 'P001' || property.id === 'P006' ? 'https://images.unsplash.com/photo-1717910370268-a8dc78aba03a?w=1200&h=800&fit=crop' :
    property.id === 'P002' || property.id === 'P007' ? 'https://images.unsplash.com/photo-1707922069493-318a1ac46183?w=1200&h=800&fit=crop' :
    property.id === 'P003' || property.id === 'P008' ? 'https://images.unsplash.com/photo-1769693100571-c8d6282ade83?w=1200&h=800&fit=crop' :
    property.id === 'P004' || property.id === 'P009' ? 'https://images.unsplash.com/photo-1772729489173-9ae6229330c5?w=1200&h=800&fit=crop' :
    'https://images.unsplash.com/photo-1655275194194-6ed866fe46b3?w=1200&h=800&fit=crop',
    
    // Additional images
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop'
  ];

  // Related properties (same category, excluding current)
  const relatedProperties = mockProperties
    .filter(p => p.category === property.category && p.id !== property.id && p.status === 'Active')
    .slice(0, 3);

  // Carousel settings
  const carouselSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    dotsClass: "slick-dots !bottom-6",
    customPaging: () => (
      <div className="w-3 h-3 rounded-full bg-white/60 hover:bg-white transition-all" />
    )
  };
  
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Back Button */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link to="/properties" className="flex items-center hover:opacity-80 transition" style={{ color: '#EF2D2C' }}>
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Properties
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Carousel */}
        <div className="mb-8 relative rounded-2xl overflow-hidden shadow-2xl">
          <Slider {...carouselSettings}>
            {propertyImages.map((img, idx) => (
              <div key={idx} className="relative h-[500px]">
                <ImageWithFallback
                  src={img}
                  alt={`${property.projectName} - Image ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </Slider>

          {/* Floating Badges on Carousel */}
          <div className="absolute top-6 left-6 z-10 flex gap-3">
            {(property.id === 'P002' || property.id === 'P005') && (
              <div className="bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white px-4 py-2 rounded-full font-bold text-sm shadow-2xl flex items-center space-x-2">
                <Star className="w-4 h-4 fill-white" />
                <span>EXCLUSIVE</span>
              </div>
            )}
            <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-2xl ${
              property.status === 'Active' ? 'bg-green-500 text-white' :
              property.status === 'Sold Out' ? 'bg-red-500 text-white' :
              'bg-yellow-500 text-white'
            }`}>
              {property.status}
            </div>
          </div>

          {/* Favorite Button */}
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* Project Details */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-lg mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold mb-4" style={{ color: '#001F5B' }}>
                    {property.projectName}
                  </h1>
                  <div className="flex items-center text-gray-600 text-lg">
                    <MapPin className="w-5 h-5 mr-2" style={{ color: '#EF2D2C' }} />
                    <span>{property.location}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
                    <Share2 className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Units</p>
                  <p className="text-2xl font-bold text-gray-900">{property.totalUnits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Available</p>
                  <p className="text-2xl font-bold text-green-600">{property.availableUnits}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Availability</p>
                  <p className="text-2xl font-bold" style={{ color: '#EF2D2C' }}>
                    {Math.round((property.availableUnits / property.totalUnits) * 100)}%
                  </p>
                </div>
              </div>

              {/* Unit Types */}
              <div className="mb-6 pb-6 border-b">
                <h3 className="text-lg font-bold mb-4" style={{ color: '#001F5B' }}>
                  Unit Types Available
                </h3>
                <div className="flex flex-wrap gap-3">
                  {property.type.map((type, idx) => (
                    <span 
                      key={idx} 
                      className="px-5 py-2.5 rounded-lg font-semibold border-2"
                      style={{ 
                        borderColor: '#001F5B',
                        backgroundColor: '#F0F4FF',
                        color: '#001F5B'
                      }}
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: '#001F5B' }}>
                  Premium Amenities & Facilities
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {property.amenities.map((amenity, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                      <span className="text-gray-700 font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Available Units */}
            {units.length > 0 && (
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#001F5B' }}>
                  Available Units ({units.length})
                </h2>
                <div className="space-y-4">
                  {units.map((unit) => (
                    <div key={unit.id} className="p-6 rounded-xl border-2 border-gray-100 hover:border-[#EF2D2C]/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1" style={{ color: '#001F5B' }}>
                            Unit {unit.unitNumber}
                          </h3>
                          <p className="text-gray-600">{unit.type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: '#EF2D2C' }}>
                            ${(unit.price / 1000).toFixed(0)}K
                          </p>
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold mt-2 ${
                            unit.status === 'Available' ? 'bg-green-100 text-green-700' :
                            unit.status === 'Reserved' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {unit.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Maximize className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Size</p>
                            <p className="font-semibold">{unit.size} sqm</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Bed className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Beds</p>
                            <p className="font-semibold">{unit.bedrooms}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Bath className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Baths</p>
                            <p className="font-semibold">{unit.bathrooms}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Floor</p>
                            <p className="font-semibold">{unit.floor}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {unit.features.map((feature, idx) => (
                          <span 
                            key={idx} 
                            className="px-3 py-1 text-sm font-medium rounded-full" 
                            style={{ backgroundColor: '#FEF2F2', color: '#8B0A1C' }}
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                      
                      {unit.status === 'Available' && (
                        <button 
                          className="w-full py-3 rounded-lg font-semibold transition-all"
                          style={{ backgroundColor: '#EF2D2C', color: 'white' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B0A1C'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF2D2C'}
                        >
                          Schedule Viewing
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            {/* Price Card */}
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 sticky top-4">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">
                  {property.category === 'Sale' ? 'Price Range' : 'Monthly Rent'}
                </p>
                <p className="text-3xl font-bold" style={{ color: '#EF2D2C' }}>
                  {property.priceRange}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <Link 
                  to="/chat" 
                  state={{ propertyId: property.id, propertyName: property.projectName }}
                  className="w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
                  style={{ backgroundColor: '#EF2D2C', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8B0A1C'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF2D2C'}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Chat with AI</span>
                </Link>

                <button 
                  className="w-full py-3 px-4 rounded-lg font-semibold border-2 transition-all flex items-center justify-center space-x-2"
                  style={{ 
                    borderColor: '#001F5B',
                    color: '#001F5B',
                    backgroundColor: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#001F5B';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#001F5B';
                  }}
                >
                  <Phone className="w-5 h-5" />
                  <span>Call Now</span>
                </button>

                <button 
                  className="w-full py-3 px-4 rounded-lg font-semibold border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-all flex items-center justify-center space-x-2"
                >
                  <Mail className="w-5 h-5" />
                  <span>Email Inquiry</span>
                </button>
              </div>

              <div className="pt-6 border-t">
                <p className="text-xs text-gray-500 text-center">
                  Need help? Our AI assistant is available 24/7 to answer your questions
                </p>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] p-6 rounded-2xl shadow-lg text-white">
              <h3 className="font-bold text-lg mb-4">Property Highlights</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Prime location in {property.location.split(',')[1]?.trim() || 'Phnom Penh'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>{property.availableUnits} units currently available</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Multiple unit types to choose from</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Premium amenities included</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Related Properties */}
        {relatedProperties.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#001F5B' }}>
                You May Also Like
              </h2>
              <Link 
                to="/properties" 
                className="text-sm font-semibold hover:underline"
                style={{ color: '#EF2D2C' }}
              >
                View All Properties →
              </Link>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {relatedProperties.map((relatedProperty) => (
                <Link
                  key={relatedProperty.id}
                  to={`/properties/${relatedProperty.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all overflow-hidden border-2 border-transparent hover:border-[#EF2D2C]/20"
                >
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={
                        relatedProperty.id === 'P001' || relatedProperty.id === 'P006' ? 'https://images.unsplash.com/photo-1717910370268-a8dc78aba03a?w=400&h=300&fit=crop' :
                        relatedProperty.id === 'P002' || relatedProperty.id === 'P007' ? 'https://images.unsplash.com/photo-1707922069493-318a1ac46183?w=400&h=300&fit=crop' :
                        relatedProperty.id === 'P003' || relatedProperty.id === 'P008' ? 'https://images.unsplash.com/photo-1769693100571-c8d6282ade83?w=400&h=300&fit=crop' :
                        relatedProperty.id === 'P004' || relatedProperty.id === 'P009' ? 'https://images.unsplash.com/photo-1772729489173-9ae6229330c5?w=400&h=300&fit=crop' :
                        'https://images.unsplash.com/photo-1655275194194-6ed866fe46b3?w=400&h=300&fit=crop'
                      }
                      alt={relatedProperty.projectName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    
                    {/* Category Badge */}
                    {(relatedProperty.id === 'P002' || relatedProperty.id === 'P005') ? (
                      <div className="absolute top-3 left-3 bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-white" />
                        <span>EXCLUSIVE</span>
                      </div>
                    ) : (
                      <div 
                        className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg text-white"
                        style={{ backgroundColor: relatedProperty.category === 'Sale' ? '#001F5B' : '#EF2D2C' }}
                      >
                        {relatedProperty.category === 'Sale' ? 'FOR SALE' : 'FOR RENT'}
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg bg-green-500 text-white">
                      {relatedProperty.status}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-[#EF2D2C] transition" style={{ color: '#001F5B' }}>
                      {relatedProperty.projectName}
                    </h3>
                    
                    <div className="flex items-start text-gray-600 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                      <span className="line-clamp-1">{relatedProperty.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
                        <p className="text-xl font-bold" style={{ color: '#EF2D2C' }}>
                          {relatedProperty.priceRange.split(' - ')[0]}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Available</p>
                        <p className="font-bold text-gray-900">
                          {relatedProperty.availableUnits}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}