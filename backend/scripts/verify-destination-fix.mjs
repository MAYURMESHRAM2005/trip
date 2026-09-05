/**
 * Verify the destination-constraint fix against the LIVE Geoapify API.
 *
 * Reproduces the exact call that produced the bug ("Nagpur top tourist
 * attractions" textSearch with NO coordinates — a global text match) and
 * confirms every returned place belongs to Nagpur, India.
 */
import placesProvider from '../src/providers/places.provider.js';
import destinationService from '../src/services/destination.service.js';

const destInfo = destinationService.getDestinationInfoSync('Nagpur, Maharashtra, India');
console.log('Destination:', JSON.stringify({ city: destInfo.city, state: destInfo.state, country: destInfo.countryCode, lat: destInfo.latitude, lng: destInfo.longitude, source: destInfo.source }));

// ── Scenario 1: the OLD broken call — text search with NO coordinates ──
console.log('\n=== textSearch("Nagpur top tourist attractions") — no coords (the old buggy path) ===');
const r1 = await placesProvider.textSearch({
  query: 'Nagpur top tourist attractions',
  type: 'tourist_attraction',
  limit: 10,
});
console.log('isLive:', r1.isLive, '| count:', r1.data?.length, '| message:', r1.message);
for (const a of r1.data || []) {
  const res = destinationService.validatePlaceForDestination(a, destInfo, { category: 'attraction' });
  console.log(`  - ${a.name} | ${a.address} | ${a.coordinates?.lat?.toFixed(3)},${a.coordinates?.lng?.toFixed(3)} | country=${a.countryCode || '?'} | valid=${res.valid}`);
}

// ── Scenario 2: destination-anchored nearby search ──
console.log('\n=== nearbySearch anchored at Nagpur (new agent path) ===');
const r2 = await placesProvider.nearbySearch({
  lat: destInfo.latitude,
  lng: destInfo.longitude,
  type: 'tourist_attraction',
  radius: 30000,
  limit: 10,
  countryCode: destInfo.countryCode,
  destinationInfo: destInfo,
});
console.log('isLive:', r2.isLive, '| count:', r2.data?.length, '| message:', r2.message);
for (const a of r2.data || []) {
  console.log(`  - ${a.name} | ${a.address} | ${a.coordinates?.lat?.toFixed(3)},${a.coordinates?.lng?.toFixed(3)} | country=${a.countryCode || '?'}`);
}

// ── Assertions ──
const all = [...(r1.data || []), ...(r2.data || [])];
const bad = all.filter((p) => {
  const res = destinationService.validatePlaceForDestination(p, destInfo, { category: 'attraction' });
  return !res.valid;
});
const forbidden = all.filter((p) => /mexico|new zealand|south africa|león/i.test(`${p.name} ${p.address}`));
console.log('\n=== RESULT ===');
console.log('total results:', all.length, '| invalid:', bad.length, '| forbidden international:', forbidden.length);
if (bad.length || forbidden.length || all.length === 0) {
  console.error('❌ FIX NOT VERIFIED');
  process.exit(1);
}
console.log('✅ All live results validated as belonging to Nagpur, India (no Mexico / NZ / South Africa)');