import hotelProvider from '../providers/hotel.provider.js';
import { curatedPlaces, validatePlaceForDestination } from '../services/destination.service.js';
import logger from '../utils/logger.js';

/**
 * Hotel Agent: real offers from Amadeus first, validated against the
 * destination; destination-specific curated hotels fill the gap when Amadeus
 * is unavailable or returns out-of-region/zero-price results. Curated hotels
 * carry estimated pricing and are never presented as live.
 */
class HotelAgent {
  constructor() {
    this.name = 'hotel';
    this._systemPrompt = '';
  }

  get systemPrompt() { return this._systemPrompt; }
  set systemPrompt(v) { this._systemPrompt = v; }

  async run({ destination, checkIn, checkOut, adults, rooms, maxPrice, totalBudget, hotelPreference, destinationInfo }) {
    logger.entry('[AGENT:hotel]', 'run', { destination, checkIn, checkOut, adults, rooms, maxPrice, hasDestInfo: Boolean(destinationInfo) });
    const started = Date.now();
    const providerResult = await hotelProvider.searchHotels({
      city: destinationInfo?.city || destination,
      checkIn,
      checkOut,
      adults,
      rooms: Math.max(1, Number(rooms) || 1),
      maxPrice,
      limit: 12,
    });

    // ── 1. Live Amadeus offers, validated against the destination ──
    let liveHotels = providerResult.isLive ? (providerResult.data || []) : [];
    if (destinationInfo?.latitude != null) {
      const kept = [];
      for (const h of liveHotels) {
        const res = validatePlaceForDestination(h, destinationInfo, { category: 'hotel' });
        // Keep hotels that pass, or that we cannot geolocate (no coords) — but
        // drop any that are clearly outside the destination region.
        if (res.valid || res.reason === 'missing-coordinates') kept.push(h);
        else logger.warn(`[AGENT:hotel] Rejected out-of-region hotel "${h.name}" (${res.reason}${res.distanceKm ? ` ${res.distanceKm}km` : ''})`);
      }
      liveHotels = kept;
    }

    // ── 2. Curated destination hotels fill the gap ──
    const curated = curatedPlaces(destinationInfo, 'hotels');
    const seen = new Set(liveHotels.map((h) => String(h.name || '').toLowerCase()).filter(Boolean));
    for (const c of curated) {
      if (seen.has(String(c.name || '').toLowerCase())) continue;
      liveHotels.push(c);
      seen.add(String(c.name || '').toLowerCase());
    }

    const hotels = liveHotels;
    const curatedCount = hotels.filter((h) => h.source === 'curated').length;
    const liveCount = hotels.length - curatedCount;
    const hasLive = liveCount > 0;

    // ── 3. Heuristic: best value = cheapest price that fits the budget ──
    let recommended = null;
    let alternatives = [];

    if (hotels.length > 0) {
      const withPrice = hotels.filter((h) => h.price?.amount);
      const withoutPrice = hotels.filter((h) => !h.price?.amount);

      const withinBudget = withPrice.filter(
        (h) => !maxPrice || h.price.amount <= maxPrice * 1.05
      );
      const overBudget = withPrice.filter(
        (h) => maxPrice && h.price.amount > maxPrice * 1.05
      );

      const sorted = [...withinBudget.sort((a, b) => a.price.amount - b.price.amount),
                       ...overBudget.sort((a, b) => a.price.amount - b.price.amount),
                       ...withoutPrice];

      recommended = sorted[0] || null;
      alternatives = sorted.slice(1, 4);

      if (hotelPreference && recommended) {
        const prefMatch = sorted.find(
          (h) => h.name?.toLowerCase().includes(hotelPreference.toLowerCase())
        );
        if (prefMatch) recommended = prefMatch;
      }
    }

    if (!recommended && hotels.length) recommended = hotels[0];

    logger.exit('[AGENT:hotel]', 'run', { status: 'success', hotelCount: hotels.length, live: liveCount, curated: curatedCount, recommended: recommended?.name || 'none', latencyMs: Date.now() - started });
    return {
      agent: this.name,
      status: 'success',
      data: {
        hotels,
        recommended,
        alternatives,
        isLive: hasLive,
        source: hasLive ? 'amadeus-hotels' : 'curated',
        message: hasLive
          ? providerResult.message
          : `Live hotel data unavailable or out-of-region — using ${curatedCount} curated destination hotel(s) with estimated pricing.`,
      },
      message: `Hotel data (${liveCount} live, ${curatedCount} curated, ${recommended?.name || 'none'} recommended)`,
      latencyMs: Date.now() - started,
      usedAI: false,
      source: 'provider',
    };
  }

  report(result) {
    return {
      agent: this.name,
      status: result.status,
      message: result.message,
      latencyMs: result.latencyMs,
      usedAI: result.usedAI,
    };
  }
}

export default new HotelAgent();