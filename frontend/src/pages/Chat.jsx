import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import * as api from '../lib/api';
import {
  ChevronLeft,
  Send,
  Phone,
  Bot,
  Check,
  CheckCheck,
  Shield,
  Sparkles,
  RefreshCw,
  Clock,
  Bike
} from 'lucide-react';

export default function Chat() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const {
    user,
    role,
    messages,
    setMessages,
    addMessage,
    data,
    renterBookingRequests,
    activePassengerRides
  } = useAuth();

  const [text, setText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // 1. Resolve actualChatId reliably
  const actualChatId = useMemo(() => {
    if (chatId) return chatId;
    // Fallback: look for active bookings or existing chats
    const activeReq = renterBookingRequests.find(r => r.status === 'accepted' || r.bikeStatus === 'in_use')
      || data.incomingRequests.find(r => r.status === 'accepted' || r.bikeStatus === 'in_use')
      || renterBookingRequests[0]
      || data.incomingRequests[0];
    if (activeReq) return activeReq.requestId || activeReq.id;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.chatId) return lastMsg.chatId;
    return 'dm_general';
  }, [chatId, renterBookingRequests, data.incomingRequests, messages]);

  // 2. Resolve the other contact details
  const contactInfo = useMemo(() => {
    const qName = searchParams.get('name');
    const qAvatar = searchParams.get('avatar');
    const qContext = searchParams.get('context');

    // Find related booking request
    const booking = renterBookingRequests.find(
      r => (r.requestId && r.requestId === actualChatId) || r.id === actualChatId
    ) || data.incomingRequests.find(
      r => (r.requestId && r.requestId === actualChatId) || r.id === actualChatId
    );

    // Find related passenger hitchhike ride
    const passengerRide = activePassengerRides?.find(r => r.id === actualChatId)
      || (data.myActiveRideRequest?.id === actualChatId ? data.myActiveRideRequest : null);

    const isCurrentRenter = role === 'renter' || user?.id === 'u_renter' || (booking && user?.id === booking.renterId);
    const isCurrentOwner = role === 'owner' || user?.id === 'u1' || (booking && user?.id === booking.ownerId);

    if (booking) {
      if (isCurrentRenter) {
        return {
          id: booking.ownerId || 'u1',
          name: qName || booking.ownerName || 'Nazia Putul',
          avatar: qAvatar || booking.ownerAvatar || 'https://i.pravatar.cc/150?u=nazia',
          phone: booking.ownerPhone || '01712345678',
          roleTag: 'Vehicle Owner',
          context: qContext || `${booking.vehicleName || 'Campus Vehicle'} • Booking`,
          vehicle: booking.vehicleName
        };
      } else {
        return {
          id: booking.renterId || 'u_renter',
          name: qName || booking.renterName || 'Tahsin Ahmed',
          avatar: qAvatar || booking.renterAvatar || 'https://i.pravatar.cc/150?u=tahsin',
          phone: booking.renterPhone || '01823456789',
          roleTag: 'Verified Renter',
          context: qContext || `${booking.vehicleName || 'Vehicle'} • Renter`,
          vehicle: booking.vehicleName
        };
      }
    }

    if (passengerRide) {
      if (role === 'passenger' || user?.id === 'u_passenger') {
        return {
          id: 'u_renter',
          name: qName || passengerRide.counterOffer?.renterName || 'Tahsin Ahmed (Rider)',
          avatar: qAvatar || passengerRide.counterOffer?.renterAvatar || 'https://i.pravatar.cc/150?u=tahsin',
          phone: passengerRide.counterOffer?.renterPhone || '01823456789',
          roleTag: 'Campus Rider',
          context: qContext || `${passengerRide.pickup || 'Pickup'} → ${passengerRide.dropoff || 'Dropoff'}`,
          vehicle: 'Rideshare Trip'
        };
      } else {
        return {
          id: passengerRide.passengerId || 'u_passenger',
          name: qName || passengerRide.passengerName || 'Ayesha Rahman',
          avatar: qAvatar || passengerRide.passengerAvatar || 'https://i.pravatar.cc/150?u=ayesha',
          phone: passengerRide.passengerPhone || '01934567890',
          roleTag: 'Passenger',
          context: qContext || `${passengerRide.pickup || 'Campus'} → ${passengerRide.dropoff || 'Destination'}`,
          vehicle: 'Passenger Ride'
        };
      }
    }

    // Fallback based on URL or current persona
    if (isCurrentOwner) {
      return {
        id: 'u_renter',
        name: qName || 'Tahsin Ahmed',
        avatar: qAvatar || 'https://i.pravatar.cc/150?u=tahsin',
        phone: '01823456789',
        roleTag: 'Verified Renter',
        context: qContext || 'Campus Rental Discussion',
        vehicle: 'Campus Vehicle'
      };
    } else {
      return {
        id: 'u1',
        name: qName || 'Nazia Putul',
        avatar: qAvatar || 'https://i.pravatar.cc/150?u=nazia',
        phone: '01712345678',
        roleTag: 'Vehicle Owner',
        context: qContext || 'Rental Coordination',
        vehicle: 'Campus Vehicle'
      };
    }
  }, [actualChatId, searchParams, renterBookingRequests, data, activePassengerRides, role, user]);

  // Filter messages belonging to this chat
  const chatMessages = useMemo(() => {
    return messages
      .filter(m => m.chatId === actualChatId)
      .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }, [messages, actualChatId]);

  // Periodic poll to ensure messages stay updated on unstable connections
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const remoteMsgs = await api.apiFetchMessages(actualChatId);
        if (!isMounted || !remoteMsgs || !setMessages) return;
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = remoteMsgs.filter(m => !existingIds.has(m.id));
          if (newOnes.length === 0) return prev;
          return [...prev, ...newOnes];
        });
      } catch (_) {}
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [actualChatId, setMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  // Quick manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const remoteMsgs = await api.apiFetchMessages(actualChatId);
      if (remoteMsgs && setMessages) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newOnes = remoteMsgs.filter(m => !existingIds.has(m.id));
          return [...prev, ...newOnes];
        });
      }
      toast.info('Refreshed', 'Messages updated from cloud.');
    } catch (e) {
      toast.info('Offline Mode', 'Displaying local session messages.');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Send message
  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    const myId = user?.id || (role === 'owner' ? 'u1' : 'u_renter');
    addMessage(actualChatId, text.trim(), myId);
    setText('');
    setTimeout(() => {
      inputRef.current?.focus();
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Quick suggestion chip click
  const handleQuickChip = (chipText) => {
    const myId = user?.id || (role === 'owner' ? 'u1' : 'u_renter');
    addMessage(actualChatId, chipText, myId);
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Simulate incoming response (Demo Mode helper)
  const handleSimulateReply = () => {
    const ownerReplies = [
      'The vehicle is parked right at the north garage rack! Key is in the combo lock (code: 4421).',
      'Got your message! Please check the vehicle and take the before-ride photo.',
      'All set! Have a safe ride on campus!',
      'Sounds great, see you soon at the drop-off location!'
    ];
    const renterReplies = [
      "I'm heading over to the vehicle right now 🚗",
      "Just arrived at the pickup rack. Unlocking now!",
      "Took the verification photo. Vehicle looks great!",
      "I'm on my way to return the vehicle. Will be there in 5 mins."
    ];
    const passengerReplies = [
      "I'm waiting right at the main campus gate in a navy jacket.",
      "Got it! Thanks for picking me up so fast.",
      "Arrived safely, thank you so much for the ride! ⭐"
    ];

    let pool = role === 'owner' ? renterReplies : ownerReplies;
    if (role === 'passenger') pool = renterReplies;

    const reply = pool[Math.floor(Math.random() * pool.length)];
    const otherId = contactInfo.id || (role === 'owner' ? 'u_renter' : 'u1');

    addMessage(actualChatId, reply, otherId);
    toast.success(`Message from ${contactInfo.name}`, reply);
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Trigger Phone call
  const handleCall = () => {
    toast.info('Calling Contact', `Initiating call to ${contactInfo.name} (${contactInfo.phone})...`);
    window.location.href = `tel:${contactInfo.phone}`;
  };

  // Helper: check if message is from current user
  const isMessageFromMe = (msg) => {
    if (!msg) return false;
    if (user?.id && msg.senderId === user.id) return true;
    if (role === 'owner') {
      return msg.senderId === 'u1' || msg.senderId === 'owner';
    }
    if (role === 'renter') {
      return msg.senderId === 'u_renter' || msg.senderId === 'renter';
    }
    if (role === 'passenger') {
      return msg.senderId === 'u_passenger' || msg.senderId === 'passenger';
    }
    return false;
  };

  // Format timestamp nicely
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  // Quick suggestion chips depending on role
  const quickChips = useMemo(() => {
    if (role === 'owner') {
      return [
        'Vehicle is at the garage rack 🚗',
        'Combo code is 4421 🔒',
        'Helmet is in the compartment 🪖',
        'Please ride safely! 👍'
      ];
    }
    if (role === 'passenger') {
      return [
        "Waiting at the pickup gate 📍",
        'On my way out now 🏃‍♂️',
        'In front of the cafeteria',
        'Thank you! ⭐'
      ];
    }
    return [
      "I'm at the pickup spot! 📍",
      'On my way 🚗',
      'Where is the lock combo?',
      'Returning vehicle in 5 mins ⏰'
    ];
  }, [role]);

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: 0,
      height: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-color)',
      position: 'relative'
    }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--surface)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        gap: 12
      }}>
        {/* Left: Back button + Avatar + Details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '8px',
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: 'var(--text-main)',
              transition: 'background 0.15s ease'
            }}
            title="Go Back"
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={contactInfo.avatar}
              alt={contactInfo.name}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--surface)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            />
            {/* Online Green Pulse Indicator */}
            <span style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#10B981',
              border: '2px solid var(--surface)'
            }} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
              <span style={{
                fontWeight: 700,
                fontSize: 15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--text-main)'
              }}>
                {contactInfo.name}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(0, 177, 79, 0.12)',
                color: 'var(--primary)',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: 0.4
              }}>
                {contactInfo.roleTag}
              </span>
            </div>
            <div style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span>Active now</span>
              <span>•</span>
              <span>{contactInfo.context}</span>
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleManualRefresh}
            style={{
              padding: 8,
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              background: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
            title="Refresh messages"
          >
            <RefreshCw size={17} className={isRefreshing ? 'animate-spin' : ''} />
          </button>



          <button
            onClick={handleCall}
            style={{
              padding: 9,
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,177,79,0.3)'
            }}
            title={`Call ${contactInfo.name}`}
          >
            <Phone size={16} />
          </button>
        </div>
      </header>

      {/* Messages Stream */}
      <div style={{
        flex: 1,
        padding: '14px 16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        backgroundColor: '#F9FAFB'
      }}>
        {/* Security & Context Banner */}
        <div style={{
          alignSelf: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 24,
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: 'var(--shadow-sm)',
          fontSize: 12,
          color: 'var(--text-muted)',
          maxWidth: '92%',
          textAlign: 'center'
        }}>
          <Shield size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>Direct messaging active for <strong>{contactInfo.vehicle || 'trip'}</strong></span>
        </div>

        {/* Empty state */}
        {chatMessages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            textAlign: 'center'
          }}>
            <img
              src={contactInfo.avatar}
              alt={contactInfo.name}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                marginBottom: 12,
                border: '3px solid white',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
              }}
            />
            <h4 style={{ margin: '0 0 4px 0', fontSize: 17, fontWeight: 700 }}>
              Chat with {contactInfo.name}
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', maxWidth: 300 }}>
              Say hello or send a quick update to coordinate pickup and ride details smoothly!
            </p>
          </div>
        )}

        {/* Message Bubbles */}
        {chatMessages.map((msg, index) => {
          const isMe = isMessageFromMe(msg);
          const timeStr = formatTime(msg.timestamp);

          return (
            <div
              key={msg.id || index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 8,
                maxWidth: '78%',
                flexDirection: isMe ? 'row-reverse' : 'row'
              }}>
                {/* Contact Avatar for incoming messages */}
                {!isMe && (
                  <img
                    src={contactInfo.avatar}
                    alt={contactInfo.name}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                      marginBottom: 2
                    }}
                  />
                )}

                {/* Message Bubble */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe
                    ? 'linear-gradient(135deg, #00B14F 0%, #009643 100%)'
                    : '#FFFFFF',
                  color: isMe ? '#FFFFFF' : '#111827',
                  border: isMe ? 'none' : '1px solid #E5E7EB',
                  boxShadow: isMe
                    ? '0 3px 10px rgba(0, 177, 79, 0.22)'
                    : '0 1px 4px rgba(0,0,0,0.04)',
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  wordBreak: 'break-word'
                }}>
                  {msg.text}
                </div>
              </div>

              {/* Message metadata (timestamp + delivery mark) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 3,
                marginRight: isMe ? 4 : 0,
                marginLeft: isMe ? 0 : 38,
                fontVariantNumeric: 'tabular-nums'
              }}>
                <span>{timeStr}</span>
                {isMe && <CheckCheck size={13} color="var(--primary)" />}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* Quick Suggestion Chips */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 16px',
        overflowX: 'auto',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border-color)',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickChip(chip)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 20,
              background: '#F3F4F6',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s ease'
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px 14px',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface)',
          flexShrink: 0
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Message ${contactInfo.name}...`}
          style={{
            flex: 1,
            padding: '11px 18px',
            borderRadius: 24,
            border: '1.5px solid var(--border-color)',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 14.5,
            backgroundColor: '#F9FAFB',
            color: 'var(--text-main)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
          }}
        />

        <button
          type="submit"
          disabled={!text.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: text.trim() ? 'var(--primary)' : '#E5E7EB',
            color: text.trim() ? '#FFFFFF' : '#9CA3AF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            boxShadow: text.trim() ? '0 2px 8px rgba(0,177,79,0.35)' : 'none'
          }}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
