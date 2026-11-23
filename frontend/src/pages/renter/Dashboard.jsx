import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Bookmark, Star, Map, MapPin, Users, ChevronRight, Bike } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { AcceptedBikeCard, PendingBikeCard } from './RenterRequests';

export default function RenterDashboard() {
  const { data, activePassengerRides, user, renterBookingRequests, completePassengerRide, cancelBookingRequest } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter out any expired bookings so they never appear on the first page
  // NOTE: Pending requests are WAITING for owner approval — they have no arrival timer and are never arrival-expired!
  const isBookingExpired = (r) => {
    if (!r) return true;
    if (r.status === 'completed' || r.status === 'expired' || r.status === 'cancelled' || r.status === 'rejected') return true;

    // 1. 20-min arrival window expired — ONLY for accepted bookings waiting for pickup
    if ((r.status === 'accepted' || r.status === 'active') && r.bikeStatus !== 'in_use' && r.bikeStatus !== 'returning') {
      if (r.acceptedAt) {
        const elapsed = Date.now() - new Date(r.acceptedAt).getTime();
        if (elapsed > 20 * 60 * 1000) return true;
      }
    }

    // 2. Active ride rental time expired (hours rented)
    if (r.bikeStatus === 'in_use') {
      const started = r.tripStartedAt || r.startedAt;
      if (started) {
        const hoursInMs = (r.hours || r.estimatedDuration || 1) * 3600 * 1000;
        const endTime = new Date(new Date(started).getTime() + hoursInMs);
        if (Date.now() >= endTime.getTime()) return true;
      }
    }
    return false;
  };

  // Only valid, non-expired active trips
  const activeBookingTrips = renterBookingRequests.filter(
    r => (r.status === 'accepted' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning') && !isBookingExpired(r)
  );

  // Renter pending requests waiting for owner response
  const pendingRequests = renterBookingRequests.filter(r => r.status === 'pending');

  const savedCount = data.savedBikes?.length || 0;
  const tripCount = (data.pastTrips || []).length;
  const rating = data.userRating || 4.8;
  const nearby = data.listings.filter(l => l.isAvailable && l.status === 'available' && l.ownerId !== user?.id).slice(0, 4);

  const statCards = [
    { icon: <Map size={20} color="var(--forest)" />, label: 'Past Trips', value: tripCount, route: '/renter/trips' },
    { icon: <Bookmark size={20} color="var(--accent-purple)" />, label: 'Saved', value: savedCount, route: '/renter/saved' },
    { icon: <Star size={20} color="#F59E0B" />, label: 'Rating', value: rating.toFixed(1), route: '/renter/ratings' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: 12, paddingBottom: 32 }}>

      {/* 1. DASHBOARD GRID — FIRST THING ON THE PAGE (EVEN IF THERE IS AN ACTIVE RIDE) */}
      <div className="dashboard-grid" style={{ marginBottom: 16 }}>
        {statCards.map(card => (
          <div
            key={card.label}
            onClick={() => navigate(card.route)}
            className="stat-card"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            {card.icon}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="text-muted text-sm">{card.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{card.value}</div>
            </div>
            <ChevronRight size={16} color="var(--text-light)" />
          </div>
        ))}
      </div>

      {/* 2. Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/renter/browse')}
          style={{
            background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16,
            padding: '14px', textAlign: 'left', boxShadow: 'var(--shadow-sm)', minHeight: 84,
            cursor: 'pointer'
          }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: 'var(--primary)' }}>
            <Search size={20} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Find a vehicle</div>
          <div className="text-light" style={{ fontSize: 12 }}>Browse by the hour</div>
        </button>
        <button
          onClick={() => navigate('/renter/requests')}
          style={{
            background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16,
            padding: '14px', textAlign: 'left', boxShadow: 'var(--shadow-sm)', minHeight: 84,
            cursor: 'pointer'
          }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: 'var(--accent-purple)' }}>
            <Users size={20} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Ride requests
            {data.availableRideRequests.length > 0 && (
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}> ({data.availableRideRequests.length})</span>
            )}
          </div>
          <div className="text-light" style={{ fontSize: 12 }}>Pick up passengers</div>
        </button>
      </div>

      {/* 3. Active Trip Banner — ONLY valid non-expired active trips (rendered BELOW dashboard grid) */}
      {activeBookingTrips.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, fontSize: 18 }}>Your Active Trip</h3>
          {activeBookingTrips.map((req, idx) => (
            <AcceptedBikeCard key={req.id || idx} req={req} />
          ))}
        </div>
      )}

      {/* 4. Active Passenger Ride Banner */}
      {activePassengerRides.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {activePassengerRides.map((ride, idx) => (
            <div key={idx} style={{
              background: '#fff', border: `2px solid var(--primary)`, borderRadius: 18,
              padding: '16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-sm)',
            }}>
              <img src={ride.passengerAvatar} alt={ride.passengerName} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{ride.passengerName}</span>
                  <span style={{ fontSize: 11, background: 'rgba(0, 177, 79, 0.12)', color: 'var(--primary)', fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Passenger</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <MapPin size={13} color="var(--primary)" /> {ride.pickup} → {ride.dropoff}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ width: 'auto', flexShrink: 0 }}
                  onClick={() => navigate(`/chat/${ride.id}?name=${encodeURIComponent(ride.passengerName || 'Passenger')}&context=${encodeURIComponent((ride.pickup || 'Pickup') + ' → ' + (ride.dropoff || 'Dropoff'))}&avatar=${encodeURIComponent(ride.passengerAvatar || '')}`)}
                >
                  Chat
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ width: 'auto', flexShrink: 0, padding: '0 12px' }} 
                  onClick={() => {
                    if (window.confirm("Complete this drop-off?")) {
                      completePassengerRide(ride.id);
                      toast.success('Trip completed!', `You earned ৳${ride.estimatedFare}`);
                    }
                  }}
                >
                  Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Pending Requests — displayed above available vehicles */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#D97706" />
              <h3 style={{ marginBottom: 0, fontSize: 18 }}>Pending Requests</h3>
              <span style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>
                {pendingRequests.length}
              </span>
            </div>
            <button onClick={() => navigate('/renter/requests')} className="btn btn-ghost btn-sm" style={{ width: 'auto', color: 'var(--primary)', fontWeight: 600 }}>
              View all <ChevronRight size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingRequests.map(req => (
              <PendingBikeCard
                key={req.id}
                req={req}
                onMessage={(id) => {
                  const targetReq = pendingRequests.find(r => (r.requestId || r.id) === id);
                  navigate(`/chat/${id}?name=${encodeURIComponent(targetReq?.ownerName || 'Nazia Putul')}&context=${encodeURIComponent((targetReq?.vehicleName || 'Vehicle') + ' booking')}&avatar=${encodeURIComponent(targetReq?.ownerAvatar || '')}`);
                }}
                onCancel={(id) => {
                  cancelBookingRequest(id);
                  toast.info('Request Cancelled', 'Your pending request has been cancelled.');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6. Nearby vehicles */}
      {nearby.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ marginBottom: 0 }}>Nearby vehicles</h3>
            <button onClick={() => navigate('/renter/browse')} className="btn btn-ghost btn-sm" style={{ width: 'auto', color: 'var(--primary)', fontWeight: 600 }}>
              View all <ChevronRight size={15} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
            {nearby.map(vehicle => (
              <div
                key={vehicle.id}
                onClick={() => navigate(`/renter/book/${vehicle.id}`)}
                style={{
                  background: 'white', borderRadius: 16, overflow: 'hidden',
                  border: '1px solid var(--border-color)', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)', transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                <img src={vehicle.image} alt={vehicle.vehicleName} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{vehicle.vehicleName}</h4>
                    <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={11} fill="#F59E0B" /> {vehicle.rating || 4.8}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} color="var(--primary)" /> {vehicle.location}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                      ৳{vehicle.hourlyRate}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>/hr</span>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: 'auto', padding: '4px 10px', fontSize: 12 }}>
                      Rent
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
