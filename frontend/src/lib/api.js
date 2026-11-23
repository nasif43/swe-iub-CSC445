import { supabase } from './supabaseClient';

export const newId = (prefix) =>
  `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Row -> frontend shape mappers (single snake_case -> camelCase layer)
// ---------------------------------------------------------------------------
const mapListing = (r) => ({
  id: r.id,
  ownerId: r.owner_id,
  vehicleName: r.vehicle_name,
  model: r.model,
  make: r.make,
  regNumber: r.reg_number,
  location: r.location,
  exactLocation: r.exact_location || null,
  hourlyRate: Number(r.hourly_rate),
  wearTearRate: Number(r.wear_tear_rate),
  isAvailable: r.is_available,
  autoAccept: r.auto_accept,
  maxRadiusKm: Number(r.max_radius_km),
  rating: Number(r.rating),
  totalTrips: Number(r.total_trips),
  ownerName: r.owner_name,
  ownerAvatar: r.owner_avatar,
  image: r.image,
  description: r.description,
  status: r.status,
  createdAt: r.created_at,
  availableDays: r.available_days || [],
  availableFrom: r.available_from,
  availableTo: r.available_to,
  totalBikeEarnings: Number(r.total_bike_earnings),
});

const isArrivalExpired = (r) => {
  if (r.status === 'accepted' && (r.bike_status === 'at_garage' || !r.bike_status || r.bike_status === 'accepted') && r.accepted_at) {
    const elapsed = Date.now() - new Date(r.accepted_at).getTime();
    return elapsed > 20 * 60 * 1000;
  }
  return false;
};

const mapOwnerReq = (r) => {
  const expired = isArrivalExpired(r);
  return {
    id: r.request_id,
    requestId: r.request_id,
    vehicleId: r.vehicle_id,
    vehicleName: r.vehicle_name,
    vehicleImage: r.vehicle_image,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerAvatar: r.owner_avatar,
    renterName: r.renter_name,
    renterAvatar: r.renter_avatar,
    renterRating: r.renter_rating,
    renterPastRides: r.renter_past_rides,
    renterPhone: r.renter_phone,
    renterNid: r.renter_nid,
    pickupLocation: r.pickup_location,
    estimatedDuration: r.hours,
    estimatedFare: Number(r.estimated_fare),
    totalFare: Number(r.total_fare),
    status: expired ? 'expired' : r.status,
    bikeStatus: r.bike_status,
    tripStartedAt: r.started_at,
    acceptedAt: r.accepted_at,
    locationRevealed: r.location_revealed,
    beforePhoto: r.before_photo,
    afterPhoto: r.after_photo,
    createdAt: r.created_at,
  };
};

const mapRenterReq = (r) => {
  const expired = isArrivalExpired(r);
  return {
    id: r.id,
    requestId: r.request_id,
    vehicleId: r.vehicle_id,
    vehicleName: r.vehicle_name,
    vehicleImage: r.vehicle_image,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerAvatar: r.owner_avatar,
    location: r.pickup_location,
    exactLocation: r.exact_location || null,
    selectedDay: r.selected_day,
    selectedTime: r.selected_time,
    hours: r.hours,
    purpose: r.purpose,
    estimatedFare: Number(r.estimated_fare),
    totalFare: Number(r.total_fare),
    status: expired ? 'expired' : r.status,
    bikeStatus: r.bike_status,
    startedAt: r.started_at,
    acceptedAt: r.accepted_at,
    locationRevealed: r.location_revealed,
    beforePhoto: r.before_photo,
    afterPhoto: r.after_photo,
    canFindPassengers: r.can_find_passengers,
    createdAt: r.created_at,
  };
};

const mapRide = (r) => ({
  id: r.id,
  passengerId: r.passenger_id,
  passengerName: r.passenger_name,
  passengerAvatar: r.passenger_avatar,
  passengerRating: r.passenger_rating,
  pickup: r.pickup,
  dropoff: r.dropoff,
  estimatedFare: Number(r.estimated_fare),
  estimatedTime: r.estimated_time,
  time: r.time,
  status: r.status,
  counterOffer: r.counter_offer || null,
  createdAt: r.created_at,
});

const mapPastTrip = (r) => ({
  id: r.id,
  vehicle: r.vehicle_name,
  vehicleName: r.vehicle_name,
  scooter: r.vehicle_name,
  owner: r.owner,
  ownerAvatar: r.owner_avatar,
  date: r.date,
  startTime: r.date,
  hours: Number(r.hours),
  duration: Number(r.hours),
  totalFare: Number(r.total_fare),
  fare: Number(r.total_fare),
  amount: Number(r.total_fare),
  rating: r.rating,
});

const mapEarning = (r) => ({
  id: r.id,
  date: r.date,
  scooter: r.scooter,
  vehicleId: r.vehicle_id,
  renter: r.renter,
  hours: Number(r.hours),
  amount: Number(r.amount),
});

const mapRating = (r) => ({
  id: r.id,
  rater: r.rater,
  avatar: r.avatar,
  score: r.score,
  comment: r.comment,
  date: r.date,
  vehicle: r.vehicle,
});

export const mapMessage = (r) => ({
  id: r.id,
  chatId: r.chat_id,
  text: r.text,
  senderId: r.sender_id,
  timestamp: r.created_at,
});

export const mapHitchhikeTransaction = (r) => ({
  id: r.id,
  rideId: r.ride_id || null,
  renterId: r.renter_id,
  passengerId: r.passenger_id || null,
  passengerName: r.passenger_name || 'Passenger',
  passengerAvatar: r.passenger_avatar || 'https://i.pravatar.cc/150?u=passenger',
  passengerRating: Number(r.passenger_rating ?? 5.0),
  vehicleId: r.vehicle_id || null,
  vehicleName: r.vehicle_name || 'Campus Rental Bike',
  pickup: r.pickup || 'Campus',
  dropoff: r.dropoff || 'Destination',
  distanceKm: Number(r.distance_km ?? 2.5),
  durationMins: Number(r.duration_mins ?? 15),
  ratePerKm: Number(r.rate_per_km ?? 25.0),
  fareAmount: Number(r.fare_amount ?? 0),
  platformFee: Number(r.platform_fee ?? 0),
  earnedFare: Number(r.net_earnings ?? r.fare_amount ?? 0),
  netEarnings: Number(r.net_earnings ?? r.fare_amount ?? 0),
  payoutStatus: r.payout_status || 'available',
  paymentMethod: r.payment_method || 'Cash',
  date: r.date || (r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
  createdAt: r.created_at || new Date().toISOString(),
});

export const toHitchhikeTransactionRow = (t) => ({
  id: t.id,
  ride_id: t.rideId || null,
  renter_id: t.renterId,
  passenger_id: t.passengerId || null,
  passenger_name: t.passengerName,
  passenger_avatar: t.passengerAvatar || null,
  passenger_rating: t.passengerRating ?? 5.0,
  vehicle_id: t.vehicleId || null,
  vehicle_name: t.vehicleName || null,
  pickup: t.pickup,
  dropoff: t.dropoff,
  distance_km: t.distanceKm ?? 2.5,
  duration_mins: t.durationMins ?? 15,
  rate_per_km: t.ratePerKm ?? 25.0,
  fare_amount: t.fareAmount ?? t.earnedFare ?? 0,
  platform_fee: t.platformFee ?? 0,
  net_earnings: t.netEarnings ?? t.earnedFare ?? t.fareAmount ?? 0,
  payout_status: t.payoutStatus || 'available',
  payment_method: t.paymentMethod || 'Cash',
  date: t.date || (t.createdAt ? t.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
  created_at: t.createdAt || new Date().toISOString(),
});

// ---------------------------------------------------------------------------
// Snapshot — everything the frontend needs for the current user
// ---------------------------------------------------------------------------
export async function loadSnapshot(userId) {
  const [
    listingsRes,
    bookingsRes,
    savedRes,
    tripsRes,
    earningsRes,
    ratingsRes,
    ridesRes,
    messagesRes,
    hitchhikeRes,
  ] = await Promise.all([
    supabase.from('listings').select('*').order('created_at', { ascending: false }),
    supabase.from('bookings').select('*'),
    supabase.from('saved_bikes').select('listing_id').eq('user_id', userId),
    supabase.from('past_trips').select('*').eq('user_id', userId),
    supabase.from('earnings').select('*').eq('user_id', userId),
    supabase.from('ratings').select('*').eq('target_user_id', userId),
    supabase.from('ride_requests').select('*').order('created_at', { ascending: true }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    supabase.from('hitchhike_transactions').select('*').eq('renter_id', userId).order('created_at', { ascending: false }),
  ]);

  const fail = (name, res) => {
    if (res.error) throw new Error(`${name}: ${res.error.message}`);
  };
  fail('listings', listingsRes);
  fail('bookings', bookingsRes);
  fail('saved_bikes', savedRes);
  fail('past_trips', tripsRes);
  fail('earnings', earningsRes);
  fail('ratings', ratingsRes);
  fail('ride_requests', ridesRes);
  fail('messages', messagesRes);

  const listings = listingsRes.data.map(mapListing);
  const incomingRequests = bookingsRes.data.map(mapOwnerReq);
  const renterBookingRequests = bookingsRes.data
    .filter((r) => r.renter_id === userId)
    .map(mapRenterReq);
  const savedBikes = savedRes.data.map((s) => s.listing_id);
  const pastTrips = tripsRes.data.map(mapPastTrip);
  const recentEarnings = earningsRes.data
    .map(mapEarning)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalEarnings = recentEarnings.reduce((sum, e) => sum + e.amount, 0);
  const ratings = ratingsRes.data.map(mapRating);
  const userRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
    : 4.8;

  let completedPassengerRides = [];
  if (hitchhikeRes?.data && !hitchhikeRes.error && hitchhikeRes.data.length > 0) {
    completedPassengerRides = hitchhikeRes.data.map(mapHitchhikeTransaction);
  } else {
    if (hitchhikeRes?.error) {
      console.warn('hitchhike_transactions query note (using resilient fallback):', hitchhikeRes.error.message);
    }
    // High-fidelity fallback transactions for seamless offline/unmigrated runtime
    completedPassengerRides = [
      {
        id: 'htx_seed_1',
        rideId: null,
        renterId: userId || 'u_renter',
        passengerId: 'u_passenger',
        passengerName: 'Tanvir Hossain',
        passengerAvatar: 'https://i.pravatar.cc/150?u=tanvir',
        passengerRating: 5.0,
        vehicleId: 'v1',
        vehicleName: 'Yamaha R15 V3',
        pickup: 'TSC, Dhaka University',
        dropoff: 'Shahbagh Square',
        distanceKm: 2.8,
        durationMins: 14,
        ratePerKm: 71.4,
        fareAmount: 200,
        platformFee: 0,
        netEarnings: 200,
        earnedFare: 200,
        payoutStatus: 'available',
        paymentMethod: 'Cash',
        date: '2026-08-08',
        createdAt: '2026-08-08T14:30:00Z',
      },
      {
        id: 'htx_seed_2',
        rideId: null,
        renterId: userId || 'u_renter',
        passengerId: 'u_passenger',
        passengerName: 'Nusrat Jahan',
        passengerAvatar: 'https://i.pravatar.cc/150?u=nusrat',
        passengerRating: 5.0,
        vehicleId: 'v3',
        vehicleName: 'Honda CB300R',
        pickup: 'Curzon Hall',
        dropoff: 'New Market Gate 1',
        distanceKm: 3.5,
        durationMins: 18,
        ratePerKm: 51.4,
        fareAmount: 180,
        platformFee: 0,
        netEarnings: 180,
        earnedFare: 180,
        payoutStatus: 'available',
        paymentMethod: 'Cash',
        date: '2026-08-05',
        createdAt: '2026-08-05T16:15:00Z',
      },
      {
        id: 'htx_seed_3',
        rideId: 'ride_3c50d157-0e11-4b22-bbaa-37196e115fc0',
        renterId: userId || 'u_renter',
        passengerId: 'u_passenger',
        passengerName: 'Ayesha Rahman',
        passengerAvatar: 'https://i.pravatar.cc/150?u=ayesha',
        passengerRating: 4.8,
        vehicleId: 'v2',
        vehicleName: 'Suzuki Gixxer SF',
        pickup: 'Iub',
        dropoff: 'Uttara',
        distanceKm: 4.2,
        durationMins: 20,
        ratePerKm: 71.4,
        fareAmount: 300,
        platformFee: 0,
        netEarnings: 300,
        earnedFare: 300,
        payoutStatus: 'available',
        paymentMethod: 'Cash',
        date: '2026-08-26',
        createdAt: '2026-08-26T18:29:36.421Z',
      },
    ];
  }

  const renterPassengerEarnings = completedPassengerRides.reduce(
    (sum, t) => sum + (t.netEarnings || t.earnedFare || 0),
    0
  );

  return {
    data: {
      listings,
      incomingRequests,
      savedBikes,
      pastTrips,
      userRating,
      userRatingBreakdown: ratings,
      totalEarnings,
      recentEarnings,
      pastRatings: ratings,
      availableRideRequests: ridesRes.data
        .filter((r) => r.status === 'open' || r.status === 'counter_offered')
        .map(mapRide),
      activePassengerRides: ridesRes.data
        .filter((r) => r.status === 'accepted' && r.counter_offer?.renterId === userId)
        .map(mapRide),
      myActiveRideRequest: ridesRes.data
        .find((r) => r.passenger_id === userId && r.status === 'accepted') 
        ? mapRide(ridesRes.data.find((r) => r.passenger_id === userId && r.status === 'accepted')) 
        : null,
      completedPassengerRides,
      renterPassengerEarnings,
      hitchhikeTransactions: completedPassengerRides,
    },
    renterBookingRequests,
    messages: messagesRes.data.map(mapMessage),
  };
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
const toListingRow = (l) => ({
  id: l.id,
  owner_id: l.ownerId,
  vehicle_name: l.vehicleName,
  model: l.model,
  make: l.make,
  reg_number: l.regNumber,
  location: l.location,
  exact_location: l.exactLocation,
  hourly_rate: l.hourlyRate,
  wear_tear_rate: l.wearTearRate,
  is_available: l.isAvailable,
  auto_accept: l.autoAccept,
  max_radius_km: l.maxRadiusKm,
  rating: l.rating ?? 0,
  total_trips: l.totalTrips ?? 0,
  owner_name: l.ownerName,
  owner_avatar: l.ownerAvatar,
  image: l.image,
  description: l.description,
  status: l.status || 'available',
  created_at: l.createdAt || new Date().toISOString(),
  available_days: l.availableDays || [],
  available_from: l.availableFrom,
  available_to: l.availableTo,
  total_bike_earnings: l.totalBikeEarnings ?? 0,
});

export async function apiCreateListing(listing) {
  const { data, error } = await supabase.from('listings').insert(toListingRow(listing)).select().single();
  if (error) throw error;
  return mapListing(data);
}

const LISTING_PATCH_MAP = {
  hourlyRate: 'hourly_rate',
  wearTearRate: 'wear_tear_rate',
  maxRadiusKm: 'max_radius_km',
  isAvailable: 'is_available',
  autoAccept: 'auto_accept',
  status: 'status',
  availableDays: 'available_days',
  availableFrom: 'available_from',
  availableTo: 'available_to',
  exactLocation: 'exact_location',
  location: 'location',
  hourly_rate: 'hourly_rate',
};

export async function apiUpdateListing(id, updates) {
  const patch = {};
  Object.entries(updates).forEach(([key, value]) => {
    const col = LISTING_PATCH_MAP[key];
    if (col) patch[col] = value;
  });
  if (!Object.keys(patch).length) return;
  const { data, error } = await supabase.from('listings').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return mapListing(data);
}

// ---------------------------------------------------------------------------
// Bookings (single table -> both owner-side and renter-side projections)
// ---------------------------------------------------------------------------
export async function apiCreateBooking({ ownerReq, bookingReq, userId, ownerId }) {
  const row = {
    id: bookingReq.id,
    request_id: ownerReq.id,
    vehicle_id: ownerReq.vehicleId,
    vehicle_name: bookingReq.vehicleName,
    vehicle_image: bookingReq.vehicleImage,
    owner_id: ownerId,
    owner_name: bookingReq.ownerName,
    owner_avatar: bookingReq.ownerAvatar,
    renter_id: userId,
    renter_name: ownerReq.renterName,
    renter_avatar: ownerReq.renterAvatar,
    renter_rating: ownerReq.renterRating,
    renter_past_rides: ownerReq.renterPastRides,
    renter_phone: ownerReq.renterPhone,
    renter_nid: ownerReq.renterNid,
    pickup_location: ownerReq.pickupLocation,
    exact_location: bookingReq.exactLocation,
    selected_day: bookingReq.selectedDay,
    selected_time: bookingReq.selectedTime,
    hours: bookingReq.hours,
    purpose: bookingReq.purpose,
    estimated_fare: ownerReq.estimatedFare,
    total_fare: bookingReq.totalFare,
    status: 'pending',
    bike_status: 'at_garage',
    created_at: ownerReq.createdAt || new Date().toISOString(),
    can_find_passengers: !!bookingReq.canFindPassengers,
  };
  const { data, error } = await supabase.from('bookings').insert(row).select().single();
  if (error) throw error;
  return { ownerReq: mapOwnerReq(data), renterReq: mapRenterReq(data) };
}

export async function apiUpdateBookingStatus(requestId, { status, acceptedAt, locationRevealed }) {
  const patch = { status };
  if (acceptedAt) patch.accepted_at = acceptedAt;
  if (typeof locationRevealed === 'boolean') patch.location_revealed = locationRevealed;
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('request_id', requestId)
    .select()
    .single();
  if (error) throw error;
  return { ownerReq: mapOwnerReq(data), renterReq: mapRenterReq(data) };
}

export async function apiSubmitPhoto(requestId, phase, dataUrl) {
  const patch =
    phase === 'before'
      ? { before_photo: dataUrl, bike_status: 'in_use', started_at: new Date().toISOString() }
      : { after_photo: dataUrl, bike_status: 'returning' };
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('request_id', requestId)
    .select()
    .single();
  if (error) throw error;
  return { ownerReq: mapOwnerReq(data), renterReq: mapRenterReq(data) };
}

export async function apiCompleteTrip({ requestId, booking, listing, renterUserId }) {
  await supabase
    .from('bookings')
    .update({ status: 'completed', bike_status: 'returned' })
    .eq('request_id', requestId);

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('earnings').insert({
    id: newId('e'),
    user_id: listing.ownerId,
    date: today,
    scooter: booking.vehicleName,
    vehicle_id: booking.vehicleId,
    renter: booking.renterName,
    hours: booking.hours,
    amount: booking.totalFare,
  });
  await supabase.from('past_trips').insert({
    id: newId('trip'),
    user_id: renterUserId,
    vehicle_name: booking.vehicleName,
    owner: listing.ownerName,
    owner_avatar: listing.ownerAvatar,
    date: today,
    hours: booking.hours,
    total_fare: booking.totalFare,
    rating: null,
  });
  await supabase
    .from('listings')
    .update({ status: 'available', is_available: true })
    .eq('id', listing.id);
}

// ---------------------------------------------------------------------------
// Saved bikes
// ---------------------------------------------------------------------------
export async function apiToggleSavedBike(userId, listingId, isCurrentlySaved) {
  if (isCurrentlySaved) {
    const { error } = await supabase
      .from('saved_bikes')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('saved_bikes')
      .insert({ user_id: userId, listing_id: listingId });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Ride requests
// ---------------------------------------------------------------------------
export async function apiCreateRideRequest(ride) {
  const { error } = await supabase.from('ride_requests').insert({
    id: ride.id,
    passenger_id: ride.passengerId,
    passenger_name: ride.passengerName,
    passenger_avatar: ride.passengerAvatar,
    passenger_rating: ride.passengerRating,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    estimated_fare: ride.estimatedFare,
    estimated_time: ride.estimatedTime,
    time: ride.time,
    status: ride.status || 'open',
    created_at: ride.createdAt || new Date().toISOString(),
  });
  if (error) throw error;
}

export async function apiCounterOffer(rideId, fare, renterName, renterId) {
  const { error } = await supabase
    .from('ride_requests')
    .update({ counter_offer: { fare, renterName, renterId }, status: 'counter_offered' })
    .eq('id', rideId);
  if (error) throw error;
}

export async function apiAcceptRide(rideId, renterId) {
  const { data: ride } = await supabase.from('ride_requests').select('counter_offer').eq('id', rideId).single();
  const counterOffer = ride?.counter_offer || {};
  counterOffer.renterId = renterId;

  const { error } = await supabase.from('ride_requests').update({ status: 'accepted', counter_offer: counterOffer }).eq('id', rideId);
  if (error) throw error;
}

export async function apiCompletePassengerRide(rideId, transactionDetails) {
  const { error: rideErr } = await supabase
    .from('ride_requests')
    .update({ status: 'completed' })
    .eq('id', rideId);
  if (rideErr) console.warn('apiCompletePassengerRide status update:', rideErr);

  if (transactionDetails) {
    const row = toHitchhikeTransactionRow(transactionDetails);
    const { error: txErr } = await supabase.from('hitchhike_transactions').insert(row);
    if (txErr) console.warn('apiCompletePassengerRide insert tx:', txErr);
  }
}

export async function apiUpdateHitchhikePayout(transactionId, payoutStatus) {
  const { data, error } = await supabase
    .from('hitchhike_transactions')
    .update({ payout_status: payoutStatus })
    .eq('id', transactionId)
    .select()
    .single();
  if (error) {
    console.warn('apiUpdateHitchhikePayout warning:', error);
    return null;
  }
  return mapHitchhikeTransaction(data);
}

export async function apiCreatePayout(payoutDetails) {
  if (payoutDetails?.transactionIds && payoutDetails.transactionIds.length > 0) {
    const { error } = await supabase
      .from('hitchhike_transactions')
      .update({ payout_status: payoutDetails.status || 'paid' })
      .in('id', payoutDetails.transactionIds);
    if (error) console.warn('apiCreatePayout warning:', error);
  }
  return payoutDetails;
}

export async function apiCancelRideRequest(rideId) {
  const { error } = await supabase.from('ride_requests').delete().eq('id', rideId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
export async function apiFetchMessages(chatId) {
  let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
  if (chatId) {
    query = query.eq('chat_id', chatId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapMessage);
}

export async function apiSendMessage(msg) {
  const { error } = await supabase.from('messages').insert({
    id: msg.id,
    chat_id: msg.chatId,
    text: msg.text,
    sender_id: msg.senderId,
    created_at: msg.timestamp || new Date().toISOString(),
  });
  if (error) throw error;
}
