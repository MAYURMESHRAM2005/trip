/**
 * pricing.service.js — centralized price fallback & normalization.
 *
 * Single source of truth for how a price is derived for every itinerary
 * item type. The flow is always:
 *
 *   live/API price  →  validated stored price  →  category-based estimate
 *
 * Live prices (Viator, Zomato, Amadeus, transport intelligence, Ticketmaster)
 * are NEVER replaced. Estimates are always flagged with isEstimate:true and
 * carry an estimateNote so the UI can label them "ESTIMATE" — a fallback is
 * never presented as live data.
 *
 * "Free" (amount ₹0) is ONLY produced when the data source explicitly
 * confirms free entry (e.g. a curated entryFee of 0 or a known-free category
 * like a beach/park). A missing price is NEVER rendered as Free — it always
 * receives a reasonable budget-aware estimate so the UI never shows "—"
 * or "Free" for something the system simply has no price for.
 *
 * Used by:
 *  - itinerary.service.js  (deterministic day-plan builder)
 *  - orchestratorAIPlanning.js (AI plan resolver)
 *  - trip.controller.js    (read-path backfill for legacy itineraries)
 */
import budgetService from './budget.service.js';

/** Meal cost per price level (Geoapify priceLevel 0-4), per person, INR. */
export const MEAL_PRICE_TIERS = { 0: 150, 1: 350, 2: 700, 3: 1400, 4: 2500 };

