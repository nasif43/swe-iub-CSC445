import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Wallet, Clock, Bike, TrendingUp, Users, ArrowUpRight, MapPin, CheckCircle2, Star, ShieldCheck, CreditCard } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

function formatDateTime(dateStr) {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }) + ', ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function RenterEarnings() {
  const { data, requestPayout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('earnings'); // 'earnings' | 'expenses'
  const [chartFilter, setChartFilter] = useState('3M'); // '1W' | '1M' | '3M' | '1Y'
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('bKash'); // 'bKash' | 'Nagad' | 'Campus Card'
  const [payoutAccount, setPayoutAccount] = useState('01823456789');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  // Passenger rideshare earnings & transactions
  const passengerTrips = data.completedPassengerRides || [];
  const totalEarned = data.renterPassengerEarnings ?? passengerTrips.reduce(
    (sum, r) => sum + (r.netEarnings || r.earnedFare || r.fareAmount || 0),
    0
  );

  const availableTxs = passengerTrips.filter(t => t.payoutStatus === 'available' || !t.payoutStatus);
  const availableBalance = availableTxs.reduce(
    (sum, t) => sum + (t.netEarnings || t.earnedFare || t.fareAmount || 0),
    0
  );

  const [payoutAmount, setPayoutAmount] = useState(availableBalance || 200);

  // Bike rental expenses
  const rentalHistory = data.pastTrips || [];
  const totalSpent = rentalHistory.reduce((sum, t) => sum + (t.fare || t.totalFare || t.amount || 0), 0);

  // Net calculations
  const netSpending = Math.max(0, totalSpent - totalEarned);
  const offsetPercentage = totalSpent > 0 ? Math.min(100, Math.round((totalEarned / totalSpent) * 100)) : 100;

  // Chart datasets by filter
  const chartDatasets = {
    '1W': {
      label: "Last 7 days' rideshare income",
      bars: [
        { label: 'Mon', amount: 40, heightPercent: 20 },
        { label: 'Tue', amount: 0, heightPercent: 8 },
        { label: 'Wed', amount: 180, heightPercent: 60 },
        { label: 'Thu', amount: 200, heightPercent: 70 },
        { label: 'Fri', amount: 300, heightPercent: 100, isPeak: true },
        { label: 'Sat', amount: 0, heightPercent: 8 },
        { label: 'Sun', amount: 120, heightPercent: 40 },
      ],
      total: 840,
    },
    '1M': {
      label: "This month's rideshare income",
      bars: [
        { label: 'Week 1', amount: 180, heightPercent: 55 },
        { label: 'Week 2', amount: 200, heightPercent: 65 },
        { label: 'Week 3', amount: 300, heightPercent: 100, isPeak: true },
        { label: 'Week 4', amount: 160, heightPercent: 50 },
      ],
      total: 840,
    },
    '3M': {
      label: "Last 3 months' earnings",
      bars: [
        { label: 'Jun', amount: 240, heightPercent: 48 },
        { label: 'Jul', amount: 380, heightPercent: 76 },
        { label: 'Aug', amount: 500, heightPercent: 100, isPeak: true },
      ],
      total: 1120,
    },
    '1Y': {
      label: "Past year quarterly earnings",
      bars: [
        { label: 'Q1', amount: 420, heightPercent: 42 },
        { label: 'Q2', amount: 680, heightPercent: 68 },
        { label: 'Q3', amount: 1000, heightPercent: 100, isPeak: true },
        { label: 'Q4', amount: 540, heightPercent: 54 },
      ],
      total: 2640,
    },
  };

  const currentChart = chartDatasets[chartFilter] || chartDatasets['3M'];

  const handleOpenPayout = () => {
    setPayoutAmount(availableBalance > 0 ? availableBalance : 100);
    setShowPayoutModal(true);
  };

  const handlePayoutSubmit = async () => {
    if (!payoutAccount.trim()) {
      toast.error('Account required', 'Please enter your account or phone number.');
      return;
    }
    if (payoutAmount <= 0) {
      toast.error('Invalid amount', 'Withdrawal amount must be greater than ৳0.');
      return;
    }

    setIsSubmittingPayout(true);
    try {
      if (requestPayout) {
        await requestPayout(payoutAmount, payoutMethod, payoutAccount);
      }
      toast.success('Payout Initiated!', `৳${payoutAmount} requested to ${payoutMethod} (${payoutAccount}).`);
      setShowPayoutModal(false);
    } catch (err) {
      console.error('Payout failed:', err);
      toast.error('Payout failed', 'Please try again later.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const renderPayoutBadge = (status, method) => {
    const s = (status || 'available').toLowerCase();
    if (s === 'paid') {
      return (
        <span style={{
          background: '#F0FDF4',
          color: '#15803D',
          border: '1px solid #BBF7D0',
          padding: '3px 9px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <CheckCircle2 size={11} /> Paid via {method || 'bKash'}
        </span>
      );
    }
    if (s === 'processing' || s === 'pending') {
      return (
        <span style={{
          background: '#FEF3C7',
          color: '#B45309',
          border: '1px solid #FDE68A',
          padding: '3px 9px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <Clock size={11} /> Processing Payout
        </span>
      );
    }
    if (s === 'withdrawn') {
      return (
        <span style={{
          background: '#F3F4F6',
          color: '#4B5563',
          border: '1px solid #E5E7EB',
          padding: '3px 9px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4
        }}>
          <CheckCircle2 size={11} /> Withdrawn
        </span>
      );
    }
    return (
      <span style={{
        background: '#ECFDF5',
        color: '#047857',
        border: '1px solid #A7F3D0',
        padding: '3px 9px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }}>
        <CheckCircle2 size={11} /> Available for Payout
      </span>
    );
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4, fontSize: 24, fontWeight: 800 }}>Renter Earnings & Spending</h2>
          <p className="text-muted" style={{ marginBottom: 0, fontSize: 14 }}>
            Track your campus hitchhike rideshare income, manage payouts, and review rental expenses.
          </p>
        </div>
        <button
          onClick={() => navigate('/renter/requests')}
          className="btn btn-primary btn-sm"
          style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Users size={16} />
          <span>Find Passengers</span>
        </button>
      </div>

      {/* Hero Available Balance Card matching Owner fidelity */}
      <div
        className="card"
        style={{
          backgroundColor: 'var(--primary)',
          color: '#FFFFFF',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 177, 79, 0.4)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 600, marginBottom: 4 }}>
            Available Balance
          </div>
          <div style={{ fontSize: 36, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
            ৳{availableBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            Total earned to date: ৳{totalEarned.toLocaleString()} across {passengerTrips.length} hitchhike {passengerTrips.length === 1 ? 'ride' : 'rides'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={handleOpenPayout}
            disabled={availableBalance <= 0}
            style={{
              background: '#FFFFFF',
              color: 'var(--forest)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontWeight: 800,
              fontSize: 14,
              cursor: availableBalance > 0 ? 'pointer' : 'not-allowed',
              opacity: availableBalance > 0 ? 1 : 0.6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Wallet size={18} />
            <span>Withdraw Funds</span>
          </button>
          <Wallet size={48} opacity={0.4} />
        </div>
      </div>

      {/* 3 Metric Cards for Income, Expenses, and Cost Offset */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Total Rideshare Income */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 18,
          padding: '20px 22px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Rideshare Income</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginBottom: 6, color: 'var(--forest)' }}>
            ৳{totalEarned.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            Earned from {passengerTrips.length} campus passenger hitchhike{passengerTrips.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Expenses Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 18,
          padding: '20px 22px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Rental Expenses</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={18} color="var(--text-main)" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginBottom: 6, color: 'var(--text-main)' }}>
            ৳{totalSpent.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            Spent across {rentalHistory.length} vehicle rental{rentalHistory.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Cost Offset Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 18,
          padding: '20px 22px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Cost Offset</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} color="var(--primary)" />
            </div>
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', marginBottom: 6, color: 'var(--primary)' }}>
            {offsetPercentage}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            Net out-of-pocket: <strong style={{ color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>৳{netSpending.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Interactive Earnings History Bar Chart */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Earnings History</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {currentChart.label}: ৳{currentChart.total.toLocaleString()}
        </div>
      </div>

      <div
        className="card"
        style={{
          borderRadius: 18,
          padding: '24px 20px',
          marginBottom: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
            height: 190,
            width: '100%',
            paddingBottom: 8,
            borderBottom: '1px solid var(--border-color)',
            gap: 12,
          }}
        >
          {currentChart.bars.map((bar, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                flex: 1,
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: bar.isPeak ? 'var(--primary)' : 'var(--text-muted)',
                marginBottom: 6,
                fontVariantNumeric: 'tabular-nums',
              }}>
                ৳{bar.amount}
              </span>
              <div
                style={{
                  width: '60%',
                  maxWidth: 44,
                  height: `${Math.max(12, bar.heightPercent)}%`,
                  backgroundColor: bar.isPeak ? 'var(--primary)' : 'var(--accent-border)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease, background-color 0.2s ease',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 8 }}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {['1W', '1M', '3M', '1Y'].map((filter) => (
            <button
              key={filter}
              onClick={() => setChartFilter(filter)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: chartFilter === filter ? 'none' : '1px solid var(--border-color)',
                background: chartFilter === filter ? 'var(--primary)' : 'transparent',
                color: chartFilter === filter ? '#FFFFFF' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Segmented Filter Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('earnings')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            background: activeTab === 'earnings' ? 'var(--forest)' : 'transparent',
            color: activeTab === 'earnings' ? '#FFFFFF' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={16} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rideshare Earnings ({passengerTrips.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            background: activeTab === 'expenses' ? 'var(--forest)' : 'transparent',
            color: activeTab === 'expenses' ? '#FFFFFF' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Bike size={16} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>Rental Expenses ({rentalHistory.length})</span>
        </button>
      </div>

      {/* Tab: Rideshare Earnings */}
      {activeTab === 'earnings' && (
        <div>
          {passengerTrips.length === 0 ? (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, padding: '40px 24px', textAlign: 'center',
              border: '1px dashed var(--border-color)', color: 'var(--text-muted)',
            }}>
              <Users size={40} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)', marginBottom: 6 }}>
                No rideshare earnings yet
              </div>
              <p style={{ maxWidth: 440, margin: '0 auto 18px', fontSize: 13 }}>
                While renting a bike, pick up students looking for hitchhikes across campus to earn cash and offset your ride fees!
              </p>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/renter/requests')}>
                View Open Ride Requests
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {passengerTrips.map((trip) => {
                const fareAmount = trip.netEarnings || trip.earnedFare || trip.fareAmount || 0;
                return (
                  <div
                    key={trip.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 16,
                      padding: '18px 20px',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Top Row: Passenger info + vehicle used + fare amount */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <img
                          src={trip.passengerAvatar || 'https://i.pravatar.cc/150?u=passenger'}
                          alt={trip.passengerName}
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>
                              {trip.passengerName}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#D97706',
                              background: '#FEF3C7',
                              padding: '2px 7px',
                              borderRadius: 6,
                              fontVariantNumeric: 'tabular-nums',
                            }}>
                              <Star size={11} fill="#D97706" /> {Number(trip.passengerRating || trip.rating || 5.0).toFixed(1)}
                            </span>
                            {trip.vehicleName && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--forest)',
                                background: 'rgba(12, 61, 36, 0.08)',
                                padding: '2px 8px',
                                borderRadius: 6,
                              }}>
                                <Bike size={12} /> {trip.vehicleName}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                            {formatDateTime(trip.createdAt || trip.date)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: 20,
                          fontWeight: 900,
                          color: 'var(--primary)',
                          fontVariantNumeric: 'tabular-nums',
                          letterSpacing: -0.3,
                        }}>
                          +৳{fareAmount.toLocaleString()}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {renderPayoutBadge(trip.payoutStatus, trip.paymentMethod)}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Route */}
                    <div style={{
                      background: 'var(--bg-color)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--text-main)',
                    }}>
                      <MapPin size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{trip.pickup || 'Campus Pickup'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span style={{ fontWeight: 600 }}>{trip.dropoff || 'Campus Drop-off'}</span>
                    </div>

                    {/* Bottom Row: Trip Metrics (Distance, Duration, Rate Basis) */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: 10,
                      flexWrap: 'wrap',
                      gap: 8,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <span><strong>Distance:</strong> {Number(trip.distanceKm || 2.8).toFixed(1)} km</span>
                        <span><strong>Duration:</strong> {trip.durationMins || 15} mins</span>
                        <span><strong>Rate:</strong> ৳{Number(trip.ratePerKm || 25).toFixed(0)}/km</span>
                      </div>
                      <div>
                        <span>Payment Method: <strong>{trip.paymentMethod || 'Cash'}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Rental Expenses */}
      {activeTab === 'expenses' && (
        <div>
          {rentalHistory.length === 0 ? (
            <div style={{
              background: '#FFFFFF', borderRadius: 16, padding: '40px 24px', textAlign: 'center',
              border: '1px dashed var(--border-color)', color: 'var(--text-muted)',
            }}>
              <Bike size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)', marginBottom: 6 }}>
                No trips booked yet
              </div>
              <p style={{ maxWidth: 440, margin: '0 auto 18px', fontSize: 13 }}>
                Rent your first bike or scooter by the hour from fellow verified students on campus.
              </p>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/renter/browse')}>
                Browse Available Bikes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rentalHistory.map((trip, idx) => (
                <div key={trip.id || idx} style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '16px 20px',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                    {trip.image && (
                      <img
                        src={trip.image}
                        alt={trip.vehicleName || 'Vehicle'}
                        style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                        {trip.vehicleName || trip.vehicle || trip.scooter || 'Bike Rental'}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5, fontVariantNumeric: 'tabular-nums' }}>
                        <Clock size={12} /> {trip.date || trip.startTime || '—'} · {trip.duration || trip.hours || 1} hr
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                      ৳{(trip.fare || trip.totalFare || trip.amount || 0).toLocaleString()}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-light)', display: 'block', marginTop: 2 }}>
                      Paid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Withdrawal / Payout Modal */}
      {showPayoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            maxWidth: 440,
            width: '100%',
            padding: 24,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Request Payout</h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Transfer your rideshare earnings directly to your mobile wallet or campus account.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                Select Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { id: 'bKash', label: 'bKash', color: '#D12053' },
                  { id: 'Nagad', label: 'Nagad', color: '#F7941D' },
                  { id: 'Campus Card', label: 'Campus Card', color: '#0C3D24' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayoutMethod(m.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 10,
                      border: payoutMethod === m.id ? `2px solid ${m.color}` : '1px solid var(--border-color)',
                      background: payoutMethod === m.id ? `${m.color}10` : '#FFFFFF',
                      color: payoutMethod === m.id ? m.color : 'var(--text-main)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {payoutMethod === 'Campus Card' ? 'Student ID Number' : `${payoutMethod} Mobile Number`}
              </label>
              <input
                type="text"
                placeholder={payoutMethod === 'Campus Card' ? 'e.g. 21201550' : 'e.g. 01712345678'}
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  fontSize: 14,
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700 }}>Withdrawal Amount</label>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  Available: ৳{availableBalance.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                max={availableBalance}
                min={1}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border-color)',
                  fontSize: 16,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayoutSubmit}
                disabled={isSubmittingPayout || payoutAmount <= 0 || payoutAmount > availableBalance}
                className="btn btn-primary"
                style={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}
              >
                {isSubmittingPayout ? 'Processing...' : `Withdraw ৳${payoutAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
