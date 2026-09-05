import geminiService from './gemini.service.js';
import groqService from './groq.service.js';
import env from '../config/env.js';

/**
 * Itinerary Generator Service — AI PLANNER MODE
 *
 * The AI acts purely as a PLANNER and SELECTOR:
 *   - Receives a verified candidate dataset from real APIs
 *   - Selects and arranges candidates into a personalized itinerary
 *   - Returns ONLY lightweight planning decisions:
 *     { provider, providerId, type, startTime, endTime, reason }
 *   - NEVER returns prices, coordinates, ratings, opening hours, etc.
 *
 * The backend resolves all factual data against the candidate dataset.
 *
 * Architecture:
 *   AI returns planning decisions → Backend resolves provider IDs →
 *   Backend populates factual fields → Deterministic validation →
 *   Replan if invalid
 */

const GEMINI_TIMEOUT_MS = env.GEMINI_TIMEOUT_MS || 45000;
const GROQ_TIMEOUT_MS = env.GROQ_TIMEOUT_MS || 60000;

// Hard wall-clock budget for ONE generateItinerary() attempt. Kept below the
// client/HTTP request timeout (frontend axios: 60s) so a slow or hanging model
// can never make the whole request time out.
const AI_PLAN_TIMEOUT_MS = env.AI_PLAN_TIMEOUT_MS || 45000;
// Gemini runs alone for at most this long. If it has not returned a VALID plan
// by then, Groq is requested directly (no waiting for Gemini to fail) and the
// first valid plan wins — so the itinerary still completes on time.
const AI_PLAN_GEMINI_LEAD_MS = Math.max(
  5000,
  Math.min(env.AI_PLAN_GEMINI_LEAD_MS || 15000, AI_PLAN_TIMEOUT_MS - 10000)
);

let geminiRequestCount = 0;

// ══════════════════════════════════════════════════════════════════════
//  SANITIZATION
// ══════════════════════════════════════════════════════════════════════

function sanitizeItinerary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.itinerary || raw.days) return raw;
  if (typeof raw === 'string') {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]); } catch { return null; }
    }
    return null;
  }
  return raw;
}

// ══════════════════════════════════════════════════════════════════════
//  SCHEMA VALIDATION — Lightweight planner output
// ══════════════════════════════════════════════════════════════════════

