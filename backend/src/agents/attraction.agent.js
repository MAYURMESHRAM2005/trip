import placesProvider from '../providers/places.provider.js';
import viatorProvider from '../providers/viator.provider.js';
import { curatedPlaces, filterPlacesForDestination } from '../services/destination.service.js';
import logger from '../utils/logger.js';

/**
 * Attraction Agent: real Places attractions from Geoapify, constrained to the
 * destination. Results are validated against the destination (country + radius)
 * BEFORE they reach the itinerary, and destination-specific curated attractions
 * fill any gaps so the itinerary is never empty or globally wrong.
 * Now purely provider-based — no Gemini calls.
 */
class AttractionAgent {
  constructor() {
    this.name = 'attraction';
    this._systemPrompt = '';
  }

  get systemPrompt() { return this._systemPrompt; }
  set systemPrompt(v) { this._systemPrompt = v; }

  async run({ destination, interests, activityLevel, destinationInfo }) {
    logger.entry('[AGENT:attraction]', 'run', { destination, interests, activityLevel, hasDestInfo: Boolean(destinationInfo) });
    const started = Date.now();

    // ── 1. Live search anchored at destination coords (never global text) ──
    let providerResult = null;
    if (destinationInfo?.latitude != null) {
      providerResult = await placesProvider.nearbySearch({
        lat: destinationInfo.latitude,
        lng: destinationInfo.longitude,
        type: 'tourist_attraction',
        radius: 30000,
        limit: 30,
        countryCode: destinationInfo.countryCode,
        destinationInfo,
      });
    } else {
      providerResult = await placesProvider.textSearch({
        query: destinationInfo?.city || destination,
        type: 'tourist_attraction',
        limit: 30,
        countryCode: destinationInfo?.countryCode,
        destinationInfo,
      });
    }

    let attractions = providerResult?.isLive ? (providerResult.data || []) : [];

    // ── 2. Destination validation (belt-and-braces — providers validated too) ──
    if (destinationInfo) {
      attractions = filterPlacesForDestination(attractions, destinationInfo, { category: 'attraction' }).kept;
    }

    // ── 3. Curated fill — real destination places when live data is thin ──
    const curated = curatedPlaces(destinationInfo, 'attractions');
    const seen = new Set(attractions.map((a) => String(a.name || '').toLowerCase()).filter(Boolean));
    for (const c of curated) {
      if (seen.has(String(c.name || '').toLowerCase())) continue;
      attractions.push(c);
      seen.add(String(c.name || '').toLowerCase());
      if (attractions.length >= 30) break;
    }

    const usedCurated = attractions.filter((a) => a.source === 'curated').length;

    if (!attractions.length) {
      return {
        agent: this.name,
        status: 'degraded',
        data: { attractions: [], isLive: false, message: 'No destination-specific attractions available.' },
        message: 'No destination-specific attractions available.',
        latencyMs: 0,
        usedAI: false,
        source: 'provider',
      };
    }

    // ── 4. Opening hours enrichment (live places only) ──
    const livePlaces = attractions.filter((a) => a.source !== 'curated');
    const placeIds = livePlaces.map((a) => a.placeId).filter(Boolean);
    if (placeIds.length > 0) {
      try {
        const detailsMap = await placesProvider.batchPlaceDetails(placeIds, { concurrency: 8 });
        for (const attr of attractions) {
          const details = detailsMap.get(attr.placeId);
          if (details?.openingHours) {
            attr.openingHours = details.openingHours;
            attr.openingHoursRaw = details.openingHoursRaw;
          }
        }
      } catch (err) {
        logger.warn(`[AGENT:attraction] Failed to fetch opening hours: ${err.message}`);
      }
    }

    // ── 5. Viator real pricing enrichment (live places only) ──
    let withViatorPricing = 0;
    try {
      const attractionNames = livePlaces.map((a) => a.name).filter(Boolean);
      const viatorMap = await viatorProvider.enrichAttractionsWithPricing(
        destinationInfo?.city || destination,
        attractionNames,
        'INR',
        { maxPerAttraction: 2, maxTotal: 8 },
      );
      for (const attr of attractions) {
        if (attr.source === 'curated') continue; // curated entry fees are estimates
        const lowerName = (attr.name || '').toLowerCase();
        const viatorProducts = viatorMap.get(lowerName);
        if (viatorProducts?.length) {
          const withPrice = viatorProducts.filter((p) => p.fromPrice?.amount > 0);
          const cheapest = withPrice.sort((a, b) => a.fromPrice.amount - b.fromPrice.amount)[0];
          if (cheapest) {
            attr.entryFee = {
              amount: cheapest.fromPrice.amount,
              currency: cheapest.fromPrice.currency || 'INR',
              isEstimate: false,
              source: 'viator',
              productCode: cheapest.productCode,
              productTitle: cheapest.title,
              fetchedAt: cheapest.fetchedAt,
            };
            attr.viatorPricing = viatorProducts.map((p) => ({
              productCode: p.productCode,
              title: p.title,
              fromPrice: p.fromPrice,
              rating: p.rating,
              reviewCount: p.reviewCount,
              duration: p.duration,
              url: `https://www.viator.com/tours/${p.productCode}`,
            }));
            withViatorPricing++;
          }
        }
      }
    } catch (err) {
      logger.warn(`[AGENT:attraction] Viator pricing enrichment failed: ${err.message}`);
    }

    logger.exit('[AGENT:attraction]', 'run', { status: 'success', count: attractions.length, curated: usedCurated, latencyMs: Date.now() - started });

    return {
      agent: this.name,
      status: 'success',
      data: {
        attractions,
        isLive: livePlaces.length > 0,
        dailyPlan: [],
        notes: `Attraction data from Geoapify (${livePlaces.length} live, ${usedCurated} curated, ${withViatorPricing} with Viator pricing)`,
        viatorEnriched: withViatorPricing,
      },
      message: `Attraction data (${livePlaces.length} live, ${usedCurated} curated, ${withViatorPricing} with real pricing)`,
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

export default new AttractionAgent();