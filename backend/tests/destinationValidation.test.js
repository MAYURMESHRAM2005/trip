import test from 'node:test';
import assert from 'node:assert/strict';
import destinationService from '../src/services/destination.service.js';
import itineraryService from '../src/services/itinerary.service.js';

test('parseDestination splits city/state/country and country code', () => {
  assert.deepEqual(destinationService.parseDestination('Nagpur, Maharashtra, India'), {
    city: 'Nagpur', state: 'Maharashtra', country: 'India', countryCode: null,
  });
  assert.deepEqual(destinationService.parseDestination('Nagpur (IN)'), {
    city: 'Nagpur', state: '', country: '', countryCode: 'IN',
  });
});

test('getDestinationInfoSync resolves curated Nagpur without network', () => {
  const info = destinationService.getDestinationInfoSync('Nagpur, Maharashtra, India');
  assert.equal(info.city, 'Nagpur');
  assert.equal(info.state, 'Maharashtra');
  assert.equal(info.countryCode, 'IN');
  assert.equal(info.latitude, 21.1458);
  assert.equal(info.longitude, 79.0882);
  assert.equal(info.source, 'curated');
});

test('REGRESSION: places from Mexico / New Zealand / South Africa are rejected for Nagpur', () => {
  const nagpur = destinationService.getDestinationInfoSync('Nagpur, Maharashtra, India');

  // The exact family of bad results reported in the bug:
  const mexicoPlace = { name: 'Nagpur 0', address: 'Nagpur 0, 37209 León, GUA, Mexico', coordinates: { lat: 21.1218, lng: -101.6749 }, countryCode: 'MX' };
  const nzPlace = { name: 'Nagpur Terrace', address: 'Nagpur Terrace, New Zealand', coordinates: { lat: -41.2983, lng: 174.7735 }, countryCode: 'NZ' };
  const zaPlace = { name: 'Nagpur Road', address: 'Nagpur Road, South Africa', coordinates: { lat: -25.7479, lng: 28.2293 }, countryCode: 'ZA' };
  const realNagpurPlace = { name: 'Deekshabhoomi', address: 'Ambedkar Nagar, Nagpur', coordinates: { lat: 21.1263, lng: 79.0532 }, countryCode: 'IN' };

  for (const bad of [mexicoPlace, nzPlace, zaPlace]) {
    const res = destinationService.validatePlaceForDestination(bad, nagpur, { category: 'attraction' });
    assert.equal(res.valid, false, `${bad.name} must be rejected (got ${res.reason})`);
  }
  assert.equal(
    destinationService.validatePlaceForDestination(realNagpurPlace, nagpur, { category: 'attraction' }).valid,
    true,
    'a real Nagpur place must be accepted'
  );

  // filterPlacesForDestination drops all bad results, keeps the good one
  const { kept, rejected } = destinationService.filterPlacesForDestination(
    [mexicoPlace, nzPlace, zaPlace, realNagpurPlace],
    nagpur,
    { category: 'attraction' }
  );
  assert.equal(kept.length, 1);
  assert.equal(kept[0].name, 'Deekshabhoomi');
  assert.equal(rejected.length, 3);
});

test('validatePlaceForDestination rejects coordinates outside the destination radius', () => {
  const nagpur = destinationService.getDestinationInfoSync('Nagpur');
  // ~18,000 km away — Mexico City
  const far = { name: 'Far Place', coordinates: { lat: 19.4326, lng: -99.1332 }, countryCode: 'IN' };
  const res = destinationService.validatePlaceForDestination(far, nagpur, { category: 'restaurant' });
  assert.equal(res.valid, false);
  assert.equal(res.reason, 'outside-region');
});

test('validatePlaceForDestination uses a tighter radius for hotels/restaurants', () => {
  const nagpur = destinationService.getDestinationInfoSync('Nagpur');
  // ~33km from Nagpur centre — fine for an attraction, too far for a restaurant
  const edge = { name: 'Edge Place', coordinates: { lat: 21.42, lng: 78.95 }, countryCode: 'IN' };
  assert.equal(destinationService.validatePlaceForDestination(edge, nagpur, { category: 'attraction' }).valid, true);
  assert.equal(destinationService.validatePlaceForDestination(edge, nagpur, { category: 'restaurant' }).valid, false);
});

test('curatedPlaces returns normalized Nagpur hotels, restaurants and attractions', () => {
  const info = destinationService.getDestinationInfoSync('Nagpur');
  const hotels = destinationService.curatedPlaces(info, 'hotels');
  const restaurants = destinationService.curatedPlaces(info, 'restaurants');
  const attractions = destinationService.curatedPlaces(info, 'attractions');

  assert.ok(hotels.length >= 3, 'has multiple hotels');
  assert.ok(restaurants.length >= 3, 'has multiple restaurants');
  assert.ok(attractions.length >= 6, 'has multiple attractions');

  const hotel = hotels[0];
  assert.equal(hotel.source, 'curated');
  assert.equal(hotel.isLive, false);
  assert.equal(hotel.dataStatus, 'estimate');
  assert.ok(hotel.price.amount > 0, 'curated hotel price is never ₹0');
  assert.ok(hotel.coordinates.lat > 0 && hotel.coordinates.lng > 0, 'curated hotel has coordinates');

  assert.ok(attractions.some((a) => a.name === 'Deekshabhoomi'), 'curated attractions include Deekshabhoomi');
});