/**
 * Validate the AI planner response.
 * Expected format:
 * {
 *   "days": [
 *     {
 *       "date": "YYYY-MM-DD",
 *       "theme": "...",
 *       "items": [
 *         {
 *           "type": "attraction|restaurant|hotel|event|transport|nightlife",
 *           "provider": "geoapify|amadeus|ticketmaster|transport-intelligence",
 *           "providerId": "exact id from candidate dataset",
 *           "startTime": "HH:MM",
 *           "endTime": "HH:MM",
 *           "reason": "why this candidate was selected"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
function validatePlannerSchema(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }

  const root = raw;

  if (!Array.isArray(root.days)) {
    return { valid: false, errors: ['days is not an array'] };
  }
  if (root.days.length === 0) {
    return { valid: false, errors: ['days is empty'] };
  }

  const VALID_TYPES = new Set(['attraction', 'restaurant', 'hotel', 'event', 'transport', 'nightlife', 'activity', 'flight', 'train', 'bus']);
  const VALID_PROVIDERS = new Set(['geoapify', 'amadeus', 'ticketmaster', 'transport-intelligence']);

  for (let di = 0; di < root.days.length; di++) {
    const day = root.days[di];
    const dayLabel = `days[${di}]`;

    if (typeof day.date !== 'string' || !day.date.trim()) {
      errors.push(`${dayLabel}.date is missing or empty`);
    }
    if (typeof day.theme !== 'string' || !day.theme.trim()) {
      errors.push(`${dayLabel}.theme is missing or empty`);
    }
    if (!Array.isArray(day.items)) {
      errors.push(`${dayLabel}.items is not an array`);
      continue;
    }
    if (day.items.length === 0) {
      errors.push(`${dayLabel}.items is empty`);
    }

    for (let ii = 0; ii < day.items.length; ii++) {
      const item = day.items[ii];
      const itemLabel = `${dayLabel}.items[${ii}]`;

      // type is required
      if (!item.type || !VALID_TYPES.has(item.type)) {
        errors.push(`${itemLabel}.type "${item.type}" is not valid (expected one of: ${[...VALID_TYPES].join(', ')})`);
      }

      // provider is required
      if (!item.provider || !VALID_PROVIDERS.has(item.provider)) {
        errors.push(`${itemLabel}.provider "${item.provider}" is not valid (expected one of: ${[...VALID_PROVIDERS].join(', ')})`);
      }

      // providerId is required
      if (typeof item.providerId !== 'string' || !item.providerId.trim()) {
        errors.push(`${itemLabel}.providerId is missing or empty`);
      }

      // startTime is required
      if (typeof item.startTime !== 'string' || !/^\d{2}:\d{2}$/.test(item.startTime)) {
        errors.push(`${itemLabel}.startTime must be HH:MM format`);
      }

      // endTime is required
      if (typeof item.endTime !== 'string' || !/^\d{2}:\d{2}$/.test(item.endTime)) {
        errors.push(`${itemLabel}.endTime must be HH:MM format`);
      }

      // reason is required
      if (typeof item.reason !== 'string' || !item.reason.trim()) {
        errors.push(`${itemLabel}.reason is missing or empty`);
      }

      // Validate startTime < endTime
      if (item.startTime && item.endTime && item.startTime >= item.endTime) {
        errors.push(`${itemLabel}.startTime (${item.startTime}) must be before endTime (${item.endTime})`);
      }

      // No factual fields should be present
      const FORBIDDEN_FIELDS = ['price', 'cost', 'coordinates', 'rating', 'openingHours', 'availability', 'bookingUrl', 'imageUrl', 'duration', 'address'];
      for (const field of FORBIDDEN_FIELDS) {
        if (item[field] !== undefined) {
          errors.push(`${itemLabel}.${field} should not be present — backend resolves this from the candidate dataset`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: root, errors: [] };
}

// ══════════════════════════════════════════════════════════════════════
//  CONTEXT BUILDERS
// ══════════════════════════════════════════════════════════════════════

/**
 * Build the context for the AI planner.
 * Passes a flat, referenceable candidate list with just enough info
 * for the AI to make selection decisions.
 */
