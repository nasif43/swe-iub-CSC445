import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export default function Earnings() {
  const { data } = useAuth();
  const toast = useToast();
  const [chartFilter, setChartFilter] = useState('1M');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('bKash');
  const [payoutAccount, setPayoutAccount] = useState('01823456789');

  const chartData = {
    '1W': [
      { label: 'Mon', h: 40, amt: 250 },
      { label: 'Tue', h: 60, amt: 400 },
      { label: 'Wed', h: 30, amt: 200 },
      { label: 'Thu', h: 80, amt: 600, isPeak: true },
      { label: 'Fri', h: 50, amt: 350 },
    ],
    '1M': [
      { label: 'W1', h: 45, amt: 1200 },
      { label: 'W2', h: 70, amt: 1850 },
      { label: 'W3', h: 85, amt: 2200, isPeak: true },
      { label: 'W4', h: 60, amt: 1600 },
    ],
    '3M': [
      { label: 'Jun', h: 50, amt: 4800 },
      { label: 'Jul', h: 80, amt: 7200, isPeak: true },
      { label: 'Aug', h: 65, amt: 5900 },
    ],
    '1Y': [
      { label: 'Q1', h: 55, amt: 14000 },
      { label: 'Q2', h: 75, amt: 19500 },
      { label: 'Q3', h: 90, amt: 24000, isPeak: true },
      { label: 'Q4', h: 60, amt: 16000 },
    ],
  };

  const currentBars = chartData[chartFilter] || chartData['1M'];

  const handleWithdraw = () => {
    toast.success('Withdrawal Initiated', `৳${data.totalEarnings} transfer requested to ${payoutMethod} (${payoutAccount}).`);
    setShowWithdrawModal(false);
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Earnings</h2>
      </div>

      <div
        className="card flex items-center justify-between"
        style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          borderRadius: 20,
          padding: '24px 28px',
          marginBottom: 'var(--space-6)',
          boxShadow: '0 8px 24px -4px rgba(0, 177, 79, 0.35)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: '15px', opacity: 0.9, fontWeight: 600, marginBottom: 4 }}>
            Available Balance
          </div>
          <div style={{ fontSize: '36px', fontWeight: 'bold', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>
            ৳{Number(data.totalEarnings || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', opacity: 0.85, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
            Earned from rental bookings across your fleet
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!data.totalEarnings}
            style={{
              background: '#FFFFFF',
              color: 'var(--forest)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 22px',
              fontWeight: 800,
              fontSize: 14,
              cursor: data.totalEarnings ? 'pointer' : 'not-allowed',
              opacity: data.totalEarnings ? 1 : 0.6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Wallet size={18} />
            <span>Withdraw</span>
          </button>
          <Wallet size={48} opacity={0.4} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Earnings History</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          Period breakdown
        </div>
      </div>

      <div className="card flex-col items-center justify-center" style={{ minHeight: '260px', padding: '24px 20px', marginBottom: 'var(--space-6)', borderRadius: 18, background: '#FFFFFF', border: '1px solid var(--border-color)' }}>
        <div className="flex justify-around items-end" style={{ height: '170px', width: '100%', gap: 'var(--space-4)', paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
          {currentBars.map((bar, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: bar.isPeak ? 'var(--primary)' : 'var(--text-muted)', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
                ৳{bar.amt}
              </span>
              <div
                style={{
                  width: '50%',
                  maxWidth: 44,
                  height: `${bar.h}%`,
                  backgroundColor: bar.isPeak ? 'var(--primary)' : 'var(--accent-border)',
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.3s ease',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 8 }}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3" style={{ marginTop: 'var(--space-4)', width: '100%' }}>
          {['1W', '1M', '3M', '1Y'].map((f) => (
            <button
              key={f}
              onClick={() => setChartFilter(f)}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: chartFilter === f ? 'none' : '1px solid var(--border-color)',
                background: chartFilter === f ? 'var(--primary)' : 'transparent',
                color: chartFilter === f ? '#FFFFFF' : 'var(--text-muted)',
                width: 'auto',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Recent Earnings</h3>
      <div className="flex-col gap-3">
        {(data.recentEarnings || []).map((earning) => (
          <div key={earning.id} className="card flex justify-between items-center" style={{ padding: '16px 20px', borderRadius: 16, background: '#FFFFFF', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
            <div>
              <div className="font-bold" style={{ fontSize: 15 }}>{earning.scooter}</div>
              <div className="text-sm text-muted" style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                Rented by {earning.renter} for {earning.hours}h • {earning.date}
              </div>
            </div>
            <div className="font-bold text-primary" style={{ fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
              +৳{Number(earning.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {showWithdrawModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 16,
        }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, maxWidth: 420, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Withdraw Earnings</h3>
              <button onClick={() => setShowWithdrawModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
              Transfer balance to your bKash, Nagad, or Bank Account.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Payment Method</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['bKash', 'Nagad'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayoutMethod(m)}
                    style={{
                      padding: '10px 8px', borderRadius: 10,
                      border: payoutMethod === m ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      background: payoutMethod === m ? 'var(--primary-light)' : '#FFFFFF',
                      color: payoutMethod === m ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Account Number</label>
              <input
                type="text"
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Amount to Withdraw</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>Available: ৳{data.totalEarnings}</span>
              </div>
              <input
                type="text"
                readOnly
                value={`৳${data.totalEarnings}`}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border-color)', fontSize: 16, fontWeight: 700, background: 'var(--bg-color)', fontVariantNumeric: 'tabular-nums' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setShowWithdrawModal(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
              <button type="button" onClick={handleWithdraw} className="btn btn-primary" style={{ flex: 1 }}>Withdraw Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
