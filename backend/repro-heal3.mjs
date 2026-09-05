const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongoose = (await import('mongoose')).default;
let mongod;
try { mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } }); } catch (e) { console.log('SKIP no binary:', e.message); process.exit(0); }
await mongoose.connect(mongod.getUri('heal_test3'));
const Itinerary = (await import('./src/models/Itinerary.js')).default;
const itin = await Itinerary.create({ trip: new mongoose.Types.ObjectId(), user: new mongoose.Types.ObjectId(), currency: 'INR', totalEstimatedCost: 0, days: [] });
console.log('created. validation before:', JSON.stringify(itin.validation));
try {
  itin.set('validation', { passed: true, issues: [{ type: 'BUDGET', message: 'x' }], warnings: [], validatedAt: new Date() });
  console.log('set() OK. in-memory issues:', JSON.stringify(itin.validation.issues), 'isArray:', Array.isArray(itin.validation.issues));
} catch (e) {
  console.log('set() THREW:', e.message);
}
try {
  await itin.save();
  console.log('save() OK');
} catch (e) {
  console.log('save() THREW:', e.message.split('\n')[0]);
}
console.log('in-memory issues after failed save:', JSON.stringify(itin.validation.issues), 'isArray:', Array.isArray(itin.validation.issues));
await mongoose.disconnect();
