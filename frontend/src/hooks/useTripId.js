import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../services/apiClient';

/**
 * Resolves which trip is "active": from :id route param, ?trip= query, or the
 * most recent saved trip.
 */
export default function useTripId() {
  const { id } = useParams();
  const location = useLocation();
  const queryTrip = useMemo(() => new URLSearchParams(location.search).get('trip'), [location.search]);

  const { data: tripsData } = useQuery({
    // Keep the SAME cache shape as every other ['trips'] consumer: the full
    // response object { trips: [...] }. (Storing the raw array here caused
    // TripSelect to crash when this hook populated the cache first.)
    queryKey: ['trips'],
    queryFn: () => tripApi.list().then((r) => r.data.data),
    enabled: !id && !queryTrip,
  });

  const trips = Array.isArray(tripsData) ? tripsData : (Array.isArray(tripsData?.trips) ? tripsData.trips : []);
  const tripId = id || queryTrip || trips?.[0]?._id || null;
  return tripId;
}