test('buildDaysPlan fills a completely empty live-data itinerary with curated Nagpur entities', () => {
  const days = itineraryService.buildDays({
    origin: 'Mumbai',
    destination: 'Nagpur',
    startDate: '2025-09-01',
    endDate: '2025-09-03',
    travelers: { adults: 4, children: 0 },
    prefs: { foodPreference: '', travelStyle: 'budget', activityLevel: 'moderate', interests: [], accessibility: [] },
    hotelResult: { data: { isLive: false, recommended: null, hotels: [] } },
    transportResult: { mode: 'bus', data: { isLive: false, selected: null } },
    weatherResult: { data: { provider: 'unavailable', forecast: null } },
    attractions: [],
    restaurants: [],
    budgetAllocation: { transport: { amount: 12000 }, hotels: { amount: 10000 }, food: { amount: 6000 } },
    totalBudget: 40000,
    currency: 'INR',
  });

  const day1 = days[0];
  const meals = day1.activities.filter((a) => a.category === 'restaurant');
  const hotel = day1.activities.find((a) => a.category === 'hotel' && a.cost?.amount > 0);
  const attractions = day1.activities.filter((a) => a.category === 'attraction');

  // Every meal has a real destination restaurant name
  assert.ok(meals.length >= 3, 'day has breakfast, lunch and dinner');
  for (const meal of meals) {
    assert.ok(meal.place && meal.place.length > 2, `meal has a real place name (${meal.title})`);
    assert.notEqual(meal.title.trim(), 'Breakfast', 'no generic Breakfast placeholder');
    assert.notEqual(meal.title.trim(), 'Lunch', 'no generic Lunch placeholder');
    assert.notEqual(meal.title.trim(), 'Dinner', 'no generic Dinner placeholder');
    assert.equal(meal.dataStatus, 'estimate');
    assert.equal(meal.cost.isEstimate, true, 'curated meals are honestly marked as estimates');
    assert.ok(meal.cost.amount > 0, 'meal cost is never ₹0');
  }

  // Overnight at a real curated hotel with a non-zero price
  assert.ok(hotel, 'day includes an overnight accommodation with a charge');
  assert.notEqual(hotel.title, 'Overnight in Nagpur', 'overnight names the actual hotel');
  assert.ok(hotel.place.length > 3, 'hotel has a real property name');
  assert.ok(hotel.cost.amount > 0, 'hotel price is never ₹0');

  // Attractions are real Nagpur places, never global junk
  assert.ok(attractions.length >= 1, 'day has attractions');
  for (const a of attractions) {
    assert.ok(a.place.length > 2, 'attraction has a real name');
    assert.ok(!/mexico|new zealand|south africa|León/i.test(a.address || ''), 'no international address leaks in');
  }

  // Day + trip costs are computed programmatically
  assert.ok(day1.costBreakdown.dayTotal > 0);
  const total = itineraryService.computeItineraryCost(days);
  assert.ok(total > 0);
  assert.equal(total, days.reduce((s, d) => s + d.dayCost, 0));
});

test('buildDaysPlan keeps the same curated hotel across consecutive nights', () => {
  const days = itineraryService.buildDays({
    origin: '',
    destination: 'Nagpur',
    startDate: '2025-09-01',
    endDate: '2025-09-04',
    travelers: { adults: 2, children: 0 },
    prefs: { foodPreference: '', travelStyle: 'standard', activityLevel: 'moderate', interests: [], accessibility: [] },
    hotelResult: { data: { isLive: false, recommended: null, hotels: [] } },
    transportResult: { mode: 'bus', data: { isLive: false, selected: null } },
    weatherResult: { data: { provider: 'unavailable', forecast: null } },
    attractions: [],
    restaurants: [],
    budgetAllocation: { transport: { amount: 5000 }, hotels: { amount: 12000 }, food: { amount: 4000 } },
    totalBudget: 30000,
    currency: 'INR',
  });

  const overnights = days
    .slice(0, -1)
    .map((d) => d.activities.find((a) => a.category === 'hotel' && a.cost?.amount > 0))
    .filter(Boolean);
  assert.ok(overnights.length >= 2, 'multiple nights exist');
  const names = overnights.map((o) => o.place);
  assert.ok(names.every((n) => n === names[0]), 'same hotel across consecutive nights');
});