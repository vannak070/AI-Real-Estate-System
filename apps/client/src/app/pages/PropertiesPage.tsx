import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { MapPin, Building2, Home, Key, TrendingUp, Filter, Star } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";

type PublicProject = Awaited<ReturnType<typeof api.inventory.public.projects.list.query>>[number];
type CategoryFilter = 'All' | 'SALE' | 'RENT';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=300&fit=crop';

const STATUS_LABEL: Record<PublicProject['status'], string> = {
  PLANNING: 'Coming Soon',
  SELLING: 'Selling Now',
  SOLD_OUT: 'Sold Out',
  HANDOVER: 'Handover',
  COMPLETED: 'Completed',
};

const STATUS_TONE: Record<PublicProject['status'], string> = {
  PLANNING: 'bg-yellow-500 text-white',
  SELLING: 'bg-green-500 text-white',
  SOLD_OUT: 'bg-red-500 text-white',
  HANDOVER: 'bg-blue-500 text-white',
  COMPLETED: 'bg-gray-500 text-white',
};

const TYPE_LABEL: Record<PublicProject['propertyType'], string> = {
  CONDO: 'Condo',
  HOUSE: 'House',
  VILLA: 'Villa',
  TOWNHOUSE: 'Townhouse',
  SHOPHOUSE: 'Shophouse',
  LAND: 'Land',
  BOREY: 'Borey',
  COMMERCIAL: 'Commercial',
};

function money(n: number | null) {
  if (n == null) return 'Price on request';
  return `$${n.toLocaleString()}`;
}

export function PropertiesPage() {
  const [projects, setProjects] = useState<PublicProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedType, setSelectedType] = useState<'All' | PublicProject['propertyType']>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | PublicProject['status']>('All');

  useEffect(() => {
    api.inventory.public.projects.list
      .query()
      .then(setProjects)
      .catch(() => setError('Could not load properties right now — please try again shortly.'));
  }, []);

  const all = projects ?? [];
  const locations = useMemo(
    () => Array.from(new Set((projects ?? []).map((p) => p.city ?? p.location))).sort(),
    [projects],
  );

  const filtered = all.filter((p) => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    if (selectedLocation !== 'All Locations' && (p.city ?? p.location) !== selectedLocation) return false;
    if (selectedType !== 'All' && p.propertyType !== selectedType) return false;
    if (selectedStatus !== 'All' && p.status !== selectedStatus) return false;
    return true;
  });

  const saleCount = all.filter((p) => p.category === 'SALE').length;
  const rentCount = all.filter((p) => p.category === 'RENT').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#001F5B' }}>
          Explore Our Properties
        </h1>
        <p className="text-xl text-gray-600">
          Discover {all.length} premium projects across Cambodia
        </p>
      </div>

      {/* Category Sub-Menu */}
      <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 border-2 border-gray-100">
        <div className="flex flex-col sm:flex-row gap-2">
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
            <span className={`text-sm px-2 py-0.5 rounded-full ${activeCategory === 'All' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {all.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('SALE')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'SALE'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>For Sale</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${activeCategory === 'SALE' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {saleCount}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory('RENT')}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'RENT'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Key className="w-5 h-5" />
            <span>For Rent</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${activeCategory === 'RENT' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              {locations.map((loc) => (
                <option key={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Property Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as typeof selectedType)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option value="All">All Types</option>
              {(Object.keys(TYPE_LABEL) as PublicProject['propertyType'][]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#001F5B' }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              <option value="All">All</option>
              {(Object.keys(STATUS_LABEL) as PublicProject['status'][]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <p className="mb-6 text-center text-[#8B0A1C]">{error}</p>}

      {/* Results Counter */}
      {projects && (
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-semibold text-[#001F5B]">{filtered.length}</span> properties
          </p>
        </div>
      )}

      {/* Properties Grid */}
      {!projects && !error ? (
        <div className="text-center py-16 text-gray-400">Loading properties…</div>
      ) : filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((property) => (
            <Link
              key={property.id}
              to={`/properties/${property.id}`}
              className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all overflow-hidden group border-2 border-transparent hover:border-[#EF2D2C]/20"
            >
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback
                  src={property.imageUrls[0] ? resolveUploadUrl(property.imageUrls[0]) : FALLBACK_IMAGE}
                  alt={property.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {property.badge !== 'NONE' && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center space-x-1.5">
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>{property.badge === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'BEST OFFER'}</span>
                  </div>
                )}

                <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${STATUS_TONE[property.status]}`}>
                  {STATUS_LABEL[property.status]}
                </div>

                {property.badge === 'NONE' && (
                  <div
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg text-white"
                    style={{ backgroundColor: property.category === 'SALE' ? '#001F5B' : '#EF2D2C' }}
                  >
                    {property.category === 'SALE' ? 'FOR SALE' : 'FOR RENT'}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-4 left-4 right-4">
                    <button className="w-full py-2 bg-white/90 backdrop-blur-sm text-[#001F5B] font-semibold rounded-lg hover:bg-white transition">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 group-hover:text-[#EF2D2C] transition" style={{ color: '#001F5B' }}>
                  {property.name}
                </h3>

                <div className="flex items-start text-gray-600 mb-4">
                  <MapPin className="w-4 h-4 mr-2 mt-1 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                  <span className="text-sm">{property.location}</span>
                </div>

                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Starting from</p>
                    <p className="text-2xl font-bold" style={{ color: '#EF2D2C' }}>
                      {money(property.startingPrice)}
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

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: '#FEF2F2', color: '#8B0A1C' }}>
                    {TYPE_LABEL[property.propertyType]}
                  </span>
                </div>

                {property.amenities.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 line-clamp-1">{property.amenities.slice(0, 3).join(' • ')}</p>
                  </div>
                )}
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