function buildPlannerContext(data) {
  const {
    userPreferences = {},
    destination,
    origin,
    startDate,
    endDate,
    travelers = {},
    totalBudget,
    currency = 'INR',
    daysCount = 1,
    nightsCount = 0,
    attractions = [],
    restaurants = [],
    nightlife = [],
    weather = {},
    accommodation = {},
    transport = {},
    events = null,
    guide = {},
    safety = {},
    budgetAllocation = {},
    replanErrors = undefined,
    previousPlan = undefined,
  } = data;

  // Build candidate list — the AI selects from this list ONLY
  const candidates = [];

  // Attractions
  for (const a of (attractions || []).slice(0, 15)) {
    candidates.push({
      id: `geoapify:${a.placeId || a.name}`,
      provider: 'geoapify',
      providerId: a.placeId || a.name,
      type: 'attraction',
      name: a.name || '',
      tags: (a.types || []).join(', '),
      rating: a.rating ?? null,
      priceLevel: a.priceLevel ?? null,
      address: a.address || '',
      suburb: a.suburb || a.district || '',
      hasEntryFee: Boolean(a.entryFee?.amount > 0),
      hasOpeningHours: Boolean(a.openingHours?.periods?.length),
      estimatedVisitHours: a.estimatedVisitHours || null,
    });
  }

  // Restaurants
  for (const r of (restaurants || []).slice(0, 12)) {
    candidates.push({
      id: `geoapify:${r.placeId || r.name}`,
      provider: 'geoapify',
      providerId: r.placeId || r.name,
      type: 'restaurant',
      name: r.name || '',
      tags: (r.cuisines || r.types || []).join(', '),
      rating: r.rating ?? null,
      priceLevel: r.priceLevel ?? null,
      address: r.address || '',
      suburb: r.suburb || '',
      hasZomatoData: Boolean(r.zomatoData?.averageCostPerPerson),
      averageCostPerPerson: r.averageCostPerPerson || r.zomatoData?.averageCostPerPerson || null,
    });
  }

  // Nightlife
  for (const n of (nightlife || []).slice(0, 8)) {
    candidates.push({
      id: `geoapify:${n.placeId || n.name}`,
      provider: 'geoapify',
      providerId: n.placeId || n.name,
      type: 'nightlife',
      name: n.name || '',
      tags: (n.types || []).join(', '),
      address: n.address || '',
    });
  }

  // Hotels
  const hotelRec = accommodation?.data?.recommended;
  if (hotelRec) {
    candidates.push({
      id: `amadeus:${hotelRec.name}`,
      provider: 'amadeus',
      providerId: hotelRec.name || 'recommended-hotel',
      type: 'hotel',
      name: hotelRec.name || '',
      tags: hotelRec.amenities?.join(', ') || '',
      rating: hotelRec.rating ?? null,
      pricePerNight: hotelRec.price?.amount ?? null,
      address: hotelRec.address || '',
    });
  }
  for (const h of (accommodation?.data?.hotels || []).slice(0, 5)) {
    if (h.name === hotelRec?.name) continue;
    candidates.push({
      id: `amadeus:${h.name}`,
      provider: 'amadeus',
      providerId: h.name,
      type: 'hotel',
      name: h.name || '',
      tags: h.amenities?.join(', ') || '',
      rating: h.rating ?? null,
      pricePerNight: h.price?.amount ?? null,
      address: h.address || '',
    });
  }

  // Transport
  const transportSel = transport?.data?.selected;
  if (transportSel) {
    candidates.push({
      id: `transport:${transport.mode}:${transportSel.airline || transportSel.trainName || transportSel.operator || 'selected'}`,
      provider: 'transport-intelligence',
      providerId: transportSel.flightNumber || transportSel.trainNumber || transportSel.operator || 'selected',
      type: transport.mode || 'transport',
      name: `${transportSel.airline || ''} ${transportSel.flightNumber || ''} ${transportSel.trainName || ''} ${transportSel.operator || ''}`.trim(),
      departure: transportSel.departAt || transportSel.departure || '',
      arrival: transportSel.arriveAt || transportSel.arrival || '',
      duration: transportSel.duration || '',
      price: transportSel.price?.amount ?? null,
    });
  }
  for (const offer of (transport?.data?.offers || []).slice(0, 4)) {
    candidates.push({
      id: `transport:${offer.mode || transport?.mode}:${offer.airline || offer.trainName || offer.operator || 'alt'}`,
      provider: 'transport-intelligence',
      providerId: offer.flightNumber || offer.trainNumber || offer.operator || `alt-${candidates.length}`,
      type: offer.mode || transport?.mode || 'transport',
      name: `${offer.airline || ''} ${offer.trainName || ''} ${offer.operator || ''}`.trim(),
      departure: offer.departAt || offer.departure || '',
      arrival: offer.arriveAt || offer.arrival || '',
      duration: offer.duration || '',
      price: offer.price?.amount ?? null,
    });
  }

  // Events
  for (const e of (events?.events || events?.data?.events || []).slice(0, 10)) {
    candidates.push({
      id: `ticketmaster:${e.id || e.name}`,
      provider: 'ticketmaster',
      providerId: e.id || e.name,
      type: 'event',
      name: e.name || '',
      tags: `${e.category || ''} ${e.genre || ''}`.trim(),
      eventDate: e.date || '',
      eventTime: e.time || '',
      venue: e.venueName || '',
      isFree: e.isFree || false,
    });
  }

  // Weather summary
  const weatherSummary = {
    available: weather?.data?.provider === 'live',
    forecast: (weather?.data?.forecast || []).slice(0, daysCount).map(f => ({
      date: f.date,
      condition: f.condition || '',
      rainProbability: f.rainProbability ?? null,
      tempMin: f.tempMin ?? null,
      tempMax: f.tempMax ?? null,
    })),
  };

  // Replanning context — enriched errors with alternatives
  let replanSection = '';
  if (replanErrors && replanErrors.length > 0) {
    const formattedErrors = replanErrors.map(err => {
      const errObj = typeof err === 'string' ? { type: 'UNKNOWN', message: err } : err;
      const parts = [`  Type: ${errObj.type || 'UNKNOWN'}`];
      if (errObj.day != null) parts.push(`  Day: ${errObj.day}`);
      if (errObj.providerId) parts.push(`  Provider: ${errObj.provider || 'unknown'} / ID: ${errObj.providerId}`);
      parts.push(`  Error: ${errObj.message || 'Unknown error'}`);
      if (errObj.availableAlternatives && errObj.availableAlternatives.length > 0) {
        parts.push(`  Available alternatives (${errObj.availableAlternatives.length}):`);
        for (const alt of errObj.availableAlternatives.slice(0, 5)) {
          parts.push(`    - provider: ${alt.provider}, providerId: ${alt.providerId}, name: ${alt.name}, rating: ${alt.rating ?? 'N/A'}, price: ${alt.price ?? 'N/A'}, suburb: ${alt.suburb || 'N/A'}`);
        }
      }
      return parts.join('\n');
    });

    replanSection = `\n═══ PREVIOUS PLAN FAILED VALIDATION — FIX THESE ERRORS ═══\nEach error below includes AVAILABLE ALTERNATIVES you can choose from.\nReplace the invalid item with one of the listed alternatives.\n\n${formattedErrors.join('\n\n')}\n\nRULES FOR FIXING:\n- Replace any item in DUPLICATE errors with a DIFFERENT candidate from its availableAlternatives or the CANDIDATES list\n- Replace any item in PROVIDER_ID_NOT_FOUND with a VALID candidate from its availableAlternatives or the CANDIDATES list\n- Fix OPENING_HOURS errors by choosing a different time or using an alternative candidate\n- Fix BUDGET errors by selecting cheaper candidates from the availableAlternatives\n- Fix OVERLAP errors by adjusting start/end times or choosing alternatives\n- Fix MEAL_TIMING errors by selecting restaurants with appropriate meal slots\n- Never re-use candidates that caused errors\n- Each replacement MUST use the candidate's exact provider and providerId from the list\n`;
  }

  let previousPlanSection = '';
  if (previousPlan?.days) {
    previousPlanSection = `\n═══ PREVIOUS PLAN (reference — do NOT repeat its errors) ═══\n${JSON.stringify(previousPlan.days.map(d => ({
      date: d.date,
      theme: d.theme,
      items: (d.items || []).map(i => ({
        type: i.type, provider: i.provider, providerId: i.providerId,
        startTime: i.startTime, endTime: i.endTime,
      })),
    })), null, 2)}\n`;
  }

  return {
    trip: {
      origin: origin || '',
      destination,
      startDate,
      endDate,
      daysCount,
      nightsCount,
      travelers: {
        adults: travelers.adults || 1,
        children: travelers.children || 0,
      },
      travelStyle: userPreferences.travelStyle || 'standard',
      activityLevel: userPreferences.activityLevel || 'moderate',
      interests: (userPreferences.interests || []).slice(0, 8),
      foodPreference: userPreferences.foodPreference || '',
      hotelPreference: userPreferences.hotelPreference || '',
      transportPreference: userPreferences.transportPreference || '',
      accessibility: (userPreferences.accessibility || []).slice(0, 4),
      familyWithKids: userPreferences.familyWithKids || false,
    },
    budget: {
      totalBudget,
      currency,
      allocation: {
        transport: budgetAllocation.transport?.amount || 0,
        hotels: budgetAllocation.hotels?.amount || 0,
        food: budgetAllocation.food?.amount || 0,
        activities: budgetAllocation.activities?.amount || 0,
      },
    },
    candidates,
    weather: weatherSummary,
    guide: {
      localTips: (guide.localTips || []).slice(0, 6),
      etiquette: (guide.etiquette || []).slice(0, 4),
    },
    safety: {
      safetyTips: (safety.safetyTips || []).slice(0, 4),
    },
    _replanSection: replanSection,
    _previousPlanSection: previousPlanSection,
  };
}

