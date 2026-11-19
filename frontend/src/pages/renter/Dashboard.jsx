import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, Bookmark, Star, Map, MapPin, Users, ChevronRight, CircleUserRound, Bike, Wallet, ArrowUpRight } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { AcceptedBikeCard, PendingBikeCard } from './RenterRequests';

export default function RenterDashboard() {
  const { data, activeRentals, activePassengerRides, user, renterBookingRequests, completePassengerRide, cancelBookingRequest } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const realActiveRentals = renterBookingRequests.filter(r => r.bikeStatus === 'in_use' || r.bikeStatus === 'returning');
  const pendingRequests = renterBookingRequests.filter(r => r.status === 'pending');

  const savedCount = data.savedBikes?.length || 0;
  const tripCount = (data.pastTrips || []).length;
  const rating = data.userRating || 4.8;
  const completedRides = data.completedPassengerRides || [];
  const completedRidesCount = completedRides.length;
  const renterEarnings = data.renterPassengerEarnings ?? completedRides.reduce((sum, r) => sum + (r.earnedFare || r.fareAmount || r.netEarnings || 0), 0);
  const nearby = data.listings.filter(l => l.isAvailable && l.status === 'available' && l.ownerId !== user?.id).slice(0, 4);

  const statCards = [
    { icon: <Map size={20} color="var(--forest)" />, label: 'Past Trips', value: tripCount, route: '/renter/trips' },
    { icon: <Wallet size={20} color="var(--primary)" />, label: 'Earnings', value: `৳${renterEarnings.toLocaleString()}`, route: '/renter/earnings', highlight: true },
    { icon: <Bookmark size={20} color="var(--accent-purple)" />, label: 'Saved', value: savedCount, route: '/renter/saved' },
    { icon: <Star size={20} color="#F59E0B" />, label: 'Rating', value: rating.toFixed(1), route: '/renter/ratings' },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Hero header */}
      <div className="hero-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: -0.4 }}>OurRide</div>
          <button
            onClick={() => navigate('/profile')}
            aria-label="Profile"
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
          >
            <CircleUserRound size={20} />
          </button>
        </div>
        <div style={{ fontSize: 21, fontWeight: 800, marginBottom: 2 }}>Hi, {user?.name?.split(' ')[0] || 'there'}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          {nearby.length > 0 ? `${nearby.length} bikes available near you right now` : 'No bikes available right now'}
        </div>
      </div>

      {/* Renter Rideshare Earnings Hero Metric Card */}
      <div 
        onClick={() => navigate('/renter/earnings')}
        style={{
          background: 'linear-gradient(135deg, #0C3D24 0%, #00B14F 100%)',
          color: '#FFFFFF',
          borderRadius: 20,
          padding: '20px 22px',
          marginBottom: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px -4px rgba(0, 177, 79, 0.28)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.15s ease',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#A7F3D0', marginBottom: 4 }}>
            Available Rideshare Income
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 32, fontWeight: 900, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
              ৳{renterEarnings.toLocaleString()}
            </span>
            <span style={{ fontSize: 13, color: '#D1FAE5', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
              • {completedRidesCount} {completedRidesCount === 1 ? 'ride completed' : 'rides completed'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#ECFDF5', marginTop: 4, opacity: 0.9 }}>
            Offset rental expenses by giving campus rides
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/renter/earnings'); }}
            style={{
              background: '#FFFFFF',
              color: '#0C3D24',
              border: 'none',
              borderRadius: 12,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>View Earnings</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* Active trip banner — bookings accepted by owner */}
      {renterBookingRequests.filter(r => r.status === 'accepted' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning').length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: 18 }}>Your Active Trip</h3>
          {renterBookingRequests.filter(r => r.status === 'accepted' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning').map((req, idx) => (
            <AcceptedBikeCard key={req.id || idx} req={req} />
          ))}
        </div>
      )}

      {/* Legacy activeRentals banner */}
      {activeRentals.length > 0 && renterBookingRequests.filter(r => r.bikeStatus === 'in_use').length === 0 && (
        <div style={{ marginBottom: 20 }}>
          {realActiveRentals.map((rental, idx) => {
            const startedAt = rental.tripStartedAt || rental.startedAt;
            const hoursInMs = (rental.hours || 1) * 60 * 60 * 1000;
            const endTime = new Date(new Date(startedAt).getTime() + hoursInMs);
            const now = new Date();
            const diffMs = endTime - now;
            
            let timeStr = 'Time expired';
            let color = 'var(--error)';
            if (diffMs > 0) {
              const h = Math.floor(diffMs / 3600000);
              const m = Math.floor((diffMs % 3600000) / 60000);
              timeStr = h > 0 ? `${h}h ${m}m left` : `${m}m left`;
              color = h > 0 ? 'var(--primary)' : '#F59E0B';
            }

            return (
              <div key={idx} style={{
                background: '#fff', border: `2px solid ${color}`, borderRadius: 18,
                padding: '16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: 'var(--shadow-sm)',
              }}>
                <img src={rental.vehicleImage || rental.image} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{rental.vehicleName}</span>
                    <span style={{ fontSize: 11, background: `${color}18`, color: color, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>Active Ride</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={13} color={color} /> <span style={{ color: color, fontWeight: 600 }}>{timeStr}</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ width: 'auto', flexShrink: 0, background: color, border: 'none' }} onClick={() => navigate('/renter/requests')}>
                  Manage
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Passenger Ride Banner */}
      {activePassengerRides.length > 0 && (
        <div style={{ marginBottom: 20 }}>
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
                <button className="btn btn-outline btn-sm" style={{ width: 'auto', flexShrink: 0 }} onClick={() => navigate(`/chat/${ride.id}`)}>
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

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/renter/browse')}
          style={{
            background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16,
            padding: '14px', textAlign: 'left', boxShadow: 'var(--shadow-sm)', minHeight: 84,
          }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, color: 'var(--primary)' }}>
            <Search size={20} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Find a bike</div>
          <div className="text-light" style={{ fontSize: 12 }}>Browse by the hour</div>
        </button>
        <button
          onClick={() => navigate('/renter/requests')}
          style={{
            background: '#fff', border: '1px solid var(--border-color)', borderRadius: 16,
            padding: '14px', textAlign: 'left', boxShadow: 'var(--shadow-sm)', minHeight: 84,
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

      {/* Stat cards */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
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

      {/* Pending Requests — displayed above available bikes */}
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
                onMessage={(id) => navigate(`/chat/${id}`)}
                onCancel={(id) => {
                  cancelBookingRequest(id);
                  toast.info('Request Cancelled', 'Your pending request has been cancelled.');
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Nearby bikes */}
      {nearby.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ marginBottom: 0 }}>Nearby bikes</h3>
            <button onClick={() => navigate('/renter/browse')} className="btn btn-ghost btn-sm" style={{ width: 'auto', color: 'var(--primary)', fontWeight: 600 }}>
              View all <ChevronRight size={15} />
            </button>
          </div>
          <div className="cards-grid">
            {nearby.map(bike => (
              <div key={bike.id} className="bike-tile" style={{ cursor: 'pointer' }} onClick={() => navigate(`/renter/book/${bike.id}`)}>
                <div className="tile-media">
                  <img src={bike.image} alt={bike.vehicleName} loading="lazy" />
                  <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(12,61,36,0.92)', color: '#fff', padding: '2px 9px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    ৳{bike.hourlyRate}/hr
                  </div>
                </div>
                <div className="tile-body">
                  <div style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bike.vehicleName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 6px' }}>
                    <MapPin size={11} /> {bike.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 12, marginBottom: 8 }}>
                    <Star size={11} color="#F59E0B" fill="#F59E0B" /> {bike.rating}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', minHeight: 38, padding: '8px 0' }} onClick={(e) => { e.stopPropagation(); navigate(`/renter/book/${bike.id}`); }}>
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty CTA */}
      {!realActiveRentals.length && nearby.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border-color)', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={28} color="var(--primary)" />
          </div>
          <h3 style={{ marginBottom: 6 }}>Ready for your next ride?</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 18 }}>Browse available scooters on campus and book instantly.</p>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/renter/browse')}>
            <Search size={16} /> Browse Available Bikes
          </button>
        </div>
      )}
    </div>
  );
}
