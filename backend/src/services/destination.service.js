/**
 * destination.service.js — Central destination normalization + validation layer.
 *
 * Every trip resolves to a structured destination:
 *   { city, state, country, countryCode, latitude, longitude, timezone, radiusKm, curated }
 *
 * Every place returned by any provider is validated against this structured
 * destination (country code match + distance-from-center) BEFORE it can reach
 * the itinerary. Generic global text searches are never used: searches are
 * anchored to the destination coordinates with a radius + country filter.
 */
import mapsProvider from '../providers/maps.provider.js';
import curatedData from '../data/curatedDestinations.js';
import { haversineKm } from '../utils/geo.js';
import logger from '../utils/logger.js';

const DEST_CACHE = new Map(); // key → destinationInfo

function normalizeKey(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Parse a free-text destination into { city, state, country, countryCode }.
 * Accepts "Nagpur, Maharashtra, India", "Nagpur, Maharashtra", "Nagpur (IN)".
 */
export function parseDestination(destination) {
  const raw = String(destination || '');
  // "Nagpur (IN)" style country-code suffix can appear on any segment.
  let countryCode = null;
  const ccMatch = raw.match(/\(([A-Za-z]{2})\)/);
  if (ccMatch) {
    countryCode = ccMatch[1].toUpperCase();
  }
  const parts = raw
    .replace(/\([A-Za-z]{2}\)/, '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const city = parts.shift() || '';
  const state = parts.shift() || '';
  const country = parts.shift() || '';
  return { city, state, country, countryCode };
}

/** Find the curated entry for a destination (by name, city-only, or hints). */
export function findCuratedDestination(destination, hints = {}) {
  const key = normalizeKey(destination);
  if (curatedData[key]) return curatedData[key];
  const p = parseDestination(destination);
  if (curatedData[normalizeKey(p.city)]) return curatedData[normalizeKey(p.city)];
  // Match by hints (state + countryCode must agree, then city name)
  const hintsCity = normalizeKey(hints.city || '');
  if (hintsCity) {
    for (const entry of Object.values(curatedData)) {
      if (normalizeKey(entry.name) !== hintsCity) continue;
      if (hints.countryCode && entry.countryCode !== String(hints.countryCode).toUpperCase()) continue;
      if (hints.state && normalizeKey(entry.state) !== normalizeKey(hints.state)) continue;
      return entry;
    }
  }
  return null;
}

/** Build the structured destinationInfo object from a curated entry. */
function curatedToInfo(entry) {
  return {
    name: entry.name,
    city: entry.name,
    state: entry.state,
    country: entry.country,
    countryCode: entry.countryCode,
    latitude: entry.latitude,
    longitude: entry.longitude,
    timezone: entry.timezone || '',
    radiusKm: entry.radiusKm || 40,
    source: 'curated',
    localityLabels: entry.localityLabels || [],
    curated: entry,
  };
}

/**
 * Synchronous destination resolution — curated data only, no API calls.
 * Used by the deterministic day builder so it never depends on the network.
 */
export function getDestinationInfoSync(destination, hints = {}) {
  const curated = findCuratedDestination(destination, hints);
  if (curated) return curatedToInfo(curated);
  const p = parseDestination(destination);
  return {
    name: p.city || destination,
    city: p.city || destination,
    state: p.state,
    country: p.country,
    countryCode: (p.countryCode || '').toUpperCase() || null,
    latitude: null,
    longitude: null,
    timezone: '',
    radiusKm: 40,
    source: 'none',
    localityLabels: [],
    curated: null,
  };
}

/**
 * Resolve a destination to its full structured info.
 * Priority: curated dataset (offline, exact) → live Geoapify geocode with a
 * structured "city, state, country" query + country filter.
 */
export async function resolveDestination(destination, hints = {}) {
  const cacheKey =
    `${normalizeKey(destination)}|${normalizeKey(hints.countryCode || '')}|${normalizeKey(hints.state || '')}`;
  if (DEST_CACHE.has(cacheKey)) return DEST_CACHE.get(cacheKey);

  const curated = findCuratedDestination(destination, hints);
  if (curated) {
    const info = curatedToInfo(curated);
    DEST_CACHE.set(cacheKey, info);
    return info;
  }

  // Live geocode — structured query, never a bare global text search.
  const p = parseDestination(destination);
  const queryParts = [p.city, p.state, p.country].filter(Boolean);
  const text = queryParts.length ? queryParts.join(', ') : String(destination || '');
  try {
    const geo = await mapsProvider.geocode(text, {
      country: p.country || hints.country || '',
      countryCode: p.countryCode || hints.countryCode || '',
    });
    if (geo.isLive && geo.data?.lat != null) {
      const info = {
        name: geo.data.city || p.city || destination,
        city: geo.data.city || p.city || destination,
        state: geo.data.state || p.state || '',
        country: geo.data.country || p.country || '',
        countryCode: (geo.data.countryCode || p.countryCode || '').toUpperCase() || null,
        latitude: geo.data.lat,
        longitude: geo.data.lng,
        timezone: geo.data.timezone || '',
        radiusKm: 40,
        source: 'live',
        localityLabels: [],
        curated: null,
      };
      DEST_CACHE.set(cacheKey, info);
      return info;
    }
  } catch (err) {
    logger.warn(`[DEST] Geocode failed for "${text}": ${err.message}`);
  }

  const info = {
    ...getDestinationInfoSync(destination, hints),
    source: 'none',
  };
  DEST_CACHE.set(cacheKey, info);
  return info;
}

// ══════════════════════════════════════════════════════════════════
//  GEOLOCATION VALIDATION
// ══════════════════════════════════════════════════════════════════

/**
 * Validate a single place against the destination.
 *
 * Rules (any rejection → discard the place):
 *  - coordinates must be present and valid (lat ∈ [-90,90], lng ∈ [-180,180])
 *  - the place must be within the destination radius (hotels/restaurants get a
 *    tighter default radius than attractions)
 *  - if the provider reports a country code, it must match the destination's
 *
 * @param {object} place — { coordinates:{lat,lng} } or { latitude, longitude }
 * @param {object|null} destinationInfo — from resolveDestination()
 * @param {object} opts — { category, radiusKm }
 */
export function validatePlaceForDestination(place, destinationInfo, { category = 'attraction', radiusKm } = {}) {
  if (!destinationInfo || !place) return { valid: true };
  const lat = place.coordinates?.lat ?? place.latitude;
  const lng = place.coordinates?.lng ?? place.longitude;

  if (lat == null || lng == null) return { valid: false, reason: 'missing-coordinates' };
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { valid: false, reason: 'invalid-coordinates' };
  }

  const dLat = destinationInfo.latitude;
  const dLng = destinationInfo.longitude;
  if (dLat != null && dLng != null && !Number.isNaN(dLat) && !Number.isNaN(dLng)) {
    const distKm = haversineKm(dLat, dLng, lat, lng);
    // Explicit radius wins; hotels/restaurants get a tighter default than
    // attractions; otherwise use the destination's own radius.
    const maxKm =
      radiusKm ||
      (category === 'hotel' || category === 'restaurant' ? 25 : destinationInfo.radiusKm || 40);
    if (distKm > maxKm) {
      return { valid: false, reason: 'outside-region', distanceKm: Math.round(distKm * 10) / 10 };
    }
  }

  const cc = String(place.countryCode || '').toLowerCase();
  const destCc = String(destinationInfo.countryCode || '').toLowerCase();
  if (cc && destCc && cc !== destCc) {
    return { valid: false, reason: 'country-mismatch', countryCode: cc };
  }

  return { valid: true };
}

/** Filter a list of places, dropping any that fail destination validation. */
export function filterPlacesForDestination(places, destinationInfo, opts = {}) {
  const kept = [];
  const rejected = [];
  for (const place of places || []) {
    const res = validatePlaceForDestination(place, destinationInfo, opts);
    if (res.valid) kept.push(place);
    else rejected.push({ place, reason: res });
  }
  return { kept, rejected };
}

// ══════════════════════════════════════════════════════════════════
//  CURATED DESTINATION ACCESSORS
// ══════════════════════════════════════════════════════════════════

/** Normalize one curated entry into the provider place shape used by the app. */
function normalizeCuratedPlace(entry, p, type, index) {
  const locality = entry.localityLabels?.[index % entry.localityLabels.length] || entry.name;
  const base = {
    placeId: `curated:${entry.name.toLowerCase()}:${type}:${index}`,
    name: p.name,
    address: p.address || `${p.name}, ${entry.name}, ${entry.state}`,
    coordinates: p.latitude != null && p.longitude != null ? { lat: p.latitude, lng: p.longitude } : null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    city: entry.name,
    state: entry.state,
    country: entry.country,
    countryCode: entry.countryCode,
    suburb: locality === entry.name ? '' : locality,
    rating: p.rating ?? null,
    userRatingsTotal: null,
    isLive: false,
    dataStatus: 'estimate',
    source: 'curated',
    distanceMeters: null,
  };

  if (type === 'hotels') {
    return {
      ...base,
      category: 'hotel',
      types: ['accommodation.hotel'],
      hotelCategory: p.category || 'Standard',
      price: { amount: p.pricePerNight, currency: 'INR' },
      pricePerNight: p.pricePerNight,
      amenities: p.amenities || [],
    };
  }
  if (type === 'restaurants' || type === 'cafes') {
    return {
      ...base,
      category: 'restaurant',
      types: ['catering.restaurant'],
      cuisine: p.cuisine || [],
      cuisines: p.cuisine || [],
      priceLevel: p.priceLevel ?? 1,
      averageCostPerPerson: p.averageCostPerPerson ?? null,
      averageCostForTwo: p.averageCostPerPerson ? p.averageCostPerPerson * 2 : null,
    };
  }
  // attractions
  return {
    ...base,
    category: 'attraction',
    types: p.types || ['tourism.attraction'],
    attractionCategory: p.category || '',
    entryFee: { amount: p.entryFee ?? 0, currency: 'INR', isEstimate: true, source: 'curated' },
    durationHours: p.durationHours ?? null,
    estimatedVisitHours: p.durationHours ?? null,
  };
}

/** Curated places of one type for a destination, normalized. */
export function curatedPlaces(destinationInfo, type = 'attractions') {
  const entry = destinationInfo?.curated;
  if (!entry) return [];
  const list = entry[type] || [];
  return list.map((p, i) => normalizeCuratedPlace(entry, p, type, i));
}

/** Pick the next unused curated place of a type (dedupe via `exclude` set). */
export function curatedPick(destinationInfo, type, { exclude = new Set() } = {}) {
  const places = curatedPlaces(destinationInfo, type);
  for (const p of places) {
    const key = (p.name || '').toLowerCase();
    if (!exclude.has(key)) {
      exclude.add(key);
      return p;
    }
  }
  return places.length ? places[0] : null;
}

export default {
  parseDestination,
  findCuratedDestination,
  getDestinationInfoSync,
  resolveDestination,
  validatePlaceForDestination,
  filterPlacesForDestination,
  curatedPlaces,
  curatedPick,
};