import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../services/apiClient';
import { useI18n } from '../utils/i18n';

/**
 * Selector for the user's saved trips; used by itinerary, budget, expenses,
 * chatbot and other trip-scoped pages.
 */
export default function TripSelect({ value, onChange, allowAll = false }) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    // IMPORTANT: keep the SAME cache shape as every other ['trips'] consumer
    // (Dashboard, SavedTrips, ...). They store the full response object
    // { trips: [...] }, so this queryFn must store the object too — storing a
    // raw array here crashes the page (trips.map is not a function) whenever
    // another component populated the cache first.
    queryKey: ['trips'],
    queryFn: () => tripApi.list().then((r) => r.data.data),
  });

  // Tolerate both canonical { trips: [...] } and legacy array shapes.
  const trips = Array.isArray(data) ? data : (Array.isArray(data?.trips) ? data.trips : []);

  return (
    <select
      className="input max-w-xs"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={isLoading}
    >
      <option value="">{allowAll ? t('All trips') : t('Select a trip…')}</option>
      {trips.map((t) => (
        <option key={t._id} value={t._id}>
          {t.title} • {t.destination}
        </option>
      ))}
    </select>
  );
}
