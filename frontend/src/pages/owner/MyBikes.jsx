import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Settings, PlusCircle, MapPin, Bike, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';

export default function MyBikes() {
  const { data, user, deleteListing } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isVehicleActive = (bike) => {
    if (bike.status === 'active') return true;
    return (data.incomingRequests || []).some(
      r => (r.bikeId === bike.id || r.listingId === bike.id || r.vehicleId === bike.id) &&
           (r.status === 'accepted' || r.status === 'active' || r.bikeStatus === 'in_use' || r.bikeStatus === 'returning')
    );
  };

  const myListings = [...data.listings]
    .filter(l => l.ownerId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const earningsPerBike = (data.recentEarnings || []).reduce((acc, e) => {
    acc[e.vehicleId] = (acc[e.vehicleId] || 0) + e.amount;
    return acc;
  }, {});

  const statusStyle = {
    available: { label: 'Available', badgeClass: 'badge badge-green' },
    active: { label: 'On Ride', badgeClass: 'badge badge-blue' },
    unavailable: { label: 'Unavailable', badgeClass: 'badge badge-yellow' },
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <PageHeader
        title="My Vehicles"
        subtitle="Your listed vehicles — tap one to manage settings"
        action={
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', flexShrink: 0 }} onClick={() => navigate('/owner/create')}>
            <PlusCircle size={16} /> Add a Vehicle
          </button>
        }
      />

      {myListings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: 16, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bike size={28} color="var(--primary)" />
          </div>
          <h3>No vehicles listed yet</h3>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>List your first vehicle and start earning today.</p>
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/owner/create')}>
            Create First Listing
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myListings.map(bike => {
            const totalEarned = (earningsPerBike[bike.id] || 0) + (bike.totalBikeEarnings || 0);
            const active = isVehicleActive(bike);
            const st = active ? statusStyle['active'] : (statusStyle[bike.status] || statusStyle['available']);
            return (
              <div
                key={bike.id}
                onClick={() => navigate(`/owner/settings/${bike.id}`)}
                style={{
                  background: 'white',
                  border: `2px solid ${active ? '#3B82F6' : 'var(--border-color)'}`,
                  borderRadius: 16,
                  padding: '14px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src={bike.image} alt={bike.vehicleName} style={{ width: 76, height: 56, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bike.vehicleName}</b>
                      <span className={st.badgeClass} style={{ marginLeft: 'auto' }}>{st.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>
                      <MapPin size={11} /> {bike.location}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Reg: {bike.regNumber} · {bike.totalTrips} trips
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', marginTop: 12, paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <TrendingUp size={14} color="#00B14F" />
                    <span style={{ fontWeight: 800, fontSize: 16, color: '#00B14F', fontVariantNumeric: 'tabular-nums' }}>৳{totalEarned.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>earned</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 13 }}>৳{bike.hourlyRate}/hr</span>
                    <Settings size={16} color="var(--text-muted)" title="Settings & Edit" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (active) {
                          toast.error('Action Denied', 'Cannot delete a vehicle while it is on an active ride.');
                          return;
                        }
                        if (window.confirm(`Are you sure you want to delete "${bike.vehicleName}"?`)) {
                          deleteListing(bike.id);
                          toast.info('Vehicle Deleted', `"${bike.vehicleName}" has been removed.`);
                        }
                      }}
                      disabled={active}
                      style={{
                        background: 'none', border: 'none', padding: 4, cursor: active ? 'not-allowed' : 'pointer',
                        color: active ? '#D1D5DB' : '#EF4444', display: 'flex', alignItems: 'center',
                      }}
                      title={active ? 'Cannot delete while on an active ride' : 'Delete Vehicle'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
