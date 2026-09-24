import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { MapPin, Building2, Home, Key, TrendingUp, Filter, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";

type PublicProject = Awaited<ReturnType<typeof api.inventory.public.projects.list.query>>[number];
/** Mirrors the back office: EXCLUSIVE = its published Projects (development projects, listed
 * first) plus Sales/Rent listings an admin badged EXCLUSIVE; SALE/RENT = individual properties
 * only, newest first — development projects live solely under Exclusive. */
type CategoryFilter = 'EXCLUSIVE' | 'SALE' | 'RENT';

function inTab(p: PublicProject, tab: CategoryFilter): boolean {
  if (tab === 'EXCLUSIVE') return p.isDevelopment || p.badge === 'EXCLUSIVE';
  return !p.isDevelopment && p.category === tab;
}

// Multiples of 3 so every page fills complete rows of the 3-column grid.
const PAGE_SIZES = [21, 51, 99];

/** 1 … 4 5 6 … 12 — always shows first/last and the current page's neighbours. */
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  const pages: (number | '…')[] = [1];
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

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
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('EXCLUSIVE');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedType, setSelectedType] = useState<'All' | PublicProject['propertyType']>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | PublicProject['status']>('All');
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);
  const resultsRef = useRef<HTMLDivElement>(null);

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
    if (!inTab(p, activeCategory)) return false;
    if (selectedLocation !== 'All Locations' && (p.city ?? p.location) !== selectedLocation) return false;
    if (selectedType !== 'All' && p.propertyType !== selectedType) return false;
    if (selectedStatus !== 'All' && p.status !== selectedStatus) return false;
    return true;
  });
  // The server returns newest first. Exclusive puts its Projects ahead of badged listings; the
  // sort is stable, so each group keeps that newest-first order. Sale/Rent keep it as-is.
  if (activeCategory === 'EXCLUSIVE') filtered.sort((a, b) => Number(b.isDevelopment) - Number(a.isDevelopment));

  const exclusiveCount = all.filter((p) => inTab(p, 'EXCLUSIVE')).length;
  const saleCount = all.filter((p) => inTab(p, 'SALE')).length;
  const rentCount = all.filter((p) => inTab(p, 'RENT')).length;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visible = filtered.slice(pageStart, pageStart + pageSize);

  function goToPage(n: number) {
    setPage(n);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
            onClick={() => { setActiveCategory('EXCLUSIVE'); setPage(1); }}
            className={`flex-1 flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-semibold transition-all ${
              activeCategory === 'EXCLUSIVE'
                ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Star className="w-5 h-5" />
            <span>Exclusive Property</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${activeCategory === 'EXCLUSIVE' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {exclusiveCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveCategory('SALE'); setPage(1); }}
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
            onClick={() => { setActiveCategory('RENT'); setPage(1); }}
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
              onChange={(e) => { setSelectedLocation(e.target.value); setPage(1); }}
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
              onChange={(e) => { setSelectedType(e.target.value as typeof selectedType); setPage(1); }}
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
              onChange={(e) => { setSelectedStatus(e.target.value as typeof selectedStatus); setPage(1); }}
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

      {/* Results Counter + page size */}
      {projects && (
        <div ref={resultsRef} className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 scroll-mt-24">
          <p className="text-gray-600">
            {filtered.length > 0 ? (
              <>
                Showing{' '}
                <span className="font-semibold text-[#001F5B]">
                  {pageStart + 1}–{pageStart + visible.length}
                </span>{' '}
                of <span className="font-semibold text-[#001F5B]">{filtered.length}</span> properties
              </>
            ) : (
              <>Showing <span className="font-semibold text-[#001F5B]">0</span> properties</>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-1.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            per page
          </label>
        </div>
      )}

      {/* Properties Grid */}
      {!projects && !error ? (
        <div className="text-center py-16 text-gray-400">Loading properties…</div>
      ) : filtered.length > 0 ? (
        <>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visible.map((property) => (
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

        {pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5 flex-wrap">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
              className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-[#EF2D2C] hover:text-[#EF2D2C] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {pageNumbers(currentPage, pageCount).map((n, i) =>
              n === '…' ? (
                <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => goToPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={`min-w-10 h-10 px-3 rounded-lg font-semibold transition ${
                    n === currentPage
                      ? 'bg-gradient-to-r from-[#001F5B] to-[#8B0A1C] text-white shadow-lg'
                      : 'border-2 border-gray-200 text-gray-700 hover:border-[#EF2D2C] hover:text-[#EF2D2C]'
                  }`}
                >
                  {n}
                </button>
              ),
            )}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              aria-label="Next page"
              className="p-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-[#EF2D2C] hover:text-[#EF2D2C] transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </nav>
        )}
        </>
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
