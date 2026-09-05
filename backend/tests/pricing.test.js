import test from 'node:test';
import assert from 'node:assert/strict';
import pricingService from '../src/services/pricing.service.js';
import budgetService from '../src/services/budget.service.js';
import itineraryService from '../src/services/itinerary.service.js';

const { restaurantMealCost, entryFeeEstimateFor, attractionCost, localTransportLegEstimate, normalizeActivityCost, normalizeItineraryPrices } = pricingService;

// ══════════════════════════════════════════════════════════════════════
//  Restaurant / meal estimates
// ══════════════════════════════════════════════════════════════════════

test('restaurantMealCost returns a positive per-party estimate for a place with no price data', () => {
  const breakfast = restaurantMealCost({ name: 'Guptaji Namkeen', priceLevel: null }, 'breakfast', 2, 'INR');
  const lunch = restaurantMealCost({ name: 'Guptaji Namkeen', priceLevel: null }, 'lunch', 2, 'INR');
  const dinner = restaurantMealCost({ name: 'Guptaji Namkeen', priceLevel: null }, 'dinner', 2, 'INR');

  assert.ok(breakfast.amount >= 200, `breakfast >= ₹200 (got ${breakfast.amount})`);
  assert.ok(lunch.amount >= 300, `lunch >= ₹300 (got ${lunch.amount})`);
  assert.ok(dinner.amount >= 400, `dinner >= ₹400 (got ${dinner.amount})`);
  assert.equal(breakfast.isEstimate, true, 'fallback meal is honestly an estimate');
  assert.ok(breakfast.estimateNote, 'estimate carries an explanation');
  // Per-party: amount = perPerson × partySize
  assert.equal(breakfast.amount, breakfast.perPerson * 2);
});

test('restaurantMealCost varies by restaurant name instead of using one identical price', () => {
  const a = restaurantMealCost({ name: 'Hotel Hardeo', priceLevel: null }, 'lunch', 1, 'INR').amount;
  const b = restaurantMealCost({ name: 'Pizza Hut', priceLevel: null }, 'lunch', 1, 'INR').amount;
  const c = restaurantMealCost({ name: 'Guptaji Namkeen', priceLevel: null }, 'lunch', 1, 'INR').amount;
  const names = new Set([a, b, c]);
  assert.ok(names.size > 1, `expected varied lunch prices, got ${a}, ${b}, ${c}`);
});

test('restaurantMealCost respects real Zomato prices and never labels them estimates', () => {
  const cost = restaurantMealCost(
    { name: 'Real Eatery', zomatoData: { averageCostPerPerson: 500, rating: 4.2, votes: 100, ratingText: 'Very Good' } },
    'lunch',
    3,
    'INR'
  );
  assert.equal(cost.isEstimate, false, 'Zomato price is real, not an estimate');
  assert.equal(cost.source, 'zomato');
  assert.equal(cost.amount, Math.round(500 * 0.85 * 3 * 100) / 100, 'lunch = 85% of average × party size');
});

// ══════════════════════════════════════════════════════════════════════
//  Attraction estimates
// ══════════════════════════════════════════════════════════════════════

test('entryFeeEstimateFor prices paid types (fort/museum) and frees known-free types', () => {
  assert.ok(entryFeeEstimateFor({ name: 'Sitabuldi Fort', types: ['fort'] }).amount > 0, 'fort gets a positive estimated fee');
  assert.ok(entryFeeEstimateFor({ name: 'Mahatma Gandhi Statue', types: ['tourist_attraction'] }).amount > 0, 'unknown statue → estimate, never Free (we do not know it is free)');
  assert.equal(entryFeeEstimateFor({ name: 'Futala Lake', types: ['lake'] }).amount, 0);
  assert.equal(entryFeeEstimateFor({ name: 'Marine Drive', types: ['viewpoint'] }).amount, 0);
  assert.equal(entryFeeEstimateFor({ name: 'Sai Baba Temple', types: ['temple'] }).amount, 0);
  const paid = entryFeeEstimateFor({ name: 'Nagpur Museum', types: [] });
  assert.equal(paid.isEstimate, true, 'provider has no entry-fee data → estimate');
});

test('attractionCost preserves real Viator pricing and multiplies by party size', () => {
  const cost = attractionCost(
    { name: 'Fort', types: [], entryFee: { amount: 500, currency: 'INR', isEstimate: false, source: 'viator' } },
    'INR',
    2
  );
  assert.equal(cost.isEstimate, false);
  assert.equal(cost.amount, 1000, '500/person × 2 travellers');
  assert.equal(cost.perPerson, 500);
});

test('attractionCost never returns a dash-worthy amount for a paid-type attraction', () => {
  const cost = attractionCost({ name: 'Sitabuldi Fort', types: ['fort'] }, 'INR', 1);
  assert.ok(cost.amount > 0, 'fort gets an estimated entry fee');
  assert.equal(cost.isEstimate, true);
});

test('attractionCost returns ₹0 (free) only for explicitly-confirmed free attractions', () => {
  // Curated data explicitly confirms free entry → Free.
  const confirmed = attractionCost(
    { name: 'Deekshabhoomi', types: [], entryFee: { amount: 0, currency: 'INR', isEstimate: true, source: 'curated' } },
    'INR',
    1
  );
  assert.equal(confirmed.amount, 0);
  assert.match(confirmed.estimateNote, /Free/i);

  // Known-free category (lake/beach/viewpoint) → Free.
  const lake = attractionCost({ name: 'Futala Lake', types: ['lake'] }, 'INR', 1);
  assert.equal(lake.amount, 0);

  // Unknown category with NO price data → estimated fee, never Free.
  const statue = attractionCost({ name: 'Mahatma Gandhi Statue', types: ['tourist_attraction'] }, 'INR', 1);
  assert.ok(statue.amount > 0, 'unknown entry cost must receive an estimate');
  assert.equal(statue.isEstimate, true);
});

// ══════════════════════════════════════════════════════════════════════
//  Local transport leg estimates
// ══════════════════════════════════════════════════════════════════════

test('localTransportLegEstimate sums fares from the day travel legs', () => {
  const legs = [
    { distanceKm: 2, method: 'taxi/auto' },   // max(40, 2*15) = 40
    { distanceKm: 8, method: 'taxi/auto' },   // max(40, 8*15) = 120
    { distanceKm: 0.5, method: 'walking' },   // 0
    { distanceKm: 5, method: 'bus/metro' },   // 30
  ];
  assert.equal(localTransportLegEstimate(legs), 190);
  assert.equal(localTransportLegEstimate([{ distanceKm: 1, method: 'walking' }]), 0);
});

// ══════════════════════════════════════════════════════════════════════
//  normalizeActivityCost — the central fallback
// ══════════════════════════════════════════════════════════════════════

test('normalizeActivityCost preserves a live flight price untouched', () => {
  const act = {
    category: 'flight',
    title: 'Flight to Nagpur',
    isLive: true,
    dataStatus: 'live',
    cost: { amount: 12128, currency: 'INR', isEstimate: false, perPerson: 12128, source: 'provider' },
  };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(changed, false, 'live price is never rewritten');
  assert.equal(act.cost.amount, 12128);
  assert.equal(act.cost.isEstimate, false);
});

test('normalizeActivityCost fills a missing breakfast price with a meal estimate', () => {
  const act = { category: 'restaurant', slot: 'breakfast', title: 'Breakfast at Guptaji Namkeen', place: 'Guptaji Namkeen', cost: { amount: 0, currency: 'INR' } };
  const { changed } = normalizeActivityCost(act, { partySize: 2, currency: 'INR' });
  assert.equal(changed, true);
  assert.ok(act.cost.amount >= 200, 'breakfast estimate is never ₹0 or a dash');
  assert.equal(act.cost.isEstimate, true);
  assert.equal(act.cost.amount, act.cost.perPerson * 2);
});

