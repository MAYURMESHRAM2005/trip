import placesProvider from '../providers/places.provider.js';
import zomatoProvider from '../providers/zomato.provider.js';
import { curatedPlaces, filterPlacesForDestination } from '../services/destination.service.js';
import logger from '../utils/logger.js';

/**
 * Restaurant Agent: real Geoapify Places results constrained to the
 * destination, validated against it, with destination-specific curated
 * restaurants/cafes filling any gaps. No Gemini calls.
 */
class RestaurantAgent {
  constructor() {
    this.name = 'restaurant';
    this._systemPrompt = '';
  }

  get systemPrompt() { return this._systemPrompt; }
  set systemPrompt(v) { this._systemPrompt = v; }

  async run({ destination, foodPreference, destinationInfo }) {
    logger.entry('[AGENT:restaurant]', 'run', { destination, foodPreference, hasDestInfo: Boolean(destinationInfo) });
    const started = Date.now();

    // ── 1. Live search anchored at destination coords (never global text) ──
    let providerResult = null;
    if (destinationInfo?.latitude != null) {
      providerResult = await placesProvider.nearbySearch({
        lat: destinationInfo.latitude,
        lng: destinationInfo.longitude,
        type: 'restaurant',
        radius: 15000,
        limit: 20,
        countryCode: destinationInfo.countryCode,
        destinationInfo,
      });
    } else {
      providerResult = await placesProvider.textSearch({
        query: destinationInfo?.city || destination,
        type: 'restaurant',
        limit: 20,
        countryCode: destinationInfo?.countryCode,
        destinationInfo,
      });
    }

    let restaurants = providerResult?.isLive ? (providerResult.data || []) : [];

    // ── 2. Destination validation ──
    if (destinationInfo) {
      restaurants = filterPlacesForDestination(restaurants, destinationInfo, { category: 'restaurant' }).kept;
    }

    // ── 3. Curated fill — real destination restaurants + cafes ──
    const curated = [...curatedPlaces(destinationInfo, 'restaurants'), ...curatedPlaces(destinationInfo, 'cafes')];
    const seen = new Set(restaurants.map((r) => String(r.name || '').toLowerCase()).filter(Boolean));
    for (const c of curated) {
      if (seen.has(String(c.name || '').toLowerCase())) continue;
      restaurants.push(c);
      seen.add(String(c.name || '').toLowerCase());
      if (restaurants.length >= 20) break;
    }

    const usedCurated = restaurants.filter((r) => r.source === 'curated').length;
    const liveCount = restaurants.length - usedCurated;

    if (!restaurants.length) {
      return {
        agent: this.name,
        status: 'degraded',
        data: { restaurants: [], recommendations: [], isLive: false, message: 'No destination-specific restaurants available.' },
        message: 'No destination-specific restaurants available.',
        latencyMs: 0,
        usedAI: false,
        source: 'provider',
      };
    }

    // ── 4. Zomato real rating/cost enrichment (live places only) ──
    let withZomatoData = 0;
    try {
      const liveNames = restaurants.filter((r) => r.source !== 'curated').map((r) => r.name).filter(Boolean);
      const zomatoMap = await zomatoProvider.enrichRestaurants(destinationInfo?.city || destination, liveNames, { maxSearches: 5 });
      for (const r of restaurants) {
        if (r.source === 'curated') continue;
        const lowerName = (r.name || '').toLowerCase();
        const zomato = zomatoMap.get(lowerName);
        if (zomato) {
          if (zomato.rating != null) r.rating = zomato.rating;
          if (zomato.votes) r.reviewCount = zomato.votes;
          if (zomato.averageCostForTwo > 0) {
            r.averageCostForTwo = zomato.averageCostForTwo;
            r.averageCostPerPerson = zomato.averageCostPerPerson;
            r.priceRange = zomato.priceRange;
          }
          if (zomato.cuisines?.length) r.cuisines = zomato.cuisines;
          r.zomatoData = {
            rating: zomato.rating,
            votes: zomato.votes,
            ratingText: zomato.ratingText,
            averageCostForTwo: zomato.averageCostForTwo,
            averageCostPerPerson: zomato.averageCostPerPerson,
            priceRange: zomato.priceRange,
            cuisines: zomato.cuisines,
            phone: zomato.phone,
            menuUrl: zomato.menuUrl,
            fetchedAt: zomato.fetchedAt,
          };
          withZomatoData++;
        }
      }
      logger.info(`[AGENT:restaurant] Enriched ${withZomatoData}/${liveCount} live restaurants with Zomato data`);
    } catch (err) {
      logger.warn(`[AGENT:restaurant] Zomato enrichment failed: ${err.message}`);
    }

    // Deterministic: return restaurants directly, create simple recommendations
    const recommendations = restaurants.slice(0, 6).map((r) => ({
      name: r.name,
      rating: r.rating,
      priceLevel: r.priceLevel,
      priceRange: r.priceRange,
      averageCostPerPerson: r.averageCostPerPerson,
      cuisines: r.cuisines,
      address: r.address,
      types: r.types,
    }));

    logger.exit('[AGENT:restaurant]', 'run', { status: 'success', count: restaurants.length, live: liveCount, curated: usedCurated, withZomato: withZomatoData, latencyMs: Date.now() - started });
    return {
      agent: this.name,
      status: 'success',
      data: {
        restaurants,
        recommendations,
        isLive: liveCount > 0,
        mealPlan: [],
        notes: `Restaurant data from Geoapify (${liveCount} live, ${usedCurated} curated, ${withZomatoData} with Zomato real pricing)`,
        zomatoEnriched: withZomatoData,
      },
      message: `Restaurant data (${liveCount} live, ${usedCurated} curated, ${withZomatoData} with real pricing)`,
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

export default new RestaurantAgent();