// ══════════════════════════════════════════════════════════════════════
//  MAIN GENERATION FUNCTION
// ══════════════════════════════════════════════════════════════════════

/**
 * Validate and prepare the AI planner response.
 */
function validateAndPrepare(raw, context) {
  const sanitized = sanitizeItinerary(raw);
  if (!sanitized) {
    return { valid: false, itinerary: null, errors: ['Response could not be sanitized'] };
  }
  const validation = validatePlannerSchema(sanitized);
  if (!validation.valid) {
    return { valid: false, itinerary: null, errors: validation.errors };
  }
  return { valid: true, itinerary: validation.data, errors: [] };
}

/**
 * Validate a single LLM call result against the planner schema.
 * Never throws — always returns { ok } so callers can race providers safely.
 */
function validateLLMResult(result, context, providerName) {
  if (!result || !result.success || !result.data) {
    return { ok: false, error: result?.message || `${providerName} request failed` };
  }
  const checked = validateAndPrepare(result.data, context);
  if (!checked.valid) {
    return {
      ok: false,
      error: `${providerName} returned invalid plan: ${checked.errors[0]}`,
      validationErrors: checked.errors,
    };
  }
  return { ok: true, checked };
}

/**
 * Generate a personalized itinerary plan from complete travel context.
 * The AI returns ONLY planning decisions (provider references + time slots).
 * The backend resolves all factual data from the candidate dataset.
 *
 * Tries Gemini FIRST as the primary. If Gemini fails or exceeds its lead time
 * window, Groq is requested DIRECTLY and the first VALID plan from either
 * provider wins — the itinerary is produced before the request time limit
 * instead of dying on Gemini's timeout.
 *
 * @param {object} data - Complete aggregated travel context
 *   @param {number} [data.deadlineMs] - Optional wall-clock deadline (epoch ms)
 *     from the calling pipeline so replan attempts share one time budget
 * @returns {{ success, itinerary, provider, fallbackUsed, error, geminiRequestCount, latencyMs, validationErrors }}
 */
export async function generateItinerary(data) {
  const started = Date.now();
  const requestNumber = ++geminiRequestCount;
  const userId = data.userId || null;

  console.log(`[itineraryGenerator] Request #${requestNumber} starting at ${new Date().toISOString()}`);

  // 1. Build planner context (flat candidate list + constraints)
  const context = buildPlannerContext(data);

  // 2. Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(context);

  // ── Time budget for this attempt ─────────────────────────────────────
  // Must finish before the earliest of our own cap (AI_PLAN_TIMEOUT_MS) and
  // the caller's pipeline deadline, so a slow/hanging model can never push
  // the HTTP request past its time limit.
  const callerDeadlineMs = Number.isFinite(data.deadlineMs) ? Number(data.deadlineMs) : Infinity;
  const deadlineAt = Math.min(Date.now() + AI_PLAN_TIMEOUT_MS, callerDeadlineMs);
  const attemptBudgetMs = Math.max(8000, deadlineAt - Date.now());
  // Gemini runs alone for at most geminiLeadMs. When that elapses (or Gemini
  // fails), Groq is requested DIRECTLY so it keeps generating the itinerary.
  const geminiLeadMs = Math.max(5000, Math.min(AI_PLAN_GEMINI_LEAD_MS, attemptBudgetMs - 10000));

  const baseCall = {
    prompt: userPrompt,
    system: systemPrompt,
    agent: 'itinerary-generator',
    action: 'generateItinerary',
    userId,
  };

  // 3. STEP 1: Try Gemini (primary) — but only for its lead window.
  console.log('[AI] Trying Gemini');
  const geminiStarted = Date.now();
  const geminiPromise = callLLMWithTimeout({
    ...baseCall,
    service: geminiService,
    timeoutMs: geminiLeadMs,
    providerName: 'Gemini',
  });

  // Memoized, validated outcome for Gemini (never throws).
  const geminiChecked = (async () => {
    const res = await geminiPromise;
    return validateLLMResult(res, context, 'Gemini');
  })();
  const geminiLeadExpired = new Promise((resolve) => setTimeout(resolve, geminiLeadMs));

  // Groq is memoized — only started once Gemini fails or exceeds its lead.
  let groqPromise = null;
  const startGroq = () => {
    if (!groqPromise) {
      const remainingMs = Math.max(10000, deadlineAt - Date.now());
      console.log(`[AI] Gemini time limit exceeded — requesting Groq directly (${remainingMs}ms left)`);
      groqPromise = callLLMWithTimeout({
        ...baseCall,
        service: groqService,
        timeoutMs: Math.min(GROQ_TIMEOUT_MS, remainingMs),
        providerName: 'Groq',
      });
    }
    return groqPromise;
  };

  const buildSuccess = ({ source, checked, fallbackUsed }) => ({
    success: true,
    itinerary: checked.itinerary,
    provider: source,
    fallbackUsed,
    error: null,
    geminiRequestCount: requestNumber,
    latencyMs: Date.now() - started,
    validationErrors: [],
  });

  const early = await Promise.race([
    geminiChecked.then((v) => ({ kind: 'gemini', ...v })),
    geminiLeadExpired.then(() => ({ kind: 'gemini-lead-expired' })),
  ]);

  // Gemini returned a VALID plan inside its lead window → done, no Groq call.
  if (early.kind === 'gemini' && early.ok) {
    console.log(`[AI] Gemini success (${Date.now() - geminiStarted}ms)`);
    return buildSuccess({ source: 'gemini', checked: early.checked, fallbackUsed: false });
  }

  const geminiError = early.kind === 'gemini'
    ? (early.error || 'Gemini request failed')
    : `Gemini exceeded ${geminiLeadMs}ms time limit`;
  if (early.kind === 'gemini') {
    console.warn(`[AI] Gemini failed: ${geminiError}`);
  } else {
    console.warn(`[AI] Gemini time limit (${geminiLeadMs}ms) exceeded`);
  }

  // 4. STEP 2: Gemini failed/timed out → request Groq DIRECTLY. Gemini may
  //    still be generating in the background — the first VALID plan wins, so
  //    Groq carries the itinerary to completion before the request deadline.
  console.log('[AI] Falling back to Groq');
  const groqStarted = Date.now();
  const groqChecked = (async () => {
    const res = await startGroq();
    return validateLLMResult(res, context, 'Groq');
  })();

  const geminiStillPending = early.kind === 'gemini-lead-expired';
  const firstSettled = await Promise.race([
    groqChecked.then((v) => ({ source: 'groq', ...v })),
    ...(geminiStillPending ? [geminiChecked.then((v) => ({ source: 'gemini', ...v }))] : []),
  ]);

  if (firstSettled.ok) {
    if (firstSettled.source === 'groq') {
      console.log(`[AI] Groq success (${Date.now() - groqStarted}ms)`);
    } else {
      console.log(`[AI] Gemini success (${Date.now() - geminiStarted}ms) after handover`);
    }
    return buildSuccess({ source: firstSettled.source, checked: firstSettled.checked, fallbackUsed: true });
  }

  // The provider that settled first was invalid/errored — wait for the other.
  const secondPromise = firstSettled.source === 'groq'
    ? (geminiStillPending ? geminiChecked.then((v) => ({ source: 'gemini', ...v })) : null)
    : groqChecked.then((v) => ({ source: 'groq', ...v }));
  const secondSettled = secondPromise ? await secondPromise : null;
  if (secondSettled && secondSettled.ok) {
    console.log(`[AI] ${secondSettled.source} success (${Date.now() - (secondSettled.source === 'groq' ? groqStarted : geminiStarted)}ms) after handover`);
    return buildSuccess({ source: secondSettled.source, checked: secondSettled.checked, fallbackUsed: true });
  }

  const totalLatencyMs = Date.now() - started;
  const groqError = [firstSettled, secondSettled].find((r) => r && r.source === 'groq')?.error || 'Groq request failed';
  console.error(`[AI] Both Gemini and Groq failed. Gemini: ${geminiError} | Groq: ${groqError}`);
  return {
    success: false,
    itinerary: null,
    provider: null,
    fallbackUsed: true,
    error: `Unable to generate itinerary. Gemini: ${geminiError} | Groq: ${groqError}`,
    geminiRequestCount: requestNumber,
    latencyMs: totalLatencyMs,
    validationErrors: [],
  };
}

