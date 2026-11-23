import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, Bell, Bike, ChevronRight, Clock, X,
  MapPin, Phone, CreditCard, Star, DollarSign,
  Activity, Timer, CheckCircle2, ParkingSquare, MessageCircle, Navigation, XCircle,
  Radio, ChevronDown, ChevronUp, ShieldCheck, UserCheck
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

// Lazy-load the map so Leaflet doesn't block the initial render
const BikeTrackerMap = lazy(() => import('../../components/BikeTrackerMap'));

// Countdown helper: returns { label, secondsLeft, expired }
function useCountdown(startIso, limitMinutes) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  useEffect(() => {
    if (!startIso || !limitMinutes) return;
    const deadline = new Date(new Date(startIso).getTime() + limitMinutes * 60000);
    const calc = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startIso, limitMinutes]);
  if (secondsLeft === null) return null;
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return { secondsLeft, label: `${m}:${s.toString().padStart(2, '0')}`, expired: secondsLeft === 0 };
}

function ActiveBikeModal({ bike, request, onClose, defaultShowTracker = false }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [showTracker, setShowTracker] = useState(defaultShowTracker);

  // Two countdowns: arrival (20 min from acceptedAt) and trip duration (from tripStartedAt)
  const arrivalCountdown = useCountdown(request?.acceptedAt, 20);
  const tripCountdown = useCountdown(request?.tripStartedAt, (request?.estimatedDuration || 0) * 60);

  const bikeStatus = request?.bikeStatus || 'at_garage';
  const estimatedEarnings = request ? Math.round(request.estimatedFare * 0.87) : '—';

  // Show tracker for all active states (heading, in_use, returning)
  const canTrack = bikeStatus === 'in_use' || bikeStatus === 'at_garage' || bikeStatus === 'returning';

  // When accepted but not yet in_use → renter is heading to the bike
  const statusInfo = {
    at_garage: {
      label: request?.status === 'accepted' ? 'Heading to Vehicle' : 'At Garage',
      color: '#3B82F6', bg: '#DBEAFE',
      icon: request?.status === 'accepted' ? <Navigation size={20} /> : <ParkingSquare size={20} />
    },
    in_use: { label: 'In Use', color: '#10B981', bg: '#D1FAE5', icon: <Bike size={20} /> },
    returning: { label: 'Returning', color: '#F59E0B', bg: '#FEF3C7', icon: <Timer size={20} /> },
    returned: { label: 'Returned', color: '#6B7280', bg: '#F3F4F6', icon: <CheckCircle2 size={20} /> },
  }[bikeStatus] || { label: 'Active', color: '#3B82F6', bg: '#DBEAFE', icon: <Bike size={20} /> };

  const chatUrl = request
    ? `/chat/${request.requestId || request.id}?name=${encodeURIComponent(request.renterName)}&context=${encodeURIComponent(bike.vehicleName + ' booking')}&avatar=${encodeURIComponent(request.renterAvatar || '')}`
    : '/chat';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }} onClick={onClose}>
      <div
        style={{
          background: 'white', borderRadius: 20, overflow: 'hidden',
          width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'relative' }}>
          <img src={bike.image} alt={bike.vehicleName} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white'
            }}
          >
            <X size={18} />
          </button>
          <div style={{ position: 'absolute', bottom: 14, left: 20 }}>
            <h3 style={{ color: 'white', margin: 0, marginBottom: 4 }}>{bike.vehicleName}</h3>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{bike.regNumber}</div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>

          {/* Contact Renter — available as soon as request is accepted */}
          {request && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => { onClose(); navigate(chatUrl); }}
              >
                <MessageCircle size={17} /> Message
              </button>
              <button
                className="btn btn-outline"
                style={{ width: '100%' }}
                onClick={() => toast.info('Calling renter', `Calling ${request.renterName} at ${request.renterPhone || '017XXXXXXXX'}...`)}
              >
                <Phone size={17} /> Call
              </button>
            </div>
          )}

          {/* ── Live Tracker toggle ── */}
          {canTrack && (
            <button
              className={showTracker ? 'btn btn-primary' : 'btn btn-outline'}
              style={{
                width: '100%', marginBottom: 16,
                ...(showTracker ? {} : { borderColor: '#3B82F6', color: '#3B82F6' }),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onClick={() => setShowTracker(s => !s)}
            >
              <Radio size={16} />
              {showTracker ? 'Hide Live Tracker' : '📍 Live Track Vehicle'}
            </button>
          )}

          {/* ── Embedded Map ── */}
          {showTracker && canTrack && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Radio size={12} color="#3B82F6" /> LIVE GPS TRACKER
                <span style={{ marginLeft: 'auto', color: '#6B7280' }}>Allowed radius: {bike.maxRadiusKm || 10} km</span>
              </div>
              <Suspense fallback={
                <div style={{ height: 200, background: '#F3F4F6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Loading map…
                </div>
              }>
                <BikeTrackerMap
                  vehicleId={bike.id}
                  homeLat={bike.exactLocation?.lat}
                  homeLng={bike.exactLocation?.lng}
                  radiusKm={bike.maxRadiusKm || 10}
                  bikeName={bike.vehicleName}
                />
              </Suspense>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: statusInfo.bg, borderRadius: 14, padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: statusInfo.color, marginBottom: 6 }}>VEHICLE STATUS</div>
              <div style={{ color: statusInfo.color, marginBottom: 4 }}>{statusInfo.icon}</div>
              <div style={{ fontWeight: 800, color: statusInfo.color, fontSize: 13 }}>{statusInfo.label}</div>
            </div>

            {/* Show arrival countdown when renter is heading over, trip countdown when riding */}
            {bikeStatus === 'at_garage' && arrivalCountdown && !arrivalCountdown.expired ? (
              <div style={{ background: arrivalCountdown.secondsLeft < 300 ? '#FEE2E2' : '#FEF3C7', borderRadius: 14, padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: arrivalCountdown.secondsLeft < 300 ? 'var(--error)' : '#92400E', marginBottom: 6 }}>RENTER ARRIVES IN</div>
                <Clock size={18} color={arrivalCountdown.secondsLeft < 300 ? 'var(--error)' : '#F59E0B'} style={{ marginBottom: 4 }} />
                <div style={{ fontWeight: 900, color: arrivalCountdown.secondsLeft < 300 ? 'var(--error)' : '#92400E', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{arrivalCountdown.label}</div>
              </div>
            ) : bikeStatus === 'in_use' && tripCountdown ? (
              <div style={{ background: '#D1FAE5', borderRadius: 14, padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#065F46', marginBottom: 6 }}>TRIP TIME LEFT</div>
                <Timer size={18} color="#10B981" style={{ marginBottom: 4 }} />
                <div style={{ fontWeight: 900, color: '#065F46', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{tripCountdown.label}</div>
              </div>
            ) : (
              <div style={{ background: '#FEE2E2', borderRadius: 14, padding: '14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>TRIP DURATION</div>
                <Timer size={20} color="#EF4444" style={{ marginBottom: 4 }} />
                <div style={{ fontWeight: 800, color: '#EF4444', fontSize: 18 }}>{request?.estimatedDuration || '—'}h</div>
              </div>
            )}
          </div>

          <div style={{ background: 'var(--bg-color)', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>VEHICLE LOCATION</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{bike.exactLocation?.address || bike.location}</div>
                {bike.exactLocation && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {bike.exactLocation.lat}°N, {bike.exactLocation.lng}°E
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, var(--primary), #009E45)',
            borderRadius: 14, padding: '14px', marginBottom: 16, color: 'white'
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, marginBottom: 4 }}>AMOUNT YOU'LL RECEIVE</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={22} />
              <span style={{ fontSize: 30, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>৳{estimatedEarnings}</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              ৳{request?.estimatedFare} fare · 13% platform fee deducted
            </div>
          </div>

          {request && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>RENTER DETAILS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', background: 'var(--bg-color)', borderRadius: 14, marginBottom: 10 }}>
                <img
                  src={request.renterAvatar}
                  alt={request.renterName}
                  style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{request.renterName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{request.renterRating} · {request.renterPastRides || 18} past rides</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: <Phone size={14} />, label: 'Phone', value: request.renterPhone || '017XXXXXXXX' },
                  {
                    icon: <CreditCard size={14} />, label: 'NID',
                    value: request.renterNid ? `${request.renterNid.slice(0, 4)}••••${request.renterNid.slice(-4)}` : '••••••••••'
                  },
                  { icon: <Clock size={14} />, label: 'Duration', value: `${request.estimatedDuration}h` },
                  { icon: <DollarSign size={14} />, label: 'Fare', value: `৳${request.estimatedFare}` },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-color)', borderRadius: 10, padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4 }}>
                      {item.icon}
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{item.label}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



export default function OwnerDashboard() {
  const { data, user, acceptBookingRequest, updateBookingStatus } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedBike, setSelectedBike] = useState(null);
  const [trackerDefaultOpen, setTrackerDefaultOpen] = useState(false);
  const [expandedReqId, setExpandedReqId] = useState(null);

  const isDemoOwner = user?.id === 'u1';
  const myListings = [...data.listings]
    .filter(l => l.ownerId === user?.id || (isDemoOwner && (!l.ownerId || l.ownerId === 'u1')))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const activeScooters = myListings.filter(l =>
    data.incomingRequests.some(r =>
      r.vehicleId === l.id &&
      (r.status === 'accepted' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning') &&
      r.status !== 'expired' &&
      r.status !== 'completed' &&
      r.status !== 'cancelled' &&
      r.status !== 'rejected' &&
      r.bikeStatus !== 'returned'
    )
  );
  const pendingRequests = data.incomingRequests.filter(req =>
    req.status === 'pending' &&
    (req.ownerId === user?.id || myListings.some(l => l.id === req.vehicleId) || isDemoOwner)
  );

  const hasActiveRides = activeScooters.length > 0;

  const getActiveRequest = (bikeId) =>
    data.incomingRequests.find(r =>
      r.vehicleId === bikeId &&
      (r.status === 'accepted' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning') &&
      r.status !== 'expired' &&
      r.status !== 'completed' &&
      r.status !== 'cancelled' &&
      r.status !== 'rejected' &&
      r.bikeStatus !== 'returned'
    );

  const earningsPerBike = (data.recentEarnings || []).reduce((acc, e) => {
    acc[e.vehicleId] = (acc[e.vehicleId] || 0) + e.amount;
    return acc;
  }, {});
  const totalEarned = data.totalEarnings || 0;

  const statCards = [
    { label: 'Total Vehicles', value: myListings.length, color: '#8B5CF6', bg: '#F5F3FF', route: '/owner/bikes', icon: <Bike size={22} /> },
    { label: 'Requests', value: pendingRequests.length, color: '#F59E0B', bg: '#FEF3C7', route: '/owner/requests', icon: <Bell size={22} /> },
    { label: 'Total Earned', value: `৳${totalEarned.toLocaleString()}`, color: '#00B14F', bg: '#F0FDF4', route: '/owner/earnings', icon: <DollarSign size={22} /> },
  ];

  // ── Render Booking Requests Section ───────────────────────────
  const renderBookingRequestsSection = () => (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bell size={18} color={pendingRequests.length > 0 ? 'var(--error)' : 'var(--text-muted)'} />
          <h3 style={{ marginBottom: 0, fontSize: 18 }}>Booking Requests</h3>
          {pendingRequests.length > 0 && (
            <span style={{ background: 'var(--error)', color: 'white', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>
              {pendingRequests.length}
            </span>
          )}
        </div>
        <button className="btn btn-outline btn-sm" style={{ width: 'auto' }} onClick={() => navigate('/owner/requests')}>
          View All <ChevronRight size={14} />
        </button>
      </div>

      {pendingRequests.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>No pending requests — all clear!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pendingRequests.slice(0, 3).map(req => {
            const vehicle = myListings.find(l => l.id === req.vehicleId) || data.listings.find(l => l.id === req.vehicleId);
            const isExpanded = expandedReqId === req.id;
            const chatUrl = `/chat/${req.requestId || req.id}?name=${encodeURIComponent(req.renterName || 'Renter')}&context=${encodeURIComponent((vehicle?.vehicleName || req.vehicleName || 'Vehicle') + ' booking')}&avatar=${encodeURIComponent(req.renterAvatar || '')}`;

            return (
              <div
                key={req.id}
                style={{
                  background: 'white',
                  border: isExpanded ? '2px solid #3B82F6' : '1.5px solid #FDE68A',
                  borderRadius: 16,
                  padding: '16px',
                  boxShadow: isExpanded ? '0 8px 24px rgba(59,130,246,0.12)' : 'var(--shadow-sm)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={req.renterAvatar || 'https://i.pravatar.cc/150?u=renter'}
                      alt={req.renterName}
                      style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: '#10B981', border: '2px solid white' }} title="Verified student" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{req.renterName}</span>
                      <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Star size={11} fill="#F59E0B" /> {req.renterRating || 4.8}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                        ({req.renterPastRides || 18} past rides)
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
                      wants to book <strong>{vehicle?.vehicleName || req.vehicleName || 'Your Vehicle'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                      <span><Clock size={12} style={{ display: 'inline', verticalAlign: -1 }} /> {req.estimatedDuration || req.hours || 2}h</span>
                      <span>·</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>৳{req.estimatedFare || req.totalFare} fare</span>
                    </div>
                  </div>
                </div>

                {/* Requested Vehicle Preview with Photo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: '#F9FAFB',
                  borderRadius: 12,
                  border: '1px solid var(--border-color)',
                  marginBottom: 12
                }}>
                  <img
                    src={vehicle?.image || req.vehicleImage || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400'}
                    alt={vehicle?.vehicleName || req.vehicleName || 'Vehicle'}
                    style={{ width: 68, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid var(--border-color)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Vehicle Requested
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {vehicle?.vehicleName || req.vehicleName || 'Vehicle'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {vehicle?.model ? `${vehicle.model} • ` : ''}Rate: ৳{vehicle?.hourlyRate || req.estimatedFare || 120}/hr
                    </div>
                  </div>
                </div>

                {/* Transparency Toggle: Review Renter Details Before Accept/Reject */}
                <button
                  type="button"
                  onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: isExpanded ? '#EFF6FF' : '#F9FAFB',
                    border: '1px solid var(--border-color)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: isExpanded ? '#1D4ED8' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={14} color={isExpanded ? '#1D4ED8' : 'var(--primary)'} />
                    {isExpanded ? 'Hide Renter Verification Details' : 'View Renter Details & Verified ID'}
                  </span>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {/* Expanded Renter Dossier */}
                {isExpanded && (
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px', marginBottom: 14, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 0.5, marginBottom: 10 }}>
                      VERIFIED RENTER DOSSIER
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                      <div style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CreditCard size={11} /> STUDENT NID
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                          {req.renterNid ? `${req.renterNid.slice(0, 4)}••••${req.renterNid.slice(-4)}` : '9876••••0123 (Verified)'}
                        </div>
                      </div>

                      <div style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={11} /> PHONE NUMBER
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                          {req.renterPhone || '01823456789'}
                        </div>
                      </div>

                      <div style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} /> PICKUP SPOT
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.pickupLocation || vehicle?.location || 'Campus Gate'}
                        </div>
                      </div>

                      <div style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={11} /> PURPOSE
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
                          {req.purpose ? req.purpose.replace('_', ' ') : 'Campus Commute'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, background: 'white' }}
                        onClick={() => navigate(chatUrl)}
                      >
                        <MessageCircle size={14} /> Message Renter First
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, background: 'white' }}
                        onClick={() => toast.info('Calling renter', `Calling ${req.renterName} at ${req.renterPhone || '01823456789'}...`)}
                      >
                        <Phone size={14} /> Call Renter
                      </button>
                    </div>
                  </div>
                )}

                {/* Accept / Reject Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                    onClick={() => { updateBookingStatus(req.id, 'rejected'); toast.info('Rejected', `${req.renterName}'s request rejected.`); }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      acceptBookingRequest(req.id);
                      toast.success('Accepted!', `${req.renterName} has been notified. They have 20 mins to arrive.`);
                    }}
                  >
                    <CheckCircle2 size={14} /> Accept Booking
                  </button>
                </div>
              </div>
            );
          })}
          {pendingRequests.length > 3 && (
            <button className="btn btn-outline btn-sm" style={{ width: 'auto', alignSelf: 'center' }} onClick={() => navigate('/owner/requests')}>
              +{pendingRequests.length - 3} more requests
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ── Render Active Bikes Section ───────────────────────────────
  const renderActiveBikesSection = () => (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Bike size={18} color={activeScooters.length > 0 ? '#3B82F6' : 'var(--text-muted)'} />
        <h3 style={{ marginBottom: 0, fontSize: 18 }}>Active Vehicles</h3>
        {activeScooters.length > 0 && (
          <span style={{ background: '#3B82F6', color: 'white', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>
            {activeScooters.length}
          </span>
        )}
      </div>

      {activeScooters.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ParkingSquare size={20} color="#3B82F6" />
            </div>
          </div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>All vehicles are parked — no active rides right now.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {activeScooters.map(scooter => {
            const activeReq = getActiveRequest(scooter.id);
            const bikeStatus = activeReq?.bikeStatus || 'at_garage';
            // 'at_garage' with an accepted request means the renter is heading over
            const isHeading = bikeStatus === 'at_garage' && activeReq?.status === 'accepted';
            const statusColors = {
              at_garage: isHeading
                ? { color: '#3B82F6', label: 'Renter Heading Over', bg: '#DBEAFE' }
                : { color: '#6B7280', label: 'At Garage', bg: '#F3F4F6' },
              in_use: { color: '#10B981', label: 'In Use (Riding)', bg: '#D1FAE5' },
              returning: { color: '#F59E0B', label: 'Returning Vehicle', bg: '#FEF3C7' },
              returned: { color: '#6B7280', label: 'Returned', bg: '#F3F4F6' },
            }[bikeStatus] || { color: '#3B82F6', label: 'Active', bg: '#DBEAFE' };

            const chatUrl = activeReq
              ? `/chat/${activeReq.requestId || activeReq.id}?name=${encodeURIComponent(activeReq.renterName)}&context=${encodeURIComponent(scooter.vehicleName + ' booking')}&avatar=${encodeURIComponent(activeReq.renterAvatar || '')}`
              : '/chat';

            return (
              <div
                key={scooter.id}
                style={{
                  background: 'white',
                  border: '2px solid #3B82F6',
                  borderRadius: 16,
                  padding: '16px',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.1)'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src={scooter.image} alt={scooter.vehicleName} style={{ width: 76, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scooter.vehicleName}</b>
                      <span style={{ background: statusColors.bg, color: statusColors.color, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                        {statusColors.label}
                      </span>
                    </div>
                    {activeReq && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                        Renter: <strong>{activeReq.renterName}</strong> · ৳{activeReq.estimatedFare || activeReq.totalFare}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} /> {activeReq?.estimatedDuration || '?'}h trip
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: 'auto' }}
                      onClick={() => {
                        setTrackerDefaultOpen(false);
                        setSelectedBike(scooter);
                      }}
                    >
                      <Activity size={13} /> Details
                    </button>
                    {activeReq && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: 'auto', borderColor: '#3B82F6', color: '#3B82F6' }}
                        onClick={() => {
                          setTrackerDefaultOpen(true);
                          setSelectedBike(scooter);
                        }}
                      >
                        <Radio size={13} /> Live Track
                      </button>
                    )}
                    {activeReq && (
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: 'auto' }}
                        onClick={() => navigate(chatUrl)}
                      >
                        <MessageCircle size={13} /> Message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {selectedBike && (
        <ActiveBikeModal
          bike={selectedBike}
          request={getActiveRequest(selectedBike.id)}
          defaultShowTracker={trackerDefaultOpen}
          onClose={() => {
            setSelectedBike(null);
            setTrackerDefaultOpen(false);
          }}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 2 }}>Owner Dashboard</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 0 }}>Welcome back, {user.name.split(' ')[0]}!</p>
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto', flexShrink: 0 }} onClick={() => navigate('/owner/create')}>
          <PlusCircle size={16} /> Add a Vehicle
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {statCards.map(card => (
          <div
            key={card.label}
            onClick={() => card.route && navigate(card.route)}
            style={{
              background: card.bg,
              border: `1.5px solid ${card.color}22`,
              borderRadius: 14,
              padding: '16px 14px',
              cursor: card.route ? 'pointer' : 'default',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ color: card.color, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: card.color, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Dynamic Section Ordering: Active Bikes is above Booking Requests if there are active rides */}
      {hasActiveRides ? (
        <>
          {renderActiveBikesSection()}
          {renderBookingRequestsSection()}
        </>
      ) : (
        <>
          {renderBookingRequestsSection()}
          {renderActiveBikesSection()}
        </>
      )}

      {/* ── Section 3: Listed Bikes ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bike size={18} color="#8B5CF6" />
            <h3 style={{ marginBottom: 0, fontSize: 18 }}>Listed Vehicles</h3>
            <span style={{ background: '#EDE9FE', color: '#5B21B6', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>
              {myListings.length}
            </span>
          </div>
          <button className="btn btn-outline btn-sm" style={{ width: 'auto' }} onClick={() => navigate('/owner/bikes')}>
            View All & Earnings <ChevronRight size={14} />
          </button>
        </div>

        {myListings.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={26} color="var(--primary)" />
              </div>
            </div>
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>No listings yet</h3>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>List your first vehicle and start earning today.</p>
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/owner/create')}>Create First Listing</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myListings.map(bike => (
              <div
                key={bike.id}
                onClick={() => navigate('/owner/bikes')}
                style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src={bike.image} alt={bike.vehicleName} style={{ width: 64, height: 46, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bike.vehicleName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{bike.location}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>৳{bike.hourlyRate}/hr</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <span className={bike.status === 'active' ? 'badge badge-blue' : 'badge badge-green'}>
                      {bike.status === 'active' ? 'On Ride' : 'Available'}
                    </span>
                    <ChevronRight size={16} color="var(--text-muted)" style={{ display: 'block', margin: '8px auto 0' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
