/**
 * useLocationBroadcast.js
 *
 * Renter-side hook: starts broadcasting GPS when the bike status is 'in_use',
 * and stops automatically when the trip ends or the component unmounts.
 *
 * Usage inside AcceptedBikeCard:
 *   useLocationBroadcast(vehicleId, bikeStatus === 'in_use');
 */

import { useEffect, useRef } from 'react';
import { startBroadcasting, getCurrentPosition } from '../lib/locationBroadcast';

export function useLocationBroadcast(vehicleId, shouldBroadcast) {
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (!vehicleId || !shouldBroadcast) {
      // Stop any existing broadcast
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      return;
    }

    // Start broadcasting
    cleanupRef.current = startBroadcasting(vehicleId, getCurrentPosition, 5000);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [vehicleId, shouldBroadcast]);
}