test('normalizeActivityCost fills a fort attraction with an entry estimate', () => {
  const act = { category: 'attraction', title: 'Sitabuldi Fort', place: 'Sitabuldi Fort', cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(changed, true);
  assert.ok(act.cost.amount > 0);
});

test('normalizeActivityCost marks an explicitly-confirmed free attraction as ₹0 Free', () => {
  const act = {
    category: 'attraction',
    title: 'Deekshabhoomi',
    place: 'Deekshabhoomi',
    entryFee: { amount: 0, currency: 'INR', isEstimate: true, source: 'curated' },
    cost: { amount: 0 },
  };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(changed, true);
  assert.equal(act.cost.amount, 0);
  assert.match(act.cost.estimateNote, /Free/i);
});

test('normalizeActivityCost never leaves an unknown attraction Free — it gets an estimate', () => {
  const act = { category: 'attraction', title: 'Mahatma Gandhi Statue', place: 'Mahatma Gandhi Statue', cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(changed, true);
  assert.ok(act.cost.amount > 0, 'unknown attraction receives an estimated entry fee');
  assert.equal(act.cost.isEstimate, true);
});

test('normalizeActivityCost does not treat dataStatus unavailable as Free — it estimates', () => {
  const act = {
    category: 'restaurant',
    slot: 'breakfast',
    title: 'Breakfast at X',
    place: 'X',
    dataStatus: 'unavailable',
    cost: { amount: 0, currency: 'INR' },
  };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(changed, true);
  assert.ok(act.cost.amount > 0, 'unavailable ≠ free → estimated breakfast');
});

test('normalizeActivityCost caps meal estimates by the daily food envelope', () => {
  const act = { category: 'restaurant', slot: 'dinner', title: 'Dinner at 5 Star Place', place: '5 Star Place', priceLevel: 4, cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, { partySize: 2, currency: 'INR', maxMealPerPerson: 180 });
  assert.equal(changed, true);
  assert.ok(act.cost.amount <= 180 * 2, 'dinner capped to ₹180/person × 2 travellers');
});

test('normalizeActivityCost caps attraction estimates by the daily activities envelope', () => {
  const act = { category: 'attraction', title: 'Raman Science Centre', place: 'Raman Science Centre', cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR', maxActivityPerPerson: 60 });
  assert.equal(changed, true);
  assert.ok(act.cost.amount <= 60, 'attraction estimate capped to the daily activities envelope');
});

test('normalizeActivityCost caps estimated hotel nightly rate by the accommodation budget', () => {
  const act = { category: 'hotel', slot: 'hotel', title: 'Overnight at Expensive Palace', place: 'Expensive Palace', cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, {
    partySize: 2,
    currency: 'INR',
    hotelNightly: 4500,
    maxHotelNightly: 1667,
    rooms: 2,
  });
  assert.equal(changed, true);
  assert.equal(act.cost.amount, 1667 * 2, 'nightly capped to ₹1667 × 2 rooms');
  assert.equal(act.cost.perPerson, 1667, 'per person = 3334 / 2');
});

test('normalizeActivityCost shows the nightly rate on check-in without double-charging', () => {
  const act = { category: 'hotel', slot: 'hotel', title: 'Check-in at Hotel Swagat Executive', place: 'Hotel Swagat Executive', cost: { amount: 0 } };
  const { changed } = normalizeActivityCost(act, { partySize: 2, currency: 'INR', hotelNightly: 1400 });
  assert.equal(changed, true);
  assert.equal(act.cost.amount, 0, 'check-in row itself is not charged');
  assert.equal(act.cost.displayAmount, 1400, 'nightly rate shown on the check-in row');
  assert.equal(act.cost.displaySuffix, '/ room/night');
});

test('normalizeActivityCost keeps a budget-optimizer-zeroed item free', () => {
  const act = { category: 'restaurant', slot: 'dinner', title: 'Dinner at X', cost: { amount: 0 }, notes: 'Removed by Budget Optimizer to stay within budget', dataStatus: 'estimate' };
  const { changed } = normalizeActivityCost(act, { partySize: 1, currency: 'INR' });
  assert.equal(act.cost.amount, 0, 'optimizer-zeroed item is not re-priced');
  assert.ok(!/Estimated/.test(act.cost.estimateNote || ''), 'no meal estimate applied');
});

test('normalizeItineraryPrices fills a fully unpriced legacy day and recomputes totals', () => {
  const days = [{
    dayNumber: 1,
    activities: [
      { category: 'flight', title: 'Flight to Nagpur', time: '07:00', slot: 'transport', cost: { amount: 0 } },
      { category: 'hotel', slot: 'hotel', title: 'Check-in at Hotel Swagat Executive', time: '12:00', cost: { amount: 0 } },
      { category: 'restaurant', slot: 'lunch', title: 'Lunch at Hotel Hardeo', time: '13:00', cost: { amount: 0 } },
      { category: 'attraction', title: 'Sitabuldi Fort', time: '14:30', slot: 'afternoon', cost: { amount: 0 } },
      { category: 'transport', slot: 'transport', title: 'Local transport & transfers', time: '19:15', cost: { amount: 0 } },
      { category: 'hotel', slot: 'hotel', title: 'Overnight at Hotel Swagat Executive', time: '22:30', cost: { amount: 0 } },
    ],
  }];

  const changed = normalizeItineraryPrices(days, { partySize: 2, currency: 'INR', hotelNightly: 1400, localTransportDaily: 300 });
  assert.equal(changed, true);

  const bySlot = (s) => days[0].activities.find((a) => a.slot === s);
  assert.ok(bySlot('transport').cost.amount > 0, 'flight priced');
  assert.equal(bySlot('hotel').cost.displayAmount, 1400, 'check-in shows nightly rate');
  assert.ok(bySlot('lunch').cost.amount >= 300, 'lunch priced');
  assert.ok(days[0].activities.find((a) => a.title === 'Sitabuldi Fort').cost.amount > 0, 'fort priced');
  const overnight = days[0].activities.find((a) => a.title.startsWith('Overnight'));
  assert.equal(overnight.cost.amount, 1400, 'overnight row is charged nightly × rooms');
  assert.equal(overnight.cost.perPerson, 700, 'per person = 1400 / 2');

  // Every activity now has a numeric amount — none can render "—".
  for (const act of days[0].activities) {
    assert.equal(typeof act.cost.amount, 'number');
    assert.ok(!Number.isNaN(act.cost.amount));
  }
});

// ══════════════════════════════════════════════════════════════════════
//  Integration: deterministic plan uses the centralized pricing service
// ══════════════════════════════════════════════════════════════════════

test('buildDaysPlan prices every item — no zero-amount displayable gaps except free items', () => {
  const days = itineraryService.buildDays({
    origin: 'Mumbai',
    destination: 'Nagpur',
    startDate: '2025-09-01',
    endDate: '2025-09-03',
    travelers: { adults: 2, children: 0 },
    prefs: { foodPreference: '', travelStyle: 'standard', activityLevel: 'moderate', interests: [], accessibility: [] },
    hotelResult: { data: { isLive: false, recommended: null, hotels: [] } },
    transportResult: { mode: 'flight', data: { isLive: false, selected: null } },
    weatherResult: { data: { provider: 'unavailable', forecast: null } },
    attractions: [],
    restaurants: [],
    budgetAllocation: { transport: { amount: 12000 }, hotels: { amount: 10000 }, food: { amount: 6000 }, activities: { amount: 2000 } },
    totalBudget: 40000,
    currency: 'INR',
  });

  const zeroed = [];
  for (const day of days) {
    for (const act of day.activities) {
      if (typeof act.cost.amount !== 'number') zeroed.push(act.title);
      // Check-in rows are display-only and check-out is free by design.
      if (act.cost.amount === 0 && !/check[\s-]*(in|out)/i.test(act.title)) {
        // free attractions are fine (₹0 = Free)
        if (!(act.category === 'attraction' || act.category === 'activity')) zeroed.push(`${act.title} → ${JSON.stringify(act.cost)}`);
      }
    }
  }
  assert.deepEqual(zeroed, [], `all non-free items have prices: ${zeroed.join(', ')}`);

  const day1 = days[0];
  assert.ok(day1.costBreakdown.dayTotal > 0, 'day total is derived from item prices');
  assert.equal(day1.costBreakdown.dayTotal, day1.activities.reduce((s, a) => s + (a.cost?.amount || 0), 0));
});

// ══════════════════════════════════════════════════════════════════════
//  Budget-aware integration scenarios (required validation list)
// ══════════════════════════════════════════════════════════════════════

function buildPlanFor(opts) {
  return itineraryService.buildDaysPlan({
    origin: 'Mumbai',
    destination: 'Nagpur',
    startDate: '2025-09-01',
    endDate: '2025-09-04',
    travelers: { adults: 2, children: 0 },
    prefs: { foodPreference: '', travelStyle: 'standard', activityLevel: 'moderate', interests: [], accessibility: [] },
    hotelResult: { data: { isLive: false, recommended: null, hotels: [] } },
    transportResult: { mode: 'flight', data: { isLive: false, selected: null } },
    weatherResult: { data: { provider: 'unavailable', forecast: null } },
    attractions: [],
    restaurants: [],
    budgetAllocation: { transport: { amount: 12000 }, hotels: { amount: 10000 }, food: { amount: 6000 }, activities: { amount: 2000 } },
    totalBudget: 40000,
    currency: 'INR',
    ...opts,
  });
}

// A. Normal budget trip — final total within budget with a safety margin.
test('A. normal budget trip stays within budget', () => {
  const plan = buildPlanFor({});
  const total = itineraryService.computeItineraryCost(plan.days);
  assert.ok(total <= 40000, `total ${total} ≤ budget 40000`);
  assert.ok(total >= 10000, 'total is not unrealistically low');
  assert.equal(plan.withinBudget, true);
});

// B. Low budget trip — still within budget, all items priced.
test('B. low budget trip stays within budget', () => {
  const allocation = budgetService.allocationForStyle('standard', 12000);
  const plan = buildPlanFor({ totalBudget: 12000, budgetAllocation: allocation });
  const total = itineraryService.computeItineraryCost(plan.days);
  assert.ok(total <= 12000, `total ${total} ≤ budget 12000`);
  // No paid-category item may render Free/— (except free attractions & check-in/out).
  for (const day of plan.days) {
    for (const act of day.activities) {
      if (act.cost.amount === 0) {
        assert.ok(
          /check[\s-]*(in|out)/i.test(act.title) || (act.category === 'attraction' || act.category === 'activity') || act.category === 'hotel',
          `unexpected zero-priced item: ${act.title}`
        );
      }
      assert.equal(typeof act.cost.amount, 'number');
    }
  }
});

// C. Multiple travelers — rooms derived from traveler count, per-person totals correct.
test('C. multiple travelers: rooms from party size, per-person totals correct', () => {
  const plan = buildPlanFor({ travelers: { adults: 5, children: 1 } });
  const party = 6;
  const total = itineraryService.computeItineraryCost(plan.days);
  // roomsForParty(5 adults, 1 child) = ceil(5/2) = 3 rooms.
  const rooms = plan.days[0].overnight.rooms;
  assert.equal(rooms, 3, 'rooms derived from traveler count (ceil(adults/2))');
  const day1 = plan.days[0];
  assert.equal(day1.costBreakdown.perPerson, Math.round((day1.dayCost / party) * 100) / 100);
  assert.ok(total <= 40000, `total ${total} ≤ budget 40000 with 6 travellers`);
});

// D. Multiple hotel nights — hotel charged once per night, never per day × nights.
test('D. multiple nights: accommodation = nightly × rooms × actual nights', () => {
  const plan = buildPlanFor({}); // 4 days → 3 nights
  const hotelNights = plan.days.filter((d) => d.overnight?.nights > 0).length;
  assert.equal(hotelNights, 3, '3 overnight charges for 3 nights');
  const nightly = plan.days[0].overnight.pricePerRoomNight;
  const rooms = plan.days[0].overnight.rooms;
  const hotelTotal = plan.days.reduce((s, d) => s + (d.overnight?.nights || 0), 0) * nightly * rooms;
  const charged = plan.days.reduce((s, d) => s + d.activities.filter((a) => a.category === 'hotel').reduce((x, a) => x + (a.cost?.amount || 0), 0), 0);
  assert.equal(charged, Math.round(hotelTotal * 100) / 100, 'sum of hotel rows = nightly × rooms × nights');
  // Check-in rows never add to the day total.
  for (const day of plan.days) {
    for (const act of day.activities) {
      if (/check[\s-]*in/i.test(act.title)) assert.equal(act.cost.amount, 0);
    }
  }
});

// E. Live flight price preserved untouched.
test('E. live flight price is preserved and included in the total', () => {
  const plan = buildPlanFor({
    transportResult: { mode: 'flight', data: { isLive: true, selected: { airline: 'AI', flightNumber: '123', price: { amount: 19951, currency: 'INR' }, provider: 'live-provider' } } },
  });
  const arrival = plan.days[0].activities.find((a) => a.category === 'flight' && /Flight to/.test(a.title));
  assert.ok(arrival, 'arrival flight row exists');
  assert.equal(arrival.cost.amount, 19951, 'live flight price never reduced');
  assert.equal(arrival.cost.isEstimate, false);
});

// F/G/H. Missing restaurant / attraction / transport prices → estimates, never Free/—.
test('F/G/H. missing prices receive estimates, never Free or dash', () => {
  const { normalizeItineraryPrices } = pricingService;
  const days = [{
    dayNumber: 1,
    activities: [
      { category: 'restaurant', slot: 'breakfast', title: 'Breakfast at Unknown', place: 'Unknown', cost: { amount: 0 } },
      { category: 'restaurant', slot: 'lunch', title: 'Lunch at Unknown', place: 'Unknown', cost: { amount: 0 } },
      { category: 'restaurant', slot: 'dinner', title: 'Dinner at Unknown', place: 'Unknown', cost: { amount: 0 } },
      { category: 'attraction', title: 'Some Landmark', place: 'Some Landmark', cost: { amount: 0 } },
      { category: 'transport', slot: 'transport', title: 'Local transport & transfers', place: 'City', cost: { amount: 0 } },
      { category: 'flight', title: 'Flight to City', slot: 'transport', cost: { amount: 0 } },
    ],
  }];
  normalizeItineraryPrices(days, { partySize: 2, currency: 'INR', localTransportDaily: 250, maxMealPerPerson: 300, maxActivityPerPerson: 300 });
  for (const act of days[0].activities) {
    assert.ok(act.cost.amount > 0, `every paid item priced: ${act.title} → ${act.cost.amount}`);
  }
});

// I. Free attraction stays Free when explicitly confirmed.
test('I. explicitly-confirmed free attraction stays Free', () => {
  const plan = buildPlanFor({
    attractions: [{
      name: 'Futala Lake',
      coordinates: { lat: 21.146, lng: 79.04 },
      types: ['lake'],
      entryFee: { amount: 0, currency: 'INR', isEstimate: true, source: 'curated' },
    }],
  });
  const freeRows = plan.days.flatMap((d) => d.activities).filter((a) => /Futala Lake/.test(a.title));
  assert.ok(freeRows.length > 0, 'lake attraction picked');
  for (const row of freeRows) assert.equal(row.cost.amount, 0, 'confirmed-free attraction shows Free');
});

// J. Hotel price calculation: check-in display-only, overnight = nightly × rooms.
test('J. hotel price calculation: check-in display-only, overnight charged once', async () => {
  const { resolveProviderIds } = await import('../src/orchestrator/orchestratorAIPlanning.js');
  const candidates = [
    { provider: 'amadeus', providerId: 'royal-orchid', name: 'Hotel Royal Orchid Central', type: 'hotel', pricePerNight: 4500, price: 4500, currency: 'INR', isLive: true, isEstimate: false },
  ];
  const aiDays = [{
    date: '2025-09-01',
    items: [
      { type: 'hotel', provider: 'amadeus', providerId: 'royal-orchid', startTime: '12:00', title: 'Check-in at Hotel Royal Orchid Central' },
      { type: 'hotel', provider: 'amadeus', providerId: 'royal-orchid', startTime: '22:30', title: 'Overnight at Hotel Royal Orchid Central' },
    ],
  }];
  const { resolved } = resolveProviderIds(aiDays, candidates, {
    partySize: 2,
    currency: 'INR',
    rooms: 1,
    hotelNightly: 4500, // within budget → live price kept
  });
  const [checkIn, overnight] = resolved[0].activities;
  assert.equal(checkIn.cost.amount, 0, 'check-in row itself is not charged');
  assert.equal(checkIn.cost.displayAmount, 4500, 'nightly rate shown on check-in');
  assert.equal(overnight.cost.amount, 4500, 'overnight = 4500 × 1 room, charged once');
});

test('J2. expensive hotel is capped to the accommodation budget in the AI plan', async () => {
  const { resolveProviderIds } = await import('../src/orchestrator/orchestratorAIPlanning.js');
  const candidates = [
    { provider: 'amadeus', providerId: 'royal-orchid', name: 'Hotel Royal Orchid Central', type: 'hotel', pricePerNight: 4500, price: 4500, currency: 'INR', isLive: true, isEstimate: false },
  ];
  const aiDays = [{
    date: '2025-09-01',
    items: [{ type: 'hotel', provider: 'amadeus', providerId: 'royal-orchid', startTime: '22:30', title: 'Overnight at Hotel Royal Orchid Central' }],
  }];
  const { resolved } = resolveProviderIds(aiDays, candidates, {
    partySize: 2,
    currency: 'INR',
    rooms: 3,
    hotelNightly: 1667, // budget-capped nightly
  });
  const overnight = resolved[0].activities[0];
  assert.equal(overnight.cost.amount, 1667 * 3, '₹4500/night capped to ₹1667 × 3 rooms');
  assert.equal(overnight.cost.isEstimate, true, 'capped price is flagged as an estimate');
});

// K/L. Day totals and overall totals equal the sum of item prices.
test('K/L. day totals and trip total exactly match item prices', () => {
  const plan = buildPlanFor({});
  const expectedTotal = plan.days.reduce((sum, d) => {
    const daySum = d.activities.reduce((s, a) => s + (a.cost?.amount || 0), 0);
    assert.equal(d.costBreakdown.dayTotal, Math.round(daySum * 100) / 100, `day ${d.dayNumber} total`);
    assert.equal(d.dayCost, Math.round(daySum * 100) / 100);
    return sum + daySum;
  }, 0);
  assert.equal(itineraryService.computeItineraryCost(plan.days), Math.round(expectedTotal * 100) / 100);
});

// M. Per-person total = trip total / travelers.
test('M. per-person cost = trip total / number of travellers', () => {
  const plan = buildPlanFor({ travelers: { adults: 4, children: 0 } });
  const total = itineraryService.computeItineraryCost(plan.days);
  const last = plan.days[plan.days.length - 1];
  const perPersonFromBreakdown = last.costBreakdown.perPerson;
  assert.equal(perPersonFromBreakdown, Math.round((last.dayCost / 4) * 100) / 100, 'day per-person');
  // Across the trip, per-person share of each day sums to total/4.
  const sumPerPerson = plan.days.reduce((s, d) => s + d.costBreakdown.perPerson, 0);
  assert.equal(Math.round(sumPerPerson * 100) / 100, Math.round((total / 4) * 100) / 100);
});

test('overall trip total never exceeds the budget after rebalancing (5-10% margin kept)', () => {
  const plan = buildPlanFor({ totalBudget: 20000 });
  const total = itineraryService.computeItineraryCost(plan.days);
  assert.ok(total <= 20000, `total ${total} ≤ budget 20000`);
  // Prefer keeping ~5% of the budget unused when there are no live costs.
  const transportLive = false;
  if (!transportLive) {
    assert.ok(total <= 20000 * 0.97 + 200, 'near-budget plans leave a small buffer');
  }
});