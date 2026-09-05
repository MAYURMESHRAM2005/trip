/**
 * curatedDestinations.js — Destination-specific curated fallback data.
 *
 * Used when live APIs (Geoapify / Amadeus) fail or return results that fail
 * destination validation. Every entry is a REAL place in the destination —
 * never an invented address. Prices are typical estimates for the category
 * and are always surfaced to the UI as CURATED / ESTIMATED, never as live.
 *
 * Extend by adding a new key (lowercased city name). Keys are matched against
 * the normalized destination in destination.service.js.
 */
export default {
  nagpur: {
    name: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    countryCode: 'IN',
    latitude: 21.1458,
    longitude: 79.0882,
    timezone: 'Asia/Kolkata',
    radiusKm: 40,
    localityLabels: ['Sitabuldi', 'Dharampeth', 'Civil Lines', 'Sadar', 'Ramdaspeth', 'Mahal'],
    hotels: [
      { name: 'Hotel Centre Point', category: '3-star', rating: 4.2, pricePerNight: 2500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Central Bazar Road, Ramdaspeth, Nagpur', latitude: 21.1458, longitude: 79.0882 },
      { name: 'Pride Hotel Nagpur', category: '4-star', rating: 4.4, pricePerNight: 4500, amenities: ['Wi-Fi', 'AC', 'Pool', 'Breakfast'], address: 'Wardha Road, Nagpur', latitude: 21.1210, longitude: 79.0870 },
      { name: 'Tuli Imperial', category: '4-star', rating: 4.3, pricePerNight: 3800, amenities: ['Wi-Fi', 'AC', 'Restaurant', 'Breakfast'], address: 'Dharampeth, Nagpur', latitude: 21.1390, longitude: 79.0810 },
      { name: 'Radisson Blu Hotel Nagpur', category: '5-star', rating: 4.5, pricePerNight: 6500, amenities: ['Wi-Fi', 'AC', 'Pool', 'Gym', 'Breakfast'], address: 'Wardha Road, Nagpur', latitude: 21.1230, longitude: 79.0890 },
      { name: 'The Ashok Nagpur', category: '3-star', rating: 3.9, pricePerNight: 2000, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'West High Court Road, Dharampeth, Nagpur', latitude: 21.1430, longitude: 79.0720 },
      { name: 'Hotel Swagat Executive', category: '2-star', rating: 3.8, pricePerNight: 1400, amenities: ['Wi-Fi', 'AC'], address: 'Sitabuldi Main Road, Nagpur', latitude: 21.1500, longitude: 79.0680 },
    ],
    restaurants: [
      { name: 'Samosaji Restaurant', cuisine: ['Maharashtrian', 'Saoji'], rating: 4.5, priceLevel: 1, averageCostPerPerson: 350, address: 'Sitabuldi Main Road, Nagpur', latitude: 21.1490, longitude: 79.0680 },
      { name: "Haldiram's Nagpur", cuisine: ['Indian', 'Snacks', 'Sweets'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 250, address: 'Dharampeth, Nagpur', latitude: 21.1480, longitude: 79.0690 },
      { name: 'Baba Budan Giri', cuisine: ['Cafe', 'Coffee'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'Dharampeth, Nagpur', latitude: 21.1380, longitude: 79.0800 },
      { name: 'Bagdadi Restaurant', cuisine: ['Mughlai', 'North Indian'], rating: 4.2, priceLevel: 2, averageCostPerPerson: 500, address: 'Sitabuldi, Nagpur', latitude: 21.1500, longitude: 79.0670 },
      { name: 'Saoji Bhoj Restaurant', cuisine: ['Saoji', 'Maharashtrian'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 450, address: 'Sitabuldi, Nagpur', latitude: 21.1470, longitude: 79.0680 },
      { name: 'Nice Taste Restaurant', cuisine: ['South Indian', 'Indian'], rating: 4.1, priceLevel: 1, averageCostPerPerson: 300, address: 'Dharampeth, Nagpur', latitude: 21.1440, longitude: 79.0650 },
      { name: 'Nanking Restaurant', cuisine: ['Chinese', 'Indo-Chinese'], rating: 4.0, priceLevel: 2, averageCostPerPerson: 450, address: 'Dharampeth, Nagpur', latitude: 21.1410, longitude: 79.0760 },
    ],
    cafes: [
      { name: 'Baba Budan Giri', cuisine: ['Cafe', 'Coffee'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'Dharampeth, Nagpur', latitude: 21.1380, longitude: 79.0800 },
      { name: "Cafe Haldiram's", cuisine: ['Cafe', 'Snacks'], rating: 4.2, priceLevel: 1, averageCostPerPerson: 220, address: 'Sitabuldi, Nagpur', latitude: 21.1480, longitude: 79.0690 },
    ],
    nightlife: [],
    attractions: [
      { name: 'Deekshabhoomi', category: 'Historical / Cultural', rating: 4.6, entryFee: 0, durationHours: 1.5, address: 'Ambedkar Nagar, Nagpur', latitude: 21.1263, longitude: 79.0532, types: ['tourism.attraction', 'historical'] },
      { name: 'Futala Lake', category: 'Leisure / Evening', rating: 4.4, entryFee: 0, durationHours: 1.5, address: 'West High Court Road, Nagpur', latitude: 21.1460, longitude: 79.0400, types: ['tourism.attraction', 'natural'] },
      { name: 'Sitabuldi Fort', category: 'Historical', rating: 4.0, entryFee: 0, durationHours: 1, address: 'Sitabuldi, Nagpur', latitude: 21.1530, longitude: 79.0660, types: ['tourism.attraction', 'historical'] },
      { name: 'Raman Science Centre', category: 'Science Museum', rating: 4.3, entryFee: 100, durationHours: 2, address: 'Gandhi Sagar, Nagpur', latitude: 21.1507, longitude: 79.0888, types: ['tourism.museum', 'science'] },
      { name: 'Seminary Hills', category: 'Nature', rating: 4.2, entryFee: 0, durationHours: 2, address: 'Seminary Hills, Nagpur', latitude: 21.1358, longitude: 79.0662, types: ['tourism.attraction', 'natural'] },
      { name: 'Ambazari Lake & Garden', category: 'Nature / Garden', rating: 4.3, entryFee: 20, durationHours: 2, address: 'Ambazari, Nagpur', latitude: 21.1324, longitude: 79.0386, types: ['tourism.attraction', 'park'] },
      { name: 'Maharajbagh Zoo', category: 'Wildlife', rating: 4.0, entryFee: 50, durationHours: 2, address: 'Maharajbagh, Nagpur', latitude: 21.1460, longitude: 79.0800, types: ['tourism.zoo', 'leisure'] },
      { name: 'Balaji Mandir Temple', category: 'Religious', rating: 4.4, entryFee: 0, durationHours: 1, address: 'Dharampeth, Nagpur', latitude: 21.1460, longitude: 79.0720, types: ['tourism.attraction', 'religious'] },
      { name: 'Kasturchand Park', category: 'Garden', rating: 4.0, entryFee: 0, durationHours: 1, address: 'Civil Lines, Nagpur', latitude: 21.1500, longitude: 79.0780, types: ['tourism.attraction', 'park'] },
      { name: 'Japanese Rose Garden', category: 'Garden', rating: 4.1, entryFee: 10, durationHours: 1.5, address: 'Seminary Hills, Nagpur', latitude: 21.1340, longitude: 79.0520, types: ['tourism.attraction', 'park'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 15, taxiStart: 60, taxiPerKm: 20 },
  },

  mumbai: {
    name: 'Mumbai', state: 'Maharashtra', country: 'India', countryCode: 'IN',
    latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', radiusKm: 50,
    localityLabels: ['Colaba', 'Fort', 'Marine Drive', 'Bandra', 'Juhu'],
    hotels: [
      { name: 'The Taj Mahal Palace', category: '5-star', rating: 4.7, pricePerNight: 14000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Apollo Bunder, Colaba, Mumbai', latitude: 18.9217, longitude: 72.8329 },
      { name: 'Trident Nariman Point', category: '5-star', rating: 4.5, pricePerNight: 9500, amenities: ['Wi-Fi', 'Pool', 'Breakfast'], address: 'Nariman Point, Mumbai', latitude: 18.9289, longitude: 72.8217 },
      { name: 'Hotel Residency Fort', category: '3-star', rating: 4.0, pricePerNight: 3200, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Fort, Mumbai', latitude: 18.9330, longitude: 72.8310 },
      { name: 'Grand Hotel Mumbai', category: '3-star', rating: 3.9, pricePerNight: 2800, amenities: ['Wi-Fi', 'AC'], address: 'Ballard Estate, Mumbai', latitude: 18.9434, longitude: 72.8329 },
    ],
    restaurants: [
      { name: 'Britannia & Co.', cuisine: ['Irani', 'Parsi', 'Biryani'], rating: 4.5, priceLevel: 2, averageCostPerPerson: 600, address: 'Ballard Estate, Mumbai', latitude: 18.9440, longitude: 72.8350 },
      { name: 'Cafe Mondegar', cuisine: ['Cafe', 'Continental'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 500, address: 'Colaba Causeway, Mumbai', latitude: 18.9220, longitude: 72.8280 },
      { name: 'Leopold Cafe', cuisine: ['Cafe', 'Continental'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 550, address: 'Colaba Causeway, Mumbai', latitude: 18.9210, longitude: 72.8280 },
      { name: 'Trishna', cuisine: ['Seafood', 'Coastal'], rating: 4.5, priceLevel: 3, averageCostPerPerson: 1200, address: 'Fort, Mumbai', latitude: 18.9260, longitude: 72.8310 },
    ],
    cafes: [
      { name: 'Leopold Cafe', cuisine: ['Cafe'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 550, address: 'Colaba Causeway, Mumbai', latitude: 18.9210, longitude: 72.8280 },
      { name: 'Kala Ghoda Cafe', cuisine: ['Cafe', 'Bakery'], rating: 4.2, priceLevel: 2, averageCostPerPerson: 500, address: 'Kala Ghoda, Fort, Mumbai', latitude: 18.9280, longitude: 72.8320 },
    ],
    nightlife: [],
    attractions: [
      { name: 'Gateway of India', category: 'Landmark', rating: 4.6, entryFee: 0, durationHours: 1, address: 'Apollo Bunder, Mumbai', latitude: 18.922, longitude: 72.8347, types: ['tourism.attraction', 'monument'] },
      { name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya', category: 'Museum', rating: 4.5, entryFee: 100, durationHours: 2, address: 'Fort, Mumbai', latitude: 18.9268, longitude: 72.8324, types: ['tourism.museum'] },
      { name: 'Marine Drive', category: 'Promenade / Evening', rating: 4.6, entryFee: 0, durationHours: 1, address: 'Marine Drive, Mumbai', latitude: 18.9439, longitude: 72.8233, types: ['tourism.attraction', 'waterfront'] },
      { name: 'Elephanta Caves', category: 'Heritage', rating: 4.4, entryFee: 250, durationHours: 3, address: 'Elephanta Island, Mumbai Harbour', latitude: 18.9633, longitude: 72.931, types: ['tourism.attraction', 'heritage'] },
      { name: 'Haji Ali Dargah', category: 'Religious', rating: 4.4, entryFee: 0, durationHours: 1, address: 'Worli, Mumbai', latitude: 18.9823, longitude: 72.8099, types: ['tourism.attraction', 'religious'] },
      { name: 'Juhu Beach', category: 'Beach / Evening', rating: 4.2, entryFee: 0, durationHours: 1.5, address: 'Juhu, Mumbai', latitude: 19.097, longitude: 72.825, types: ['natural.beach'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 18, busFare: 15, taxiStart: 60, taxiPerKm: 25 },
  },

  delhi: {
    name: 'Delhi', state: 'Delhi', country: 'India', countryCode: 'IN',
    latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', radiusKm: 45,
    localityLabels: ['Connaught Place', 'Old Delhi', 'Hauz Khas', 'Karol Bagh', 'Chanakyapuri'],
    hotels: [
      { name: 'The Imperial New Delhi', category: '5-star', rating: 4.6, pricePerNight: 11000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Janpath, Connaught Place, New Delhi', latitude: 28.6234, longitude: 77.2134 },
      { name: 'The Leela Palace', category: '5-star', rating: 4.7, pricePerNight: 13000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Diplomatic Enclave, Chanakyapuri, New Delhi', latitude: 28.6015, longitude: 77.192 },
      { name: 'Hotel City Star', category: '3-star', rating: 4.1, pricePerNight: 2200, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Paharganj, New Delhi', latitude: 28.64, longitude: 77.241 },
      { name: 'The Metropolitan Hotel & Spa', category: '4-star', rating: 4.2, pricePerNight: 5500, amenities: ['Wi-Fi', 'Pool', 'Breakfast'], address: 'Bangla Sahib Road, Connaught Place, New Delhi', latitude: 28.626, longitude: 77.208 },
    ],
    restaurants: [
      { name: "Karim's", cuisine: ['Mughlai', 'North Indian'], rating: 4.5, priceLevel: 2, averageCostPerPerson: 600, address: 'Gali Kababian, Jama Masjid, Old Delhi', latitude: 28.649, longitude: 77.239 },
      { name: 'Paranthe Wali Gali', cuisine: ['North Indian', 'Street Food'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 250, address: 'Chandni Chowk, Old Delhi', latitude: 28.651, longitude: 77.235 },
      { name: 'Indian Accent', cuisine: ['Modern Indian'], rating: 4.7, priceLevel: 4, averageCostPerPerson: 3500, address: 'The Manor, Friends Colony, New Delhi', latitude: 28.568, longitude: 77.18 },
      { name: 'Bukhara', cuisine: ['North Indian', 'Tandoor'], rating: 4.6, priceLevel: 4, averageCostPerPerson: 3000, address: 'ITC Maurya, Chanakyapuri, New Delhi', latitude: 28.593, longitude: 77.188 },
    ],
    cafes: [
      { name: 'The Grammar Room', cuisine: ['Cafe', 'Continental'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 600, address: 'Khan Market, New Delhi', latitude: 28.598, longitude: 77.226 },
      { name: 'Kunzum Travel Cafe', cuisine: ['Cafe'], rating: 4.2, priceLevel: 1, averageCostPerPerson: 300, address: 'Hauz Khas Village, New Delhi', latitude: 28.549, longitude: 77.2 },
    ],
    nightlife: [],
    attractions: [
      { name: 'Red Fort', category: 'Heritage', rating: 4.5, entryFee: 50, durationHours: 2, address: 'Chandni Chowk, Old Delhi', latitude: 28.6562, longitude: 77.241, types: ['tourism.attraction', 'heritage'] },
      { name: 'India Gate', category: 'Landmark', rating: 4.6, entryFee: 0, durationHours: 1, address: 'Rajpath, New Delhi', latitude: 28.6129, longitude: 77.2295, types: ['tourism.attraction', 'monument'] },
      { name: 'Qutub Minar', category: 'Heritage', rating: 4.5, entryFee: 35, durationHours: 1.5, address: 'Mehrauli, New Delhi', latitude: 28.5244, longitude: 77.1855, types: ['tourism.attraction', 'heritage'] },
      { name: "Humayun's Tomb", category: 'Heritage', rating: 4.5, entryFee: 40, durationHours: 1.5, address: 'Nizamuddin East, New Delhi', latitude: 28.5933, longitude: 77.2507, types: ['tourism.attraction', 'heritage'] },
      { name: 'Lotus Temple', category: 'Architecture / Religious', rating: 4.5, entryFee: 0, durationHours: 1, address: 'Kalkaji, New Delhi', latitude: 28.5535, longitude: 77.2588, types: ['tourism.attraction', 'religious'] },
      { name: 'Akshardham Temple', category: 'Religious / Cultural', rating: 4.7, entryFee: 0, durationHours: 2.5, address: 'NH 24, Akshardham, New Delhi', latitude: 28.6127, longitude: 77.2773, types: ['tourism.attraction', 'religious'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 10, taxiStart: 50, taxiPerKm: 20 },
  },

  bengaluru: {
    name: 'Bengaluru', state: 'Karnataka', country: 'India', countryCode: 'IN',
    latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', radiusKm: 40,
    localityLabels: ['MG Road', 'Basavanagudi', 'Indiranagar', 'Jayanagar', 'Malleshwaram'],
    hotels: [
      { name: 'The Taj West End', category: '5-star', rating: 4.6, pricePerNight: 12000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Race Course Road, Bengaluru', latitude: 12.969, longitude: 77.588 },
      { name: 'ITC Gardenia', category: '5-star', rating: 4.6, pricePerNight: 11000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Residency Road, Bengaluru', latitude: 12.957, longitude: 77.593 },
      { name: 'Hotel Royal Orchid Central', category: '4-star', rating: 4.1, pricePerNight: 4500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'MG Road, Bengaluru', latitude: 12.966, longitude: 77.62 },
    ],
    restaurants: [
      { name: 'MTR 1924', cuisine: ['South Indian', 'Udupi'], rating: 4.5, priceLevel: 1, averageCostPerPerson: 300, address: 'Lalbagh Road, Basavanagudi, Bengaluru', latitude: 12.958, longitude: 77.594 },
      { name: 'Vidyarthi Bhavan', cuisine: ['South Indian'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 250, address: 'Gandhi Bazaar, Basavanagudi, Bengaluru', latitude: 12.954, longitude: 77.59 },
      { name: 'CTR Sri Sagar', cuisine: ['South Indian'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 250, address: 'Malleshwaram, Bengaluru', latitude: 12.961, longitude: 77.585 },
      { name: 'Toit Brewpub', cuisine: ['Continental', 'Craft Beer'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 800, address: 'Indiranagar, Bengaluru', latitude: 12.97, longitude: 77.607 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Lalbagh Botanical Garden', category: 'Garden', rating: 4.6, entryFee: 30, durationHours: 2, address: 'Mavalli, Bengaluru', latitude: 12.9507, longitude: 77.5848, types: ['tourism.attraction', 'park'] },
      { name: 'Cubbon Park', category: 'Garden', rating: 4.5, entryFee: 0, durationHours: 1.5, address: 'Kasturba Road, Bengaluru', latitude: 12.976, longitude: 77.592, types: ['tourism.attraction', 'park'] },
      { name: 'Bangalore Palace', category: 'Heritage', rating: 4.3, entryFee: 250, durationHours: 1.5, address: 'Vasanth Nagar, Bengaluru', latitude: 12.9985, longitude: 77.5925, types: ['tourism.attraction', 'heritage'] },
      { name: 'ISKCON Temple', category: 'Religious', rating: 4.6, entryFee: 0, durationHours: 1.5, address: 'Rajajinagar, Bengaluru', latitude: 13.01, longitude: 77.551, types: ['tourism.attraction', 'religious'] },
      { name: 'Vidhana Soudha', category: 'Architecture', rating: 4.4, entryFee: 0, durationHours: 1, address: 'Dr Ambedkar Veedhi, Bengaluru', latitude: 12.979, longitude: 77.59, types: ['tourism.attraction', 'monument'] },
      { name: 'Nandi Hills', category: 'Nature / Viewpoint', rating: 4.5, entryFee: 100, durationHours: 3, address: 'Chikkaballapur, Bengaluru Rural', latitude: 13.37, longitude: 77.684, types: ['tourism.viewpoint', 'natural'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 15, taxiStart: 60, taxiPerKm: 22 },
  },

  hyderabad: {
    name: 'Hyderabad', state: 'Telangana', country: 'India', countryCode: 'IN',
    latitude: 17.385, longitude: 78.4867, timezone: 'Asia/Kolkata', radiusKm: 40,
    localityLabels: ['Banjara Hills', 'Jubilee Hills', 'Charminar', 'Secunderabad', 'Madhapur'],
    hotels: [
      { name: 'Taj Falaknuma Palace', category: '5-star', rating: 4.8, pricePerNight: 18000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Falaknuma, Hyderabad', latitude: 17.332, longitude: 78.468 },
      { name: 'ITC Kohenur', category: '5-star', rating: 4.6, pricePerNight: 10000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Financial District, Hyderabad', latitude: 17.419, longitude: 78.455 },
      { name: 'Hotel Minerva Grand', category: '3-star', rating: 4.0, pricePerNight: 2800, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Banjara Hills, Hyderabad', latitude: 17.418, longitude: 78.442 },
    ],
    restaurants: [
      { name: 'Paradise Biryani', cuisine: ['Hyderabadi', 'Biryani'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 500, address: 'Paradise Circle, Secunderabad', latitude: 17.442, longitude: 78.377 },
      { name: 'Bawarchi', cuisine: ['Hyderabadi', 'Biryani'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 450, address: 'RTC X Roads, Hyderabad', latitude: 17.451, longitude: 78.381 },
      { name: 'Shah Ghouse', cuisine: ['Hyderabadi', 'Mughlai'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 350, address: 'Tolichowki, Hyderabad', latitude: 17.366, longitude: 78.474 },
      { name: 'Chutneys', cuisine: ['South Indian', 'Andhra'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 300, address: 'Somajiguda, Hyderabad', latitude: 17.437, longitude: 78.438 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Charminar', category: 'Heritage / Landmark', rating: 4.6, entryFee: 10, durationHours: 1, address: 'Old City, Hyderabad', latitude: 17.3616, longitude: 78.4747, types: ['tourism.attraction', 'heritage'] },
      { name: 'Golconda Fort', category: 'Heritage', rating: 4.5, entryFee: 15, durationHours: 2.5, address: 'Ibrahim Bagh, Hyderabad', latitude: 17.3833, longitude: 78.4011, types: ['tourism.attraction', 'heritage'] },
      { name: 'Hussain Sagar Lake', category: 'Leisure / Evening', rating: 4.3, entryFee: 0, durationHours: 1.5, address: 'Tank Bund, Hyderabad', latitude: 17.4239, longitude: 78.4738, types: ['tourism.attraction', 'natural'] },
      { name: 'Salar Jung Museum', category: 'Museum', rating: 4.5, entryFee: 30, durationHours: 2.5, address: 'Darulshifa, Hyderabad', latitude: 17.371, longitude: 78.48, types: ['tourism.museum'] },
      { name: 'Birla Mandir', category: 'Religious', rating: 4.5, entryFee: 0, durationHours: 1, address: 'Naubat Pahad, Hyderabad', latitude: 17.407, longitude: 78.47, types: ['tourism.attraction', 'religious'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 60, taxiPerKm: 20 },
  },

  pune: {
    name: 'Pune', state: 'Maharashtra', country: 'India', countryCode: 'IN',
    latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', radiusKm: 40,
    localityLabels: ['Koregaon Park', 'Camp', 'Shivajinagar', 'Deccan', 'Viman Nagar'],
    hotels: [
      { name: 'The Westin Pune', category: '5-star', rating: 4.5, pricePerNight: 9000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Koregaon Park, Pune', latitude: 18.516, longitude: 73.894 },
      { name: 'Hyatt Regency Pune', category: '5-star', rating: 4.5, pricePerNight: 8500, amenities: ['Wi-Fi', 'Pool', 'Breakfast'], address: 'Weikfield IT Park, Nagar Road, Pune', latitude: 18.505, longitude: 73.889 },
      { name: 'Hotel Blue Nile', category: '3-star', rating: 4.0, pricePerNight: 2500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Camp, Pune', latitude: 18.519, longitude: 73.856 },
    ],
    restaurants: [
      { name: 'Shabree', cuisine: ['Maharashtrian', 'Thali'], rating: 4.5, priceLevel: 1, averageCostPerPerson: 350, address: 'FC Road, Shivajinagar, Pune', latitude: 18.52, longitude: 73.855 },
      { name: 'Vaishali', cuisine: ['South Indian', 'Fast Food'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'FC Road, Shivajinagar, Pune', latitude: 18.52, longitude: 73.856 },
      { name: 'Marz-O-Rin', cuisine: ['Parsi', 'Bakery'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 300, address: 'East Street, Camp, Pune', latitude: 18.521, longitude: 73.856 },
      { name: 'German Bakery', cuisine: ['Bakery', 'Cafe'], rating: 4.2, priceLevel: 1, averageCostPerPerson: 350, address: 'Koregaon Park, Pune', latitude: 18.525, longitude: 73.837 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Shaniwar Wada', category: 'Heritage', rating: 4.4, entryFee: 25, durationHours: 1.5, address: 'Shaniwar Peth, Pune', latitude: 18.5195, longitude: 73.8553, types: ['tourism.attraction', 'heritage'] },
      { name: 'Sinhagad Fort', category: 'Heritage / Trek', rating: 4.5, entryFee: 25, durationHours: 3, address: 'Sinhagad Road, Pune', latitude: 18.365, longitude: 73.755, types: ['tourism.attraction', 'heritage'] },
      { name: 'Aga Khan Palace', category: 'Heritage / Museum', rating: 4.5, entryFee: 20, durationHours: 1.5, address: 'Yerwada, Pune', latitude: 18.552, longitude: 73.901, types: ['tourism.attraction', 'heritage'] },
      { name: 'Dagdusheth Ganpati', category: 'Religious', rating: 4.5, entryFee: 0, durationHours: 1, address: 'Budhwar Peth, Pune', latitude: 18.516, longitude: 73.856, types: ['tourism.attraction', 'religious'] },
      { name: 'Parvati Hill', category: 'Viewpoint / Religious', rating: 4.4, entryFee: 0, durationHours: 1.5, address: 'Parvati Paytha, Pune', latitude: 18.495, longitude: 73.84, types: ['tourism.viewpoint'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 50, taxiPerKm: 18 },
  },

  jaipur: {
    name: 'Jaipur', state: 'Rajasthan', country: 'India', countryCode: 'IN',
    latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata', radiusKm: 45,
    localityLabels: ['Pink City', 'MI Road', 'C-Scheme', 'Malviya Nagar', 'Amer'],
    hotels: [
      { name: 'Rambagh Palace', category: '5-star', rating: 4.7, pricePerNight: 16000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Bhawani Singh Road, Jaipur', latitude: 26.883, longitude: 75.805 },
      { name: 'Umaid Bhawan Heritage House', category: 'Heritage', rating: 4.5, pricePerNight: 3500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'D1-2A, Sardar Patel Marg, Jaipur', latitude: 26.893, longitude: 75.805 },
      { name: 'Hotel Pearl Palace', category: '3-star', rating: 4.2, pricePerNight: 2200, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Hathroi Fort, Jaipur', latitude: 26.887, longitude: 75.805 },
    ],
    restaurants: [
      { name: 'Laxmi Misthan Bhandar', cuisine: ['Rajasthani', 'Sweets'], rating: 4.5, priceLevel: 1, averageCostPerPerson: 250, address: 'Johari Bazaar, Jaipur', latitude: 26.923, longitude: 75.824 },
      { name: 'Chokhi Dhani', cuisine: ['Rajasthani', 'Thali'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 800, address: 'Tonk Road, Jaipur', latitude: 26.851, longitude: 75.949 },
      { name: 'Natraj', cuisine: ['Rajasthani', 'North Indian'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 350, address: 'MI Road, Jaipur', latitude: 26.908, longitude: 75.813 },
      { name: 'Surya Mahal', cuisine: ['Rajasthani', 'Thali'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 400, address: 'MI Road, Jaipur', latitude: 26.911, longitude: 75.792 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Amber Fort', category: 'Heritage', rating: 4.6, entryFee: 100, durationHours: 2.5, address: 'Amer, Jaipur', latitude: 26.9856, longitude: 75.8512, types: ['tourism.attraction', 'heritage'] },
      { name: 'Hawa Mahal', category: 'Heritage / Landmark', rating: 4.4, entryFee: 50, durationHours: 1, address: 'Hawa Mahal Road, Jaipur', latitude: 26.9239, longitude: 75.8267, types: ['tourism.attraction', 'heritage'] },
      { name: 'City Palace', category: 'Heritage / Museum', rating: 4.5, entryFee: 200, durationHours: 2, address: 'Tripolia Bazaar, Jaipur', latitude: 26.9257, longitude: 75.8237, types: ['tourism.attraction', 'heritage'] },
      { name: 'Jantar Mantar', category: 'Heritage / Observatory', rating: 4.4, entryFee: 50, durationHours: 1.5, address: 'Tripolia Bazaar, Jaipur', latitude: 26.9247, longitude: 75.8247, types: ['tourism.attraction', 'heritage'] },
      { name: 'Nahargarh Fort', category: 'Heritage / Viewpoint', rating: 4.4, entryFee: 50, durationHours: 2, address: 'Amer Road, Jaipur', latitude: 26.937, longitude: 75.816, types: ['tourism.attraction', 'heritage'] },
      { name: 'Jal Mahal', category: 'Landmark / Lake', rating: 4.3, entryFee: 0, durationHours: 1, address: 'Amer Road, Jaipur', latitude: 26.9534, longitude: 75.8465, types: ['tourism.attraction', 'monument'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 60, taxiPerKm: 18 },
  },

  goa: {
    name: 'Goa', state: 'Goa', country: 'India', countryCode: 'IN',
    latitude: 15.4989, longitude: 73.8278, timezone: 'Asia/Kolkata', radiusKm: 60,
    localityLabels: ['Panaji', 'Candolim', 'Baga', 'Anjuna', 'Old Goa'],
    hotels: [
      { name: 'Taj Vivanta Panaji', category: '4-star', rating: 4.4, pricePerNight: 6500, amenities: ['Wi-Fi', 'Pool', 'Breakfast'], address: 'Dr D B Bandodkar Marg, Panaji, Goa', latitude: 15.498, longitude: 73.823 },
      { name: 'Hotel Mandovi', category: '3-star', rating: 4.0, pricePerNight: 3500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Panaji, Goa', latitude: 15.496, longitude: 73.823 },
      { name: 'Casa Menezes', category: 'Homestay', rating: 4.3, pricePerNight: 2500, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Fontainhas, Panaji, Goa', latitude: 15.496, longitude: 73.823 },
    ],
    restaurants: [
      { name: 'Vinayak Family Restaurant', cuisine: ['Goan', 'Coastal'], rating: 4.5, priceLevel: 2, averageCostPerPerson: 500, address: 'Assagao, Goa', latitude: 15.596, longitude: 73.75 },
      { name: 'Ritz Classic', cuisine: ['Goan', 'Seafood'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 600, address: 'Panaji, Goa', latitude: 15.496, longitude: 73.826 },
      { name: 'Peep Kitchen', cuisine: ['Goan', 'Continental'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 550, address: 'Panaji, Goa', latitude: 15.49, longitude: 73.824 },
      { name: 'Fish Thali Stop', cuisine: ['Goan', 'Thali'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'Panaji, Goa', latitude: 15.494, longitude: 73.821 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Basilica of Bom Jesus', category: 'Heritage / Religious', rating: 4.6, entryFee: 0, durationHours: 1, address: 'Old Goa', latitude: 15.5008, longitude: 73.9117, types: ['tourism.attraction', 'religious'] },
      { name: 'Fort Aguada', category: 'Heritage', rating: 4.5, entryFee: 0, durationHours: 1.5, address: 'Candolim, Goa', latitude: 15.4928, longitude: 73.7638, types: ['tourism.attraction', 'heritage'] },
      { name: 'Baga Beach', category: 'Beach / Evening', rating: 4.4, entryFee: 0, durationHours: 2, address: 'Baga, Goa', latitude: 15.555, longitude: 73.751, types: ['natural.beach'] },
      { name: 'Calangute Beach', category: 'Beach', rating: 4.2, entryFee: 0, durationHours: 2, address: 'Calangute, Goa', latitude: 15.544, longitude: 73.755, types: ['natural.beach'] },
      { name: 'Anjuna Flea Market', category: 'Market / Evening', rating: 4.1, entryFee: 0, durationHours: 2, address: 'Anjuna, Goa', latitude: 15.569, longitude: 73.741, types: ['commercial.marketplace'] },
      { name: 'Chapora Fort', category: 'Heritage / Viewpoint', rating: 4.3, entryFee: 0, durationHours: 1.5, address: 'Chapora, Goa', latitude: 15.597, longitude: 73.733, types: ['tourism.attraction', 'heritage'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 15, taxiStart: 100, taxiPerKm: 25 },
  },

  chennai: {
    name: 'Chennai', state: 'Tamil Nadu', country: 'India', countryCode: 'IN',
    latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata', radiusKm: 45,
    localityLabels: ['Mylapore', 'T Nagar', 'Nungambakkam', 'Egmore', 'Besant Nagar'],
    hotels: [
      { name: 'The Leela Palace Chennai', category: '5-star', rating: 4.6, pricePerNight: 11000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Adyar, Chennai', latitude: 12.998, longitude: 80.248 },
      { name: 'ITC Grand Chola', category: '5-star', rating: 4.6, pricePerNight: 9500, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Guindy, Chennai', latitude: 13.007, longitude: 80.249 },
      { name: 'Hotel Savera', category: '4-star', rating: 4.1, pricePerNight: 4200, amenities: ['Wi-Fi', 'AC', 'Pool', 'Breakfast'], address: 'Egmore, Chennai', latitude: 13.042, longitude: 80.244 },
    ],
    restaurants: [
      { name: 'Saravana Bhavan', cuisine: ['South Indian', 'Vegetarian'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 250, address: 'T Nagar, Chennai', latitude: 13.059, longitude: 80.251 },
      { name: 'Murugan Idli Shop', cuisine: ['South Indian'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 200, address: 'T Nagar, Chennai', latitude: 13.056, longitude: 80.242 },
      { name: 'Junior Kuppanna', cuisine: ['South Indian', 'Chettinad'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 400, address: 'Anna Nagar, Chennai', latitude: 13.005, longitude: 80.22 },
      { name: 'Ratna Cafe', cuisine: ['South Indian', 'Filter Coffee'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'Triplicane, Chennai', latitude: 13.039, longitude: 80.259 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Marina Beach', category: 'Beach / Evening', rating: 4.4, entryFee: 0, durationHours: 1.5, address: 'Marina, Chennai', latitude: 13.05, longitude: 80.282, types: ['natural.beach'] },
      { name: 'Kapaleeshwarar Temple', category: 'Religious / Heritage', rating: 4.5, entryFee: 0, durationHours: 1.5, address: 'Mylapore, Chennai', latitude: 13.0337, longitude: 80.2705, types: ['tourism.attraction', 'religious'] },
      { name: 'Fort St. George', category: 'Heritage / Museum', rating: 4.2, entryFee: 100, durationHours: 1.5, address: 'Fort, Chennai', latitude: 13.0797, longitude: 80.287, types: ['tourism.attraction', 'heritage'] },
      { name: 'Shore Temple, Mahabalipuram', category: 'Heritage', rating: 4.5, entryFee: 40, durationHours: 2, address: 'Mahabalipuram, Chennai', latitude: 12.6165, longitude: 80.199, types: ['tourism.attraction', 'heritage'] },
      { name: 'Government Museum Chennai', category: 'Museum', rating: 4.3, entryFee: 50, durationHours: 2, address: 'Egmore, Chennai', latitude: 13.071, longitude: 80.257, types: ['tourism.museum'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 60, taxiPerKm: 20 },
  },

  kolkata: {
    name: 'Kolkata', state: 'West Bengal', country: 'India', countryCode: 'IN',
    latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata', radiusKm: 40,
    localityLabels: ['Park Street', 'Chowringhee', 'BBD Bagh', 'Salt Lake', 'New Market'],
    hotels: [
      { name: 'The Oberoi Grand', category: '5-star', rating: 4.6, pricePerNight: 10000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Chowringhee, Kolkata', latitude: 22.566, longitude: 88.348 },
      { name: 'Taj Bengal', category: '5-star', rating: 4.5, pricePerNight: 9500, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Alipore, Kolkata', latitude: 22.539, longitude: 88.357 },
      { name: 'Hotel Lindsay', category: '3-star', rating: 4.0, pricePerNight: 3000, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Chowringhee, Kolkata', latitude: 22.566, longitude: 88.353 },
    ],
    restaurants: [
      { name: 'Indian Coffee House', cuisine: ['Cafe', 'Snacks'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 200, address: 'College Street, Kolkata', latitude: 22.578, longitude: 88.357 },
      { name: 'Arsalan', cuisine: ['Mughlai', 'Biryani'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 500, address: 'Park Circus, Kolkata', latitude: 22.552, longitude: 88.369 },
      { name: "Kewpie's", cuisine: ['Anglo-Indian', 'Continental'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 600, address: 'Free School Street, Kolkata', latitude: 22.558, longitude: 88.357 },
      { name: 'Flurys', cuisine: ['Bakery', 'Cafe'], rating: 4.3, priceLevel: 2, averageCostPerPerson: 450, address: 'Park Street, Kolkata', latitude: 22.557, longitude: 88.357 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Victoria Memorial', category: 'Heritage / Museum', rating: 4.6, entryFee: 30, durationHours: 2, address: 'Maidan, Kolkata', latitude: 22.5448, longitude: 88.3425, types: ['tourism.attraction', 'heritage'] },
      { name: 'Howrah Bridge', category: 'Landmark', rating: 4.6, entryFee: 0, durationHours: 1, address: 'Howrah, Kolkata', latitude: 22.5851, longitude: 88.3469, types: ['tourism.attraction', 'monument'] },
      { name: 'Dakshineswar Kali Temple', category: 'Religious', rating: 4.5, entryFee: 0, durationHours: 1.5, address: 'Dakshineswar, Kolkata', latitude: 22.656, longitude: 88.357, types: ['tourism.attraction', 'religious'] },
      { name: 'Indian Museum', category: 'Museum', rating: 4.4, entryFee: 50, durationHours: 2.5, address: 'Park Street, Kolkata', latitude: 22.558, longitude: 88.351, types: ['tourism.museum'] },
      { name: 'Belur Math', category: 'Religious', rating: 4.6, entryFee: 0, durationHours: 1.5, address: 'Belur, Howrah', latitude: 22.632, longitude: 88.356, types: ['tourism.attraction', 'religious'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 50, taxiPerKm: 20 },
  },

  udaipur: {
    name: 'Udaipur', state: 'Rajasthan', country: 'India', countryCode: 'IN',
    latitude: 24.5854, longitude: 73.7125, timezone: 'Asia/Kolkata', radiusKm: 35,
    localityLabels: ['Old City', 'Lake Pichola', 'Fateh Sagar', 'Hiran Magri', 'Ambamata'],
    hotels: [
      { name: 'Taj Lake Palace', category: '5-star', rating: 4.8, pricePerNight: 20000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Lake Pichola, Udaipur', latitude: 24.576, longitude: 73.681 },
      { name: 'The Leela Palace Udaipur', category: '5-star', rating: 4.7, pricePerNight: 17000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Lake Pichola, Udaipur', latitude: 24.574, longitude: 73.686 },
      { name: 'Hotel Jagat Niwas', category: 'Heritage', rating: 4.4, pricePerNight: 4000, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Old City, Udaipur', latitude: 24.575, longitude: 73.682 },
    ],
    restaurants: [
      { name: 'Mewar Haveli', cuisine: ['Rajasthani', 'Thali'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 600, address: 'Chandpole, Udaipur', latitude: 24.575, longitude: 73.684 },
      { name: 'Upre by 1559 AD', cuisine: ['Rajasthani', 'Continental'], rating: 4.5, priceLevel: 3, averageCostPerPerson: 900, address: 'Lake Pichola, Udaipur', latitude: 24.574, longitude: 73.686 },
      { name: 'Ambrai', cuisine: ['Rajasthani', 'North Indian'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 800, address: 'Hanuman Ghat, Udaipur', latitude: 24.578, longitude: 73.685 },
      { name: 'Jheel\'s Rooftop', cuisine: ['Rajasthani', 'Cafe'], rating: 4.2, priceLevel: 1, averageCostPerPerson: 400, address: 'Lake Pichola, Udaipur', latitude: 24.575, longitude: 73.683 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'City Palace', category: 'Heritage / Museum', rating: 4.6, entryFee: 300, durationHours: 2.5, address: 'Old City, Udaipur', latitude: 24.5765, longitude: 73.6832, types: ['tourism.attraction', 'heritage'] },
      { name: 'Lake Pichola', category: 'Lake / Evening', rating: 4.7, entryFee: 0, durationHours: 1.5, address: 'Old City, Udaipur', latitude: 24.572, longitude: 73.679, types: ['tourism.attraction', 'natural'] },
      { name: 'Jag Mandir', category: 'Heritage', rating: 4.4, entryFee: 0, durationHours: 1, address: 'Lake Pichola, Udaipur', latitude: 24.566, longitude: 73.683, types: ['tourism.attraction', 'heritage'] },
      { name: 'Sajjangarh Monsoon Palace', category: 'Heritage / Viewpoint', rating: 4.5, entryFee: 100, durationHours: 2, address: 'Sajjangarh, Udaipur', latitude: 24.601, longitude: 73.641, types: ['tourism.attraction', 'heritage'] },
      { name: 'Fateh Sagar Lake', category: 'Lake / Evening', rating: 4.5, entryFee: 0, durationHours: 1.5, address: 'Fateh Sagar, Udaipur', latitude: 24.596, longitude: 73.672, types: ['tourism.attraction', 'natural'] },
      { name: 'Saheliyon Ki Bari', category: 'Garden', rating: 4.3, entryFee: 20, durationHours: 1.5, address: 'Panchwati, Udaipur', latitude: 24.589, longitude: 73.671, types: ['tourism.attraction', 'park'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 60, taxiPerKm: 18 },
  },

  agra: {
    name: 'Agra', state: 'Uttar Pradesh', country: 'India', countryCode: 'IN',
    latitude: 27.1767, longitude: 78.0081, timezone: 'Asia/Kolkata', radiusKm: 40,
    localityLabels: ['Taj Ganj', 'Rakabganj', 'Civil Lines', 'Sadar Bazaar', 'Dayalbagh'],
    hotels: [
      { name: 'The Oberoi Amarvilas', category: '5-star', rating: 4.7, pricePerNight: 15000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Taj East Gate Road, Agra', latitude: 27.164, longitude: 78.026 },
      { name: 'ITC Mughal', category: '5-star', rating: 4.5, pricePerNight: 7000, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Fatehabad Road, Agra', latitude: 27.158, longitude: 78.041 },
      { name: 'Hotel Amar', category: '3-star', rating: 4.0, pricePerNight: 2000, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Fatehabad Road, Agra', latitude: 27.161, longitude: 78.042 },
    ],
    restaurants: [
      { name: 'Pinch of Spice', cuisine: ['North Indian', 'Mughlai'], rating: 4.4, priceLevel: 2, averageCostPerPerson: 500, address: 'Fatehabad Road, Agra', latitude: 27.162, longitude: 78.042 },
      { name: 'Esphahan', cuisine: ['Mughlai', 'Fine Dining'], rating: 4.5, priceLevel: 3, averageCostPerPerson: 1500, address: 'The Oberoi Amarvilas, Agra', latitude: 27.164, longitude: 78.026 },
      { name: 'Joney\'s Place', cuisine: ['Indian', 'Cafe'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 250, address: 'Taj Ganj, Agra', latitude: 27.169, longitude: 78.034 },
      { name: 'Shankara Vegis', cuisine: ['Vegetarian', 'North Indian'], rating: 4.2, priceLevel: 1, averageCostPerPerson: 300, address: 'Fatehabad Road, Agra', latitude: 27.16, longitude: 78.043 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Taj Mahal', category: 'Heritage / Landmark', rating: 4.8, entryFee: 50, durationHours: 2.5, address: 'Taj Ganj, Agra', latitude: 27.1751, longitude: 78.0421, types: ['tourism.attraction', 'heritage'] },
      { name: 'Agra Fort', category: 'Heritage', rating: 4.6, entryFee: 40, durationHours: 2, address: 'Rakabganj, Agra', latitude: 27.1795, longitude: 78.0211, types: ['tourism.attraction', 'heritage'] },
      { name: 'Fatehpur Sikri', category: 'Heritage', rating: 4.5, entryFee: 40, durationHours: 3, address: 'Fatehpur Sikri, Agra', latitude: 27.0947, longitude: 77.6687, types: ['tourism.attraction', 'heritage'] },
      { name: 'Itmad-ud-Daulah', category: 'Heritage', rating: 4.4, entryFee: 30, durationHours: 1.5, address: 'Yamuna Riverfront, Agra', latitude: 27.1928, longitude: 78.0311, types: ['tourism.attraction', 'heritage'] },
      { name: 'Mehtab Bagh', category: 'Garden / Viewpoint', rating: 4.4, entryFee: 30, durationHours: 1.5, address: 'Yamuna Riverfront, Agra', latitude: 27.1796, longitude: 78.0418, types: ['tourism.attraction', 'park'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 50, taxiPerKm: 18 },
  },

  varanasi: {
    name: 'Varanasi', state: 'Uttar Pradesh', country: 'India', countryCode: 'IN',
    latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata', radiusKm: 35,
    localityLabels: ['Assi Ghat', 'Dashashwamedh Ghat', 'Godowlia', 'Cantt', 'Lanka'],
    hotels: [
      { name: 'Taj Ganges', category: '5-star', rating: 4.4, pricePerNight: 6500, amenities: ['Wi-Fi', 'Pool', 'Spa', 'Breakfast'], address: 'Nadesar Palace Grounds, Varanasi', latitude: 25.315, longitude: 82.982 },
      { name: 'BrijRama Palace', category: 'Heritage', rating: 4.6, pricePerNight: 8000, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Darbhanga Ghat, Varanasi', latitude: 25.309, longitude: 83.007 },
      { name: 'Hotel Alka', category: '3-star', rating: 4.0, pricePerNight: 2200, amenities: ['Wi-Fi', 'AC', 'Breakfast'], address: 'Meer Ghat, Varanasi', latitude: 25.311, longitude: 83.006 },
    ],
    restaurants: [
      { name: 'Keshari Restaurant', cuisine: ['North Indian', 'South Indian'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 300, address: 'Godowlia, Varanasi', latitude: 25.312, longitude: 83.002 },
      { name: 'Baati Chokha', cuisine: ['Bhojpuri', 'North Indian'], rating: 4.4, priceLevel: 1, averageCostPerPerson: 300, address: 'Assi Ghat, Varanasi', latitude: 25.289, longitude: 83.006 },
      { name: 'Blue Lassi Shop', cuisine: ['Cafe', 'Lassi'], rating: 4.3, priceLevel: 1, averageCostPerPerson: 150, address: 'Luxa Road, Varanasi', latitude: 25.312, longitude: 83.005 },
      { name: 'Shree Shivay Restaurant', cuisine: ['North Indian', 'Thali'], rating: 4.1, priceLevel: 1, averageCostPerPerson: 250, address: 'Assi Ghat, Varanasi', latitude: 25.29, longitude: 83.007 },
    ],
    cafes: [],
    nightlife: [],
    attractions: [
      { name: 'Dashashwamedh Ghat', category: 'Religious / Evening', rating: 4.6, entryFee: 0, durationHours: 2, address: 'Godowlia, Varanasi', latitude: 25.3076, longitude: 83.0092, types: ['tourism.attraction', 'religious'] },
      { name: 'Kashi Vishwanath Temple', category: 'Religious', rating: 4.7, entryFee: 0, durationHours: 1.5, address: 'Vishwanath Gali, Varanasi', latitude: 25.3108, longitude: 83.0108, types: ['tourism.attraction', 'religious'] },
      { name: 'Sarnath', category: 'Heritage / Buddhist', rating: 4.6, entryFee: 20, durationHours: 2.5, address: 'Sarnath, Varanasi', latitude: 25.3811, longitude: 83.0215, types: ['tourism.attraction', 'heritage'] },
      { name: 'Assi Ghat', category: 'Religious / Evening', rating: 4.4, entryFee: 0, durationHours: 1.5, address: 'Assi, Varanasi', latitude: 25.2887, longitude: 83.0058, types: ['tourism.attraction', 'religious'] },
      { name: 'Banaras Hindu University', category: 'Campus / Heritage', rating: 4.4, entryFee: 0, durationHours: 2, address: 'Lanka, Varanasi', latitude: 25.2677, longitude: 82.9913, types: ['tourism.attraction', 'campus'] },
      { name: 'Ramnagar Fort', category: 'Heritage', rating: 4.2, entryFee: 100, durationHours: 2, address: 'Ramnagar, Varanasi', latitude: 25.27, longitude: 83.028, types: ['tourism.attraction', 'heritage'] },
    ],
    localTransportRates: { autoStart: 30, autoPerKm: 15, busFare: 12, taxiStart: 50, taxiPerKm: 18 },
  },
};