// ══════════════════════════════════════════════════════════════════════
//  PROMPTS — AI as PLANNER, not data generator
// ══════════════════════════════════════════════════════════════════════

/**
 * System prompt — positions AI as a planner that selects and arranges candidates.
 * The AI MUST NOT return any factual data (prices, coordinates, ratings, etc.)
 */
function buildSystemPrompt() {
  return `You are TravelMind AI's Itinerary Planner.

Your job is to SELECT and ARRANGE pre-verified travel candidates into a personalized multi-day itinerary.

You are a PLANNER, not a data generator. You do NOT create, invent, or fabricate any factual information.

═══ CRITICAL RULES ═══

1. You receive a CANDIDATES list of verified places, restaurants, hotels, transport options, and events. You MUST select ONLY from this list.

2. Every item you include MUST contain:
   - "provider": the provider name EXACTLY as shown in the candidate's "provider" field
   - "providerId": the providerId EXACTLY as shown in the candidate's "providerId" field

3. NEVER invent any of the following:
   - Places, restaurants, hotels, activities, or events
   - Prices, costs, or monetary values
   - Ratings or reviews
   - Coordinates or addresses
   - Opening hours or availability
   - Booking URLs or images
   - Durations or distances
   - Weather conditions or temperatures
   - Any factual data whatsoever

4. If the CANDIDATES list lacks something needed for a time slot, leave it empty or suggest "Free time" — do NOT invent a placeholder.

═══ WHAT YOU OPTIMIZE ═══

You should consider ALL of the following when making selections:

- User interests and travel style
- Budget constraints (from BUDGET section)
- Variety — don't repeat the same type of activity every day
- Geographic proximity — keep nearby candidates on the same day
- Opening hours — only schedule attractions during likely open hours
- Activity duration — fit activities within time slots realistically
- Travel time between candidates (use suburb/address proximity as a guide)
- Weather — if rain is likely, prefer indoor attractions (museums, galleries, shopping)
- Event dates — only schedule events on their actual eventDate
- Meal timing — breakfast (07:00-10:00), lunch (12:00-14:00), dinner (18:00-21:00)
- Hotel location — prefer candidates near the hotel for each day
- No duplicate attractions across days (use providerId to track)

═══ STRUCTURAL RULES ═══

- Each day MUST have: breakfast (restaurant), morning activity, lunch (restaurant), afternoon activity, evening activity, dinner (restaurant)
- Arrival day: outbound transport → hotel check-in → sightseeing
- Departure day: hotel check-out → return transport (no sightseeing)
- No overlapping time slots within a day
- Every attraction/activity must appear on ONLY ONE day (no repeats)
- Hotels CAN repeat across nights (same hotel for multi-night stay)
- Restaurants should be diverse when enough options exist
- Never schedule attractions after 20:00 (most close by then)

═══ OUTPUT FORMAT ═══

Return ONLY a JSON object with this exact structure:

{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "theme": "Brief theme for the day (e.g. 'Arrival & Beach Hopping')",
      "items": [
        {
          "type": "attraction|restaurant|hotel|event|transport|nightlife",
          "provider": "EXACT provider value from candidate",
          "providerId": "EXACT providerId value from candidate",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "reason": "Brief reason for this selection"
        }
      ]
    }
  ]
}

Rules for the output:
- "type" must match the candidate's "type" field
- "provider" must match the candidate's "provider" field EXACTLY
- "providerId" must match the candidate's "providerId" field EXACTLY
- "startTime" and "endTime" must be in HH:MM format
- "reason" explains WHY this candidate was selected (for personalization)
- Do NOT include any fields other than the ones listed above
- Do NOT include prices, coordinates, ratings, addresses, or any factual data
- The backend will resolve all factual data from the candidate dataset`;
}