const NOW_ISO = new Date().toISOString();

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Small deterministic hash so same-name places always get the same price. */
function nameHash(name = '') {
  let h = 2166136261;
  for (let i = 0; i < String(name).length; i++) {
    h ^= String(name).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic per-restaurant variation (-span..+span, step 50) used when a
 * place has no priceLevel at all, so different restaurants never all get the
 * exact same estimate.
 */
function nameJitter(name, span = 100) {
  const h = nameHash(String(name || '').toLowerCase());
  return ((h % 5) - 2) * (span / 2);
}

/** Deterministic per-attraction fee variation (100 .. 300 INR). */
function feeVariation(name) {
  const h = nameHash(String(name || '').toLowerCase());
  return 100 + ((h % 5) * 50); // 100, 150, 200, 250, 300
}

/* ------------------------------------------------------------------ */
/*  Restaurant / meal estimates                                        */
/* ------------------------------------------------------------------ */

/**
 * Per-party meal cost for a restaurant.
 *  - Zomato real average cost when available (never an estimate)
 *  - curated destination average when available (estimate)
 *  - Geoapify priceLevel estimate otherwise (estimate), varied per place
 *    when no priceLevel exists.
 * Breakfast/lunch/dinner adjust the base so ranges stay sensible.
 */
export function restaurantMealCost(r, meal, partySize, currency, maxPerPerson) {
  const cur = currency || 'INR';
  const safeParty = Math.max(1, Number(partySize) || 1);

  // Cap the per-person amount so the estimate never blows up the budget.
  const cap = maxPerPerson != null ? Math.max(1, Math.round(maxPerPerson * 100) / 100) : null;

  // Real average cost from Zomato (not an estimate)
  if (r.zomatoData && r.zomatoData.averageCostPerPerson > 0) {
    let perPerson = r.zomatoData.averageCostPerPerson;
    if (meal === 'breakfast') perPerson = Math.max(80, Math.round(perPerson * 0.6));
    else if (meal === 'lunch') perPerson = Math.round(perPerson * 0.85);
    else if (meal === 'dinner') perPerson = Math.round(perPerson * 1.15);
    if (cap != null && perPerson > cap) perPerson = cap;
    const amount = Math.round(perPerson * safeParty * 100) / 100;
    return {
      amount,
      perPerson,
      currency: cur,
      isEstimate: false,
      estimateNote: `Real average cost from Zomato (${meal}) × ${safeParty} traveller(s) — ${r.zomatoData.ratingText || 'rated'} ${r.zomatoData.rating ?? ''} (${r.zomatoData.votes ?? 0} votes)`,
      source: 'zomato',
      fetchedAt: r.zomatoData.fetchedAt || NOW_ISO,
    };
  }

  // Curated destination average (real destination restaurant, estimated price)
  if (r.source === 'curated' && r.averageCostPerPerson > 0) {
    let perPerson = r.averageCostPerPerson;
    if (meal === 'breakfast') perPerson = Math.max(80, Math.round(perPerson * 0.6));
    else if (meal === 'lunch') perPerson = Math.round(perPerson * 0.85);
    else if (meal === 'dinner') perPerson = Math.round(perPerson * 1.15);
    if (cap != null && perPerson > cap) perPerson = cap;
    const amount = Math.round(perPerson * safeParty * 100) / 100;
    return {
      amount,
      perPerson,
      currency: cur,
      isEstimate: true,
      estimateNote: `Estimated curated average ~${cur} ${perPerson}/person × ${safeParty} traveller(s) (${meal}) — typical destination price, confirm locally.`,
      source: 'curated',
      fetchedAt: NOW_ISO,
    };
  }

  // Fallback: Geoapify priceLevel estimate (always marked as estimate).
  // Without a priceLevel, vary the base by restaurant name so prices differ.
  let base = MEAL_PRICE_TIERS[r.priceLevel ?? 1] ?? 350;
  if (r.priceLevel == null) {
    base = 350 + nameJitter(r.name, 200); // 250 .. 450
  }
  let perPerson = base;
  if (meal === 'breakfast') perPerson = Math.max(200, Math.round(base * 0.6));
  else if (meal === 'lunch') perPerson = Math.max(300, Math.round(base * 1.0));
  else if (meal === 'dinner') perPerson = Math.max(400, Math.round(base * 1.2));
  if (cap != null && perPerson > cap) perPerson = cap;
  const amount = Math.round(perPerson * safeParty * 100) / 100;
  return {
    amount,
    perPerson,
    currency: cur,
    isEstimate: true,
    estimateNote: `Estimated ~${cur} ${perPerson}/person × ${safeParty} traveller(s) based on restaurant price level ${r.priceLevel ?? 'unknown'}. Actual menu prices not available from provider.`,
    source: 'geoapify-pricelevel-estimate',
    fetchedAt: NOW_ISO,
  };
}

/* ------------------------------------------------------------------ */
/*  Attraction / activity / nightlife estimates                        */
/* ------------------------------------------------------------------ */

// Types that almost always charge an entry fee → estimated ticket price.
const PAID_ATTRACTION_RE = /museum|gallery|fort|palace|castle|zoo|aquarium|planetarium|observatory|stadium|arena|amusement.?park|theme.?park|water.?park|heritage/;
// Types that are genuinely free-entry (no ticket is the norm) → ₹0 Free.
const FREE_ATTRACTION_RE = /temple|church|mosque|gurdwara|cathedral|chapel|beach|viewpoint|lookout|lake|river|waterfall|park|garden|market|bazaar|square|plaza|promenade|waterfront|harbou?r|street|trail|scenic|hiking|walkway|boardwalk/;
const NIGHTLIFE_COVER_RE = /club|bar|pub|disco|brewery|party|lounge|casino/;

/**
 * Entry fee estimate for an attraction that has NO live/verified entry-fee
 * data. Geoapify does not provide entry fees, so these are estimates —
 * never presented as a real price.
 *
 * Free (₹0) is returned ONLY for categories that are genuinely free-entry
 * (temples, beaches, parks, markets, viewpoints…). Everything else receives
 * a positive estimated fee, because not having a price is NOT the same as
 * being free.
 */
export function entryFeeEstimateFor(attraction) {
  const name = String(attraction?.name || '').toLowerCase();
  const types = (attraction?.types || []).join(' ').toLowerCase();
  const haystack = `${name} ${types}`;

  if (PAID_ATTRACTION_RE.test(haystack)) {
    const fee = feeVariation(attraction?.name || '');
    return {
      amount: fee,
      isEstimate: true,
      estimateNote: `Estimated typical entry fee (~${fee}/person) — no live pricing available from provider. Confirm locally.`,
    };
  }
  if (FREE_ATTRACTION_RE.test(haystack)) {
    return {
      amount: 0,
      isEstimate: true,
      estimateNote: 'Free entry — typical for this type of place.',
    };
  }
  // Unknown category (statue, generic tourist_attraction, landmark…): we do
  // NOT know whether entry is free, so give a small reasonable estimate
  // instead of pretending it is free.
  const fee = feeVariation(attraction?.name || '');
  return {
    amount: fee,
    isEstimate: true,
    estimateNote: `Estimated entry fee (~${fee}/person) — no live pricing available from provider. Confirm locally.`,
  };
}

/**
 * Cost of an attraction/activity for the party.
 *  - Viator real pricing is used when present (never an estimate).
 *  - An explicitly-confirmed free entry (entryFee.amount === 0 with a source)
 *    renders ₹0 "Free".
 *  - Nightlife venues with cover charges get a cover estimate.
 *  - Otherwise a category-based estimate — a missing price is never Free.
 *  - maxPerPerson optionally caps the per-person estimate so the total stays
 *    inside the daily activities envelope.
 */
export function attractionCost(a, currency, partySize, maxPerPerson) {
  const cur = currency || 'INR';
  const safeParty = Math.max(1, Number(partySize) || 1);
  const cap = maxPerPerson != null ? Math.max(1, Math.round(maxPerPerson * 100) / 100) : null;

  // Known entry fee from data (Viator live pricing OR curated destination
  // fee) — never an estimate when the source says it is real.
  if (a.entryFee && typeof a.entryFee.amount === 'number' && a.entryFee.amount > 0) {
    const perPerson = a.entryFee.amount;
    const c = a.entryFee.currency || cur;
    const estimated = a.entryFee.isEstimate === true;
    return {
      amount: Math.round(perPerson * safeParty * 100) / 100,
      perPerson,
      currency: c,
      isEstimate: estimated,
      estimateNote: estimated
        ? `Estimated entry fee ~${perPerson}/person from destination data × ${safeParty} traveller(s)`
        : `Real price from Viator (${a.entryFee.productTitle || a.entryFee.source}) × ${safeParty} traveller(s)`,
      source: estimated ? 'curated' : 'viator',
      fetchedAt: a.entryFee.fetchedAt || NOW_ISO,
    };
  }

  // Explicitly confirmed free entry — a structured entryFee of exactly ₹0 is
  // the data model's way of encoding "free" (curated data, provider data).
  // Only a MISSING entryFee means the price is unknown (handled below).
  if (a.entryFee && typeof a.entryFee.amount === 'number' && a.entryFee.amount === 0) {
    return {
      amount: 0,
      perPerson: 0,
      currency: cur,
      isEstimate: a.entryFee.isEstimate !== false,
      estimateNote: 'Free entry — confirmed by destination data.',
      source: a.entryFee.source || 'data',
      fetchedAt: a.entryFee.fetchedAt || NOW_ISO,
    };
  }

  // Nightlife: clubs/bars usually charge a cover
  if ((a.types || []).join(' ').match(NIGHTLIFE_COVER_RE)) {
    const perPerson = 250;
    const amount = Math.round(perPerson * safeParty * 100) / 100;
    return {
      amount,
      perPerson,
      currency: cur,
      isEstimate: true,
      estimateNote: `Estimated cover charge ~${cur} ${perPerson}/person × ${safeParty} traveller(s) — confirm locally.`,
      source: 'estimate',
      fetchedAt: NOW_ISO,
    };
  }

  const fee = entryFeeEstimateFor(a);
  let perPerson = fee.amount;
  if (cap != null && perPerson > cap) perPerson = cap;
  return {
    amount: Math.round(perPerson * safeParty * 100) / 100,
    perPerson,
    currency: cur,
    isEstimate: true,
    estimateNote: perPerson ? `${fee.estimateNote} × ${safeParty} traveller(s)` : fee.estimateNote,
    source: 'estimate',
    fetchedAt: NOW_ISO,
  };
}

/* ------------------------------------------------------------------ */
/*  Local transport estimates                                          */
/* ------------------------------------------------------------------ */

/**
 * Estimated intra-day fare from the day's travel legs.
 * walking → ₹0 · taxi/auto → ~₹15/km (min ₹40) · bus/metro → flat ₹30/leg.
 * Returns 0 when every leg is walking / no data.
 */
export function localTransportLegEstimate(legs = []) {
  let total = 0;
  for (const leg of legs) {
    const km = Number(leg?.distanceKm) || 0;
    const method = String(leg?.method || 'walking').toLowerCase();
    if (/taxi|auto|rickshaw|uber|ola/.test(method)) total += Math.max(40, Math.round(km * 15));
    else if (/bus|metro|train/.test(method)) total += 30;
    // walking → ₹0
  }
  return Math.round(total);
}

/* ------------------------------------------------------------------ */
/*  Per-activity normalization (the central fallback)                  */
/* ------------------------------------------------------------------ */

/** Map a clock time to the meal it most likely represents. */
function mealFromTime(time) {
  const h = parseInt(String(time || '').split(':')[0], 10);
  if (Number.isNaN(h)) return 'dinner';
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  return 'dinner';
}

/**
 * Build the fallback estimate for an activity that has no usable price.
 * Returns a full cost object (amount may be 0 ONLY for genuinely free items)
 * or null when no estimate is applicable.
 */
function estimateForCategory(activity, ctx) {
  const partySize = ctx.partySize;
  const currency = ctx.currency;
  const category = activity.category || '';
  const title = String(activity.title || '');
  const place = String(activity.place || '');
  const slot = activity.slot || activity.period || '';
  const nameAndTitle = `${place} ${title}`;

  if (category === 'restaurant') {
    const meal = slot === 'breakfast' || slot === 'lunch' || slot === 'dinner'
      ? slot
      : mealFromTime(activity.time);
    return restaurantMealCost(
      { name: place || title, priceLevel: activity.priceLevel, source: activity.source },
      meal,
      partySize,
      currency,
      ctx.maxMealPerPerson
    );
  }

  if (category === 'attraction' || category === 'activity' || category === 'nightlife') {
    // Self-directed leisure / free-time rows are genuinely free.
    if (/leisure time|free time/i.test(title)) {
      return {
        amount: 0,
        perPerson: 0,
        currency,
        isEstimate: true,
        estimateNote: 'Free — self-guided leisure time.',
        source: 'none',
      };
    }
    return attractionCost(
      { name: nameAndTitle, types: activity.types || [category], entryFee: activity.entryFee },
      currency,
      partySize,
      ctx.maxActivityPerPerson
    );
  }

  if (category === 'hotel') {
    const nightly0 = ctx.hotelNightly > 0 ? ctx.hotelNightly : (ctx.hotelDaily > 0 ? ctx.hotelDaily : 1200);
    const nightly = ctx.maxHotelNightly > 0 ? Math.min(nightly0, ctx.maxHotelNightly) : nightly0;
    // Check-out is genuinely free — nothing to charge.
    if (/check[\s-]*out/i.test(title)) {
      return {
        amount: 0,
        perPerson: 0,
        currency,
        isEstimate: true,
        estimateNote: 'Checkout — no charge',
        source: 'none',
      };
    }
    // Check-in: display the nightly rate without charging it (the overnight
    // entry carries the charge), so day totals never double-count.
    if (/check[\s-]*in/i.test(title)) {
      return {
        amount: 0,
        perPerson: 0,
        currency,
        isEstimate: true,
        displayAmount: Math.round(nightly * 100) / 100,
        displaySuffix: '/ room/night',
        estimateNote: ctx.hotelNightly > 0
          ? 'Nightly rate — charged on the overnight entry'
          : 'Estimated nightly rate — no live hotel data',
        source: 'budget-estimate',
      };
    }
    // Overnight / stay / bare-name hotel row: charge nightly × rooms.
    const rooms = Math.max(1, Number(ctx.rooms) || 1);
    const charge = Math.round(nightly * rooms * 100) / 100;
    return {
      amount: charge,
      perPerson: Math.round((charge / partySize) * 100) / 100,
      currency,
      isEstimate: true,
      estimateNote: ctx.hotelNightly > 0
        ? `Estimated ${nightly}/room/night × ${rooms} room(s)`
        : 'Estimated nightly rate — no live hotel data',
      source: 'budget-estimate',
    };
  }

  if (category === 'transport' || category === 'flight' || category === 'train' || category === 'bus') {
    // Intra-day local hops vs intercity outbound/return legs.
    if (/local transport|transfers|intra.day|taxi|auto|metro/.test(nameAndTitle) && /local|transfer/i.test(title)) {
      const perDay = ctx.localTransportDaily > 0 ? ctx.localTransportDaily : 150;
      return {
        amount: Math.round(perDay * 100) / 100,
        perPerson: Math.round((perDay / partySize) * 100) / 100,
        currency,
        isEstimate: true,
        estimateNote: 'Estimated local fares for intra-day movement',
        source: 'budget-estimate',
      };
    }
    const est = ctx.outboundEstimate > 0 ? ctx.outboundEstimate : 1000;
    return {
      amount: Math.round(est * 100) / 100,
      perPerson: Math.round((est / partySize) * 100) / 100,
      currency,
      isEstimate: true,
      estimateNote: 'Estimated transport fare — no live pricing available from provider',
      source: 'budget-estimate',
    };
  }

  return null;
}

/**
 * Normalize one activity's cost. The canonical shape is:
 *   cost: { amount, currency, isEstimate, perPerson, estimateNote, source,
 *           displayAmount?, displaySuffix? }
 *  - a positive stored amount is ALWAYS preserved (never replace a live/real
 *    price with an estimate)
 *  - amount 0 / missing → category-based estimate; ₹0 (Free) is produced ONLY
 *    for genuinely free items (confirmed free entry, check-out)
 *  - displayAmount is a display-only price (e.g. nightly rate on the
 *    check-in row) that never contributes to day totals.
 *  - ctx supports budget caps: maxMealPerPerson, maxActivityPerPerson,
 *    maxHotelNightly, maxTravelCost — estimates are clamped so the plan stays
 *    inside the user's budget without touching live/verified prices.
 * Returns { changed } so callers can decide whether to persist.
 */
export function normalizeActivityCost(activity, ctx = {}) {
  const partySize = Math.max(1, Number(ctx.partySize) || 1);
  const currency = ctx.currency || 'INR';
  const cost = activity.cost || {};
  const raw = cost.amount;
  const amount = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  const isLiveFlag = activity.isLive === true || activity.dataStatus === 'live';
  let changed = false;

  const ensureShape = (c) => {
    if (typeof c.currency !== 'string') { c.currency = currency; changed = true; }
    if (typeof c.isEstimate !== 'boolean') { c.isEstimate = isLiveFlag ? false : true; changed = true; }
    if (typeof c.amount !== 'number' || !Number.isFinite(c.amount)) { c.amount = 0; changed = true; }
    if (c.amount > 0 && (c.perPerson == null || !Number.isFinite(c.perPerson))) {
      c.perPerson = round2(c.amount / partySize);
      changed = true;
    }
  };

  // 1. Existing positive price → preserve (never replace live/real prices).
  if (amount !== null && amount > 0) {
    ensureShape(cost);
    activity.cost = cost;
    return { changed };
  }

  // 2. Item explicitly removed/replaced by the budget optimizer stays zeroed
  //    (it is no longer part of the plan). "unavailable" is NOT enough — a
  //    missing price must receive an estimate, never a Free label.
  const notes = `${activity.notes || ''} ${cost.estimateNote || ''}`;
  const zeroedByOptimizer = /removed by budget|replaced with free alternative/i.test(notes);

  if (zeroedByOptimizer) {
    ensureShape(cost);
    activity.cost = cost;
    return { changed };
  }

  // 3. Category-based estimate (never leaves an applicable item unpriced).
  const est = estimateForCategory(activity, { ...ctx, partySize, currency });
  if (!est) {
    ensureShape(cost);
    activity.cost = cost;
    return { changed };
  }
  for (const [k, v] of Object.entries(est)) {
    if (cost[k] !== v) { cost[k] = v; changed = true; }
  }
  ensureShape(cost);
  activity.cost = cost;
  // Clamp LOCAL-transport estimates so they never exceed the daily local
  // transport envelope. Outbound/return legs are not clamped here — they are
  // already capped by the outbound estimate in estimateForCategory.
  const isLocalTransportRow = activity.category === 'transport'
    && /local transport|transfers|intra.day|taxi|auto|metro/i.test(`${activity.title || ''} ${activity.place || ''}`);
  if (isLocalTransportRow && est.source === 'budget-estimate') {
    const maxTravel = ctx.maxTravelCost != null ? Math.max(1, ctx.maxTravelCost) : null;
    if (maxTravel != null && cost.amount > maxTravel) {
      cost.amount = Math.round(maxTravel * 100) / 100;
      cost.perPerson = Math.round((cost.amount / partySize) * 100) / 100;
      cost.estimateNote = `Estimated transport fare (capped to fit daily transport budget)`;
      changed = true;
    }
  }
  return { changed };
}

/**
 * Normalize every activity across all days. Returns true when anything
 * changed so callers can persist. Day totals are NOT touched here — callers
 * recompute them (finalizeDayCosts / rebuildCosts) after normalization.
 */
export function normalizeItineraryPrices(days, ctx = {}) {
  let changed = false;
  for (const day of days || []) {
    for (const act of day.activities || []) {
      if (normalizeActivityCost(act, ctx).changed) changed = true;
    }
  }
  return changed;
}

export default {
  MEAL_PRICE_TIERS,
  restaurantMealCost,
  entryFeeEstimateFor,
  attractionCost,
  localTransportLegEstimate,
  normalizeActivityCost,
  normalizeItineraryPrices,
};