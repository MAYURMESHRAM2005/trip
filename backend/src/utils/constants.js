export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const TRAVEL_STYLES = Object.freeze([
  'budget',
  'backpacker',
  'standard',
  'luxury',
  'family',
  'business',
  'adventure',
  'romantic',
]);

export const CURRENCIES = Object.freeze(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD']);

export const LANGUAGES = Object.freeze(['en', 'hi', 'mr']);

export const EXPENSE_CATEGORIES = Object.freeze([
  'food',
  'hotel',
  'transport',
  'shopping',
  'tickets',
  'activities',
  'other',
]);

export const TICKET_CATEGORIES = Object.freeze([
  'flight',
  'train',
  'bus',
  'hotel',
  'attraction',
]);

export const PLACE_TYPES = Object.freeze([
  'tourist_attraction',
  'restaurant',
  'hotel',
  'hospital',
  'police',
  'pharmacy',
  'atm',
  'transit_station',
  'embassy',
]);

export const TRIP_STATUS = Object.freeze(['draft', 'planned', 'confirmed', 'completed', 'cancelled']);

export const DEFAULT_BUDGET_SPLIT = Object.freeze({
  transport: 0.28,
  hotels: 0.3,
  food: 0.2,
  activities: 0.1,
  misc: 0.07,
  emergencyReserve: 0.05,
});

export default {
  ROLES,
  TRAVEL_STYLES,
  CURRENCIES,
  LANGUAGES,
  EXPENSE_CATEGORIES,
  TICKET_CATEGORIES,
  PLACE_TYPES,
  TRIP_STATUS,
  DEFAULT_BUDGET_SPLIT,
};