/**
 * Build the user prompt with candidate list and constraints.
 */
function buildUserPrompt(context) {
  return `You are TravelMind AI's Itinerary Planner. Plan a ${context.trip.daysCount}-day trip to ${context.trip.destination}.

═══ TRIP DETAILS ═══
${JSON.stringify(context.trip, null, 2)}

═══ BUDGET ═══
${JSON.stringify(context.budget, null, 2)}

═══ CANDIDATES (select ONLY from this list) ═══
Every item you include must reference a candidate by its "provider" and "providerId" fields.
${JSON.stringify(context.candidates, null, 2)}

═══ WEATHER ═══
${JSON.stringify(context.weather, null, 2)}

═══ LOCAL GUIDE ═══
${JSON.stringify(context.guide, null, 2)}

═══ SAFETY ═══
${JSON.stringify(context.safety, null, 2)}
${context._replanSection || ''}
${context._previousPlanSection || ''}

Plan the best itinerary by selecting and arranging candidates from the CANDIDATES list.
Return ONLY the JSON object — no prose, no explanations outside the JSON.`;
}

// ══════════════════════════════════════════════════════════════════════
//  GENERIC LLM CALL HELPER
// ══════════════════════════════════════════════════════════════════════

async function callLLMWithTimeout({ service, prompt, system, agent, action, userId, timeoutMs, providerName }) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${providerName} request timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const result = await Promise.race([
      service.generateJSON({ prompt, system, agent, action, userId }),
      timeoutPromise,
    ]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (err) {
    if (timer) clearTimeout(timer);
    console.error(`[itineraryGenerator] ${providerName} error: ${err.message}`);
    return { success: false, data: null, message: err.message || `${providerName} request failed` };
  }
}

// ══════════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════════

export function getRequestCount() {
  return geminiRequestCount;
}
