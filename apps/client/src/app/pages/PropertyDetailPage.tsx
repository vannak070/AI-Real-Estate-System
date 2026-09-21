import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  MapPin, Bed, Bath, Maximize, Calendar, ArrowLeft, MessageSquare, Star, CheckCircle,
  Phone, Mail, Share2, Heart, ChevronLeft, ChevronRight, Send,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { api, resolveUploadUrl } from "../../lib/api";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

type PublicProject = NonNullable<Awaited<ReturnType<typeof api.inventory.public.projects.get.query>>>;
type PublicProjectSummary = Awaited<ReturnType<typeof api.inventory.public.projects.list.query>>[number];
type PublicUnit = Awaited<ReturnType<typeof api.inventory.public.units.list.query>>[number];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=800&fit=crop';

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

const UNIT_STATUS_TONE: Record<PublicUnit['status'], string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  RESERVED: 'bg-yellow-100 text-yellow-700',
  SOLD: 'bg-red-100 text-red-700',
};

function money(n: number | null) {
  if (n == null) return 'Price on request';
  return `$${n.toLocaleString()}`;
}

function NextArrow({ onClick }: { onClick?: () => void }) {
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

function PrevArrow({ onClick }: { onClick?: () => void }) {
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

function EnquiryForm({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`Hi, I'm interested in ${projectName}.`);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const missing = [!name.trim() && 'Name', !email.trim() && !phone.trim() && 'Email or phone'].filter(
    (m): m is string => typeof m === 'string',
  );

  function submit() {
    if (missing.length > 0) return;
    setStatus('sending');
    api.crm.public.submitLead
      .mutate({ name, email: email || undefined, phone: phone || undefined, message, preferredProjectId: projectId })
      .then(() => setStatus('sent'))
      .catch(() => setStatus('error'));
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="font-semibold">Thanks — we've got your enquiry.</p>
        <p className="text-sm mt-1">One of our agents will reach out shortly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
      />
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
      />
      <input
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition"
      />
      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#EF2D2C] transition resize-none"
      />
      {missing.length > 0 && <p className="text-xs text-[#8B0A1C]">Required: {missing.join(', ')}.</p>}
      {status === 'error' && <p className="text-xs text-[#8B0A1C]">Something went wrong — please try again.</p>}
      <button
        onClick={submit}
        disabled={missing.length > 0 || status === 'sending'}
        className="w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
        style={{ backgroundColor: '#EF2D2C', color: 'white' }}
      >
        <Send className="w-5 h-5" />
        <span>{status === 'sending' ? 'Sending…' : 'Request Info'}</span>
      </button>
    </div>
  );
}

export function PropertyDetailPage() {
  const { id = '' } = useParams();
  const [property, setProperty] = useState<PublicProject | null | undefined>(undefined);
  const [units, setUnits] = useState<PublicUnit[]>([]);
  const [related, setRelated] = useState<PublicProjectSummary[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setProperty(undefined);
    api.inventory.public.projects.get.query({ id }).then(setProperty).catch(() => setProperty(null));
    api.inventory.public.units.list.query({ projectId: id }).then(setUnits).catch(() => setUnits([]));
  }, [id]);

  useEffect(() => {
    if (!property) return;
    api.inventory.public.projects.list
      .query()
      .then((all) =>
        setRelated(all.filter((p) => p.category === property.category && p.id !== property.id).slice(0, 3)),
      )
      .catch(() => setRelated([]));
  }, [property]);

  if (property === undefined) {
    return <div className="text-center py-20 text-gray-400">Loading…</div>;
  }
  if (property === null) {
    return <div className="text-center py-20">Property not found</div>;
  }

  const propertyImages = property.imageUrls.length > 0 ? property.imageUrls.map(resolveUploadUrl) : [FALLBACK_IMAGE];
  const unitTypeNames = Array.from(new Set(units.map((u) => u.unitTypeName).filter((n): n is string => !!n)));

  const carouselSettings = {
    dots: true,
    infinite: propertyImages.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: propertyImages.length > 1,
    autoplaySpeed: 4000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    dotsClass: "slick-dots !bottom-6",
    customPaging: () => <div className="w-3 h-3 rounded-full bg-white/60 hover:bg-white transition-all" />,
  };

  return (
    <div className="bg-gray-50 min-h-screen">
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
                <ImageWithFallback src={img} alt={`${property.name} - Image ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </Slider>

          <div className="absolute top-6 left-6 z-10 flex gap-3">
            {property.badge !== 'NONE' && (
              <div className="bg-gradient-to-r from-[#EF2D2C] to-[#8B0A1C] text-white px-4 py-2 rounded-full font-bold text-sm shadow-2xl flex items-center space-x-2">
                <Star className="w-4 h-4 fill-white" />
                <span>{property.badge === 'EXCLUSIVE' ? 'EXCLUSIVE' : 'BEST OFFER'}</span>
              </div>
            )}
            <div className={`px-4 py-2 rounded-full font-bold text-sm shadow-2xl ${STATUS_TONE[property.status]}`}>
              {STATUS_LABEL[property.status]}
            </div>
          </div>

          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
          >
            <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-lg mb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold mb-4" style={{ color: '#001F5B' }}>
                    {property.name}
                  </h1>
                  <div className="flex items-center text-gray-600 text-lg">
                    <MapPin className="w-5 h-5 mr-2" style={{ color: '#EF2D2C' }} />
                    <span>{property.location}</span>
                  </div>
                </div>
                <button className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
              </div>

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
                    {property.totalUnits > 0 ? Math.round((property.availableUnits / property.totalUnits) * 100) : 0}%
                  </p>
                </div>
              </div>

              {(property.developer || property.tenure || property.totalFloors) && (
                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b text-sm">
                  {property.developer && (
                    <div>
                      <p className="text-gray-500 mb-1">Developer</p>
                      <p className="font-semibold text-gray-900">{property.developer}</p>
                    </div>
                  )}
                  {property.tenure && (
                    <div>
                      <p className="text-gray-500 mb-1">Tenure</p>
                      <p className="font-semibold text-gray-900">{property.tenure}</p>
                    </div>
                  )}
                  {property.totalFloors && (
                    <div>
                      <p className="text-gray-500 mb-1">Total Floors</p>
                      <p className="font-semibold text-gray-900">{property.totalFloors}</p>
                    </div>
                  )}
                </div>
              )}

              {unitTypeNames.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h3 className="text-lg font-bold mb-4" style={{ color: '#001F5B' }}>
                    Unit Types Available
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {unitTypeNames.map((type) => (
                      <span
                        key={type}
                        className="px-5 py-2.5 rounded-lg font-semibold border-2"
                        style={{ borderColor: '#001F5B', backgroundColor: '#F0F4FF', color: '#001F5B' }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {property.amenities.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4" style={{ color: '#001F5B' }}>
                    Premium Amenities & Facilities
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {property.amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                        <span className="text-gray-700 font-medium">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Available Units */}
            {units.length > 0 && (
              <div className="bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-2xl font-bold mb-6" style={{ color: '#001F5B' }}>
                  Units ({units.length})
                </h2>
                <div className="space-y-4">
                  {units.map((unit) => (
                    <div key={unit.id} className="p-6 rounded-xl border-2 border-gray-100 hover:border-[#EF2D2C]/30 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-1" style={{ color: '#001F5B' }}>
                            Unit {unit.code}
                          </h3>
                          <p className="text-gray-600">{unit.unitTypeName ?? '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold" style={{ color: '#EF2D2C' }}>
                            {money(unit.listPrice)}
                          </p>
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold mt-2 ${UNIT_STATUS_TONE[unit.status]}`}>
                            {unit.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Maximize className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Size</p>
                            <p className="font-semibold">{unit.areaSqm ? `${unit.areaSqm} sqm` : '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Bed className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Beds</p>
                            <p className="font-semibold">{unit.bedrooms ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Bath className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Baths</p>
                            <p className="font-semibold">{unit.bathrooms ?? '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar className="w-5 h-5" style={{ color: '#EF2D2C' }} />
                          <div>
                            <p className="text-xs text-gray-500">Floor</p>
                            <p className="font-semibold">{unit.floor ?? '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 sticky top-4">
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">Starting from</p>
                <p className="text-3xl font-bold" style={{ color: '#EF2D2C' }}>
                  {money(property.startingPrice)}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <Link
                  to="/chat"
                  state={{ propertyId: property.id, propertyName: property.name }}
                  className="w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
                  style={{ backgroundColor: '#001F5B', color: 'white' }}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Chat with AI</span>
                </Link>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-bold mb-3" style={{ color: '#001F5B' }}>
                  Request Info
                </h3>
                <EnquiryForm projectId={property.id} projectName={property.name} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#001F5B] to-[#8B0A1C] p-6 rounded-2xl shadow-lg text-white">
              <h3 className="font-bold text-lg mb-4">Property Highlights</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Prime location in {property.location}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>{property.availableUnits} units currently available</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Phone className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>Talk to an agent — use the form above</span>
                </li>
                <li className="flex items-start space-x-2">
                  <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#EF2D2C' }} />
                  <span>We reply to every enquiry within 1 business day</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related Properties */}
        {related.length > 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#001F5B' }}>
                You May Also Like
              </h2>
              <Link to="/properties" className="text-sm font-semibold hover:underline" style={{ color: '#EF2D2C' }}>
                View All Properties →
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/properties/${rel.id}`}
                  className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all overflow-hidden border-2 border-transparent hover:border-[#EF2D2C]/20"
                >
                  <div className="relative h-48 overflow-hidden">
                    <ImageWithFallback
                      src={rel.imageUrls[0] ? resolveUploadUrl(rel.imageUrls[0]) : FALLBACK_IMAGE}
                      alt={rel.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div
                      className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg text-white"
                      style={{ backgroundColor: rel.category === 'SALE' ? '#001F5B' : '#EF2D2C' }}
                    >
                      {rel.category === 'SALE' ? 'FOR SALE' : 'FOR RENT'}
                    </div>
                    <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg ${STATUS_TONE[rel.status]}`}>
                      {STATUS_LABEL[rel.status]}
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold mb-2 group-hover:text-[#EF2D2C] transition" style={{ color: '#001F5B' }}>
                      {rel.name}
                    </h3>
                    <div className="flex items-start text-gray-600 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" style={{ color: '#EF2D2C' }} />
                      <span className="line-clamp-1">{rel.location}</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Starting from</p>
                        <p className="text-xl font-bold" style={{ color: '#EF2D2C' }}>
                          {money(rel.startingPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-0.5">Available</p>
                        <p className="font-bold text-gray-900">{rel.availableUnits}</p>
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
