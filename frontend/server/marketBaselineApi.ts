export interface NodeHttpRequest {
  url?: string;
  method?: string;
  on(event: 'data', listener: (chunk: unknown) => void): void;
  on(event: 'end' | 'error', listener: () => void): void;
}

export interface NodeHttpResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(data?: string): void;
}

export type SpatialBandKey = '0-300m' | '300m-2km' | '2-5km';

export type CategoricalLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'STRONG';

export interface NormalizedBaselinePlace {
  place_id: string;
  business_name: string;
  category: string;
  latitude: number;
  longitude: number;
  source: string;
  confidence?: 'HIGH' | 'MEDIUM';
  distance_m: number;
  spatial_band: SpatialBandKey;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
  evidence_type: 'DATABASE';
}

export interface SpatialBandSummary {
  band: SpatialBandKey;
  stage_label: 'GROUND REALITY' | 'LOCAL MARKET' | 'WIDER MARKET';
  min_m: number;
  max_m: number;
  count: number;
  places: NormalizedBaselinePlace[];
}

export interface BaselineFactorItem {
  level: CategoricalLevel;
  explanation: string;
  evidence_type: 'DATABASE';
}

export interface MarketBaselineResponse {
  candidate: {
    latitude: number;
    longitude: number;
    state: string;
    city: string;
    local_area: string;
    label: string;
  };
  business_type: string;
  business_category_key: string;
  target_customer: string;
  source: string;
  data_mode: 'LIVE' | 'DEMO';
  provider_status_note: string;
  evidence_type: 'DATABASE';
  total_mapped: number;
  places: NormalizedBaselinePlace[];
  bands: {
    '0-300m': SpatialBandSummary;
    '300m-2km': SpatialBandSummary;
    '2-5km': SpatialBandSummary;
  };
  factors: {
    commercial_activity: BaselineFactorItem;
    competition: BaselineFactorItem;
    accessibility: BaselineFactorItem;
    commercial_density: BaselineFactorItem;
    customer_fit: BaselineFactorItem;
    data_coverage: BaselineFactorItem;
  };
  data_coverage: {
    level: CategoricalLevel;
    summary: string;
    radii_queried_m: number[];
    deduplicated_count: number;
    provider_limit_note: string;
  };
  queried_at: string;
}

interface BusinessTypeMapping {
  key: string;
  displayLabel: string;
  pluralLabel: string;
  googleIncludedTypes: string[];
  googleLegacyType: string;
  googleKeyword: string;
  demoBrandPool: { name: string; subCategory: string }[];
}

const BUSINESS_TYPE_MAP: Record<string, BusinessTypeMapping> = {
  cafe: {
    key: 'cafe',
    displayLabel: 'Café',
    pluralLabel: 'cafés',
    googleIncludedTypes: ['cafe', 'coffee_shop'],
    googleLegacyType: 'cafe',
    googleKeyword: 'cafe coffee',
    demoBrandPool: [
      { name: 'Third Wave Coffee', subCategory: 'Specialty Coffee & Roastery' },
      { name: 'Blue Tokai Coffee Roasters', subCategory: 'Artisanal Café' },
      { name: 'Starbucks Reserve', subCategory: 'International Coffeehouse' },
      { name: 'Roastery Coffee House', subCategory: 'Neighborhood Courtyard Café' },
      { name: 'True Black Specialty Coffee', subCategory: 'Espresso & Pour-over Bar' },
      { name: 'Theory Café & Kitchen', subCategory: 'All-day Bistro Café' },
      { name: 'Chai Point', subCategory: 'Tea & Quick Beverage Café' },
      { name: 'Subko Craft Coffee Node', subCategory: 'Specialty Bakehouse & Café' },
      { name: 'Concu Patisserie & Café', subCategory: 'Dessert & Coffee Lounge' },
      { name: 'Brew & Bake Studio', subCategory: 'Independent Local Café' },
      { name: 'Filter & Foam House', subCategory: 'Commuter Coffee Kiosk' },
      { name: 'Araku Coffee Bar', subCategory: 'Single-Origin Café' },
      { name: 'Cafe Niloufer Express', subCategory: 'High-footfall Tea & Café' },
      { name: 'Good Earth Artisan Café', subCategory: 'Boutique Retail Café' },
      { name: 'Katha Specialty Coffee', subCategory: 'Co-working Friendly Café' },
      { name: 'The Hole In The Wall Café', subCategory: 'Breakfast & Brunch Café' },
    ],
  },
  qsr: {
    key: 'qsr',
    displayLabel: 'Quick Service Restaurant',
    pluralLabel: 'quick-service restaurants',
    googleIncludedTypes: ['fast_food_restaurant', 'meal_takeaway'],
    googleLegacyType: 'meal_takeaway',
    googleKeyword: 'fast food quick service restaurant',
    demoBrandPool: [
      { name: 'McDonald’s', subCategory: 'Global Burger QSR' },
      { name: 'KFC Express', subCategory: 'Quick Service Chicken' },
      { name: 'Burger King', subCategory: 'High-street QSR' },
      { name: 'Subway Fresh', subCategory: 'Sandwich & Salad Counter' },
      { name: 'Wow! Momo', subCategory: 'Fast Casual Street QSR' },
      { name: 'Taco Bell', subCategory: 'Quick Service Mexican' },
      { name: 'Domino’s Pizza', subCategory: 'Delivery & Carryout QSR' },
      { name: 'Haldiram’s Quick Bite', subCategory: 'Indian Fast Casual' },
      { name: 'California Burrito', subCategory: 'Fast Casual Bowl QSR' },
      { name: 'Faasos Kitchen Counter', subCategory: 'Wraps & Takeaway QSR' },
      { name: 'Pizza Hut Express', subCategory: 'Slice & Delivery Counter' },
      { name: 'Goli Vada Pav No. 1', subCategory: 'Compact Commuter QSR' },
    ],
  },
  retail: {
    key: 'retail',
    displayLabel: 'Specialty Retail Store',
    pluralLabel: 'specialty retail stores',
    googleIncludedTypes: ['clothing_store', 'department_store', 'shoe_store'],
    googleLegacyType: 'clothing_store',
    googleKeyword: 'specialty retail boutique store',
    demoBrandPool: [
      { name: 'Fabindia Experience Center', subCategory: 'Lifestyle & Apparel Retail' },
      { name: 'Westside High-Street Store', subCategory: 'Contemporary Apparel' },
      { name: 'Zudio Urban Format', subCategory: 'Value Fashion Retail' },
      { name: 'Chumbak Design Store', subCategory: 'Specialty Lifestyle & Gifting' },
      { name: 'Nicobar Studio', subCategory: 'Modern Design Boutique' },
      { name: 'Decathlon City Connect', subCategory: 'Specialty Sports Retail' },
      { name: 'Miniso Flagship Counter', subCategory: 'Variety & Lifestyle Goods' },
      { name: 'Forest Essentials Boutique', subCategory: 'Specialty Personal Care' },
      { name: 'Crocs Concept Store', subCategory: 'Footwear Specialty Retail' },
      { name: 'Crossword Book & Gift Store', subCategory: 'Specialty Cultural Retail' },
    ],
  },
  fitness: {
    key: 'fitness',
    displayLabel: 'Fitness & Wellness Studio',
    pluralLabel: 'fitness & wellness studios',
    googleIncludedTypes: ['gym', 'fitness_center'],
    googleLegacyType: 'gym',
    googleKeyword: 'gym fitness studio wellness',
    demoBrandPool: [
      { name: 'Cult.fit Center', subCategory: 'Group Workouts & Strength' },
      { name: 'Gold’s Gym', subCategory: 'Full-Service Fitness Club' },
      { name: 'Anytime Fitness 24/7', subCategory: 'Neighborhood Strength Gym' },
      { name: 'F45 Training Studio', subCategory: 'HIIT Functional Studio' },
      { name: 'Sarva Yoga & Wellness', subCategory: 'Mindfulness & Yoga Studio' },
      { name: 'The Pilates Room', subCategory: 'Reformer Pilates Studio' },
      { name: 'Snap Fitness Hub', subCategory: 'Compact Neighborhood Gym' },
      { name: 'Nitrro Wellness & Fitness', subCategory: 'Premium Athletic Club' },
    ],
  },
  bakery: {
    key: 'bakery',
    displayLabel: 'Bakery & Dessert Bar',
    pluralLabel: 'bakeries & dessert bars',
    googleIncludedTypes: ['bakery', 'ice_cream_shop'],
    googleLegacyType: 'bakery',
    googleKeyword: 'bakery patisserie dessert',
    demoBrandPool: [
      { name: 'Theobroma Patisserie', subCategory: 'Artisanal Bakery & Desserts' },
      { name: 'Glen’s Bakehouse', subCategory: 'Neighborhood Bakery & Cupcakes' },
      { name: 'Karachi Bakery', subCategory: 'Heritage Bakery & Biscuits' },
      { name: 'Smoor Chocolates & Lounge', subCategory: 'Couverture Dessert Bar' },
      { name: 'Magnolia Bakery', subCategory: 'Classic American Bakehouse' },
      { name: 'Baskin Robbins Parlor', subCategory: 'Ice Cream & Dessert Bar' },
      { name: 'Poetry by Love & Cheesecake', subCategory: 'Patisserie & Dessert Studio' },
      { name: 'Ibaco Dessert Bar', subCategory: 'Artisanal Ice Cream & Cakes' },
      { name: 'Sweet Truth Cake Shop', subCategory: 'Dessert & Pastry Counter' },
      { name: 'Natural Ice Cream', subCategory: 'Fruit Ice Cream Parlor' },
    ],
  },
};

export function resolveBusinessTypeMapping(rawType: string): BusinessTypeMapping {
  const norm = (rawType || '').trim().toLowerCase();
  if (norm.includes('quick') || norm.includes('qsr') || norm.includes('restaurant')) {
    return BUSINESS_TYPE_MAP.qsr;
  }
  if (norm.includes('retail') || norm.includes('store')) {
    return BUSINESS_TYPE_MAP.retail;
  }
  if (norm.includes('fitness') || norm.includes('gym') || norm.includes('wellness')) {
    return BUSINESS_TYPE_MAP.fitness;
  }
  if (norm.includes('bakery') || norm.includes('dessert')) {
    return BUSINESS_TYPE_MAP.bakery;
  }
  return BUSINESS_TYPE_MAP.cafe;
}

/**
 * Great-circle Haversine distance in meters between two WGS84 coordinates.
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Assigns a place to its exclusive, non-cumulative spatial band:
 * - 0–300m: distance_m <= 300
 * - 300m–2km: 300 < distance_m <= 2000
 * - 2–5km: 2000 < distance_m <= 5000
 */
export function assignExclusiveSpatialBand(
  distanceMeters: number
): SpatialBandKey | null {
  if (distanceMeters <= 300) return '0-300m';
  if (distanceMeters <= 2000) return '300m-2km';
  if (distanceMeters <= 5000) return '2-5km';
  return null;
}

/**
 * Offsets a coordinate by (distanceMeters, bearingDegrees) so deterministic demo fallback
 * places sit at exact, verifiable distances inside each spatial band.
 */
function offsetCoordinateByMeters(
  lat: number,
  lng: number,
  distanceMeters: number,
  bearingDegrees: number
): { lat: number; lng: number } {
  const bearingRad = (bearingDegrees * Math.PI) / 180;
  const dLat = (distanceMeters * Math.cos(bearingRad)) / 111320;
  const cosLat = Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const dLng = (distanceMeters * Math.sin(bearingRad)) / (111320 * cosLat);
  return {
    lat: Number((lat + dLat).toFixed(5)),
    lng: Number((lng + dLng).toFixed(5)),
  };
}

/**
 * Deterministic hash from coordinate + business type so any candidate pin produces
 * consistent, repeatable demo places when Google API credentials are not configured.
 */
function deterministicCoordinateSeed(
  lat: number,
  lng: number,
  categoryKey: string
): number {
  const str = `${lat.toFixed(4)}:${lng.toFixed(4)}:${categoryKey}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates a clearly labeled deterministic demo baseline around [lat, lng] when
 * GOOGLE_MAPS_API_KEY is not configured.
 */
export function buildDeterministicDemoPlaces(params: {
  lat: number;
  lng: number;
  mapping: BusinessTypeMapping;
  localArea?: string;
  city?: string;
}): NormalizedBaselinePlace[] {
  const { lat, lng, mapping, localArea, city } = params;
  const seed = deterministicCoordinateSeed(lat, lng, mapping.key);
  const pool = mapping.demoBrandPool;
  const localityPrefix = localArea?.trim() || city?.trim() || 'Local Corridor';

  // Deterministic counts per band based on location seed:
  // 0-300m: 2 to 4 places
  // 300m-2km: 4 to 7 places
  // 2-5km: 4 to 6 places
  const countBand1 = 2 + (seed % 3); // 2..4
  const countBand2 = 4 + ((seed >> 3) % 4); // 4..7
  const countBand3 = 4 + ((seed >> 6) % 3); // 4..6

  const specs: { targetDist: number; bearing: number; idx: number }[] = [];

  for (let i = 0; i < countBand1; i++) {
    const dist = 95 + ((seed + i * 67) % 185); // 95m .. 279m (strictly inside 0-300m)
    const bearing = (i * (360 / countBand1) + (seed % 45)) % 360;
    specs.push({ targetDist: dist, bearing, idx: i });
  }

  for (let i = 0; i < countBand2; i++) {
    const dist = 420 + ((seed + i * 293) % 1460); // 420m .. 1879m (strictly inside 300m-2km)
    const bearing = (i * (360 / countBand2) + ((seed >> 2) % 60)) % 360;
    specs.push({ targetDist: dist, bearing, idx: countBand1 + i });
  }

  for (let i = 0; i < countBand3; i++) {
    const dist = 2280 + ((seed + i * 541) % 2450); // 2280m .. 4729m (strictly inside 2-5km)
    const bearing = (i * (360 / countBand3) + ((seed >> 4) % 75)) % 360;
    specs.push({
      targetDist: dist,
      bearing,
      idx: countBand1 + countBand2 + i,
    });
  }

  const places: NormalizedBaselinePlace[] = [];

  for (const item of specs) {
    const brand = pool[(item.idx + (seed % pool.length)) % pool.length];
    const pt = offsetCoordinateByMeters(
      lat,
      lng,
      item.targetDist,
      item.bearing
    );
    const exactDist = calculateHaversineMeters(lat, lng, pt.lat, pt.lng);
    const band = assignExclusiveSpatialBand(exactDist);
    if (!band) continue;

    const placeId = `demo_${mapping.key}_${lat.toFixed(3)}_${lng.toFixed(3)}_${
      item.idx
    }`;

    places.push({
      place_id: placeId,
      business_name: brand.name,
      category: mapping.key,
      latitude: pt.lat,
      longitude: pt.lng,
      source: 'LOCUS Deterministic Demo Baseline',
      confidence: 'MEDIUM',
      distance_m: exactDist,
      spatial_band: band,
      vicinity: `${localityPrefix} (${brand.subCategory})`,
      evidence_type: 'DATABASE',
    });
  }

  return places;
}

/**
 * Queries official Google Places API (New v1 Nearby Search, falling back to Legacy Nearby Search)
 * across the 3 radii (300m, 2000m, 5000m) so inner rings aren't starved by outer ring rank limits.
 */
async function queryGooglePlacesLive(params: {
  apiKey: string;
  lat: number;
  lng: number;
  mapping: BusinessTypeMapping;
  rings: number[];
}): Promise<{
  places: NormalizedBaselinePlace[];
  apiNote: string;
}> {
  const { apiKey, lat, lng, mapping, rings } = params;
  const sortedRadii = [...rings].sort((a, b) => a - b);
  const rawCollected: {
    place_id: string;
    name: string;
    lat: number;
    lng: number;
    vicinity?: string;
    rating?: number;
    user_ratings_total?: number;
  }[] = [];

  let usedNewApi = false;
  let lastErrorMsg = '';

  // 1. Try Google Places API (New) v1 searchNearby for each ring radius
  for (const radiusMeters of sortedRadii) {
    try {
      const response = await fetch(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.location,places.primaryType,places.formattedAddress,places.shortFormattedAddress,places.rating,places.userRatingCount',
          },
          body: JSON.stringify({
            includedTypes: mapping.googleIncludedTypes,
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: Math.min(50000, Math.max(100, radiusMeters)),
              },
            },
          }),
        }
      );

      if (response.ok) {
        usedNewApi = true;
        const json = (await response.json()) as any;
        const items = Array.isArray(json?.places) ? json.places : [];
        for (const p of items) {
          const pLat = p?.location?.latitude;
          const pLng = p?.location?.longitude;
          const id = p?.id;
          const name = p?.displayName?.text;
          if (
            typeof id === 'string' &&
            typeof name === 'string' &&
            typeof pLat === 'number' &&
            typeof pLng === 'number'
          ) {
            rawCollected.push({
              place_id: id,
              name,
              lat: pLat,
              lng: pLng,
              vicinity: p.shortFormattedAddress || p.formattedAddress,
              rating: typeof p.rating === 'number' ? p.rating : undefined,
              user_ratings_total:
                typeof p.userRatingCount === 'number'
                  ? p.userRatingCount
                  : undefined,
            });
          }
        }
      } else {
        const errBody = await response.text();
        lastErrorMsg = `Places v1 HTTP ${response.status}: ${errBody.slice(
          0,
          120
        )}`;
      }
    } catch (err: any) {
      lastErrorMsg = err?.message || 'Places v1 request error';
    }
  }

  // 2. If Places API (New) was not enabled on the key, try Google Places Legacy Nearby Search API
  if (!usedNewApi && rawCollected.length === 0) {
    for (const radiusMeters of sortedRadii) {
      try {
        const url = new URL(
          'https://maps.googleapis.com/maps/api/place/nearbysearch/json'
        );
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', String(radiusMeters));
        url.searchParams.set('type', mapping.googleLegacyType);
        url.searchParams.set('keyword', mapping.googleKeyword);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
            usedNewApi = true;
            const results = Array.isArray(data.results) ? data.results : [];
            for (const r of results) {
              const pLat = r?.geometry?.location?.lat;
              const pLng = r?.geometry?.location?.lng;
              if (
                typeof r?.place_id === 'string' &&
                typeof r?.name === 'string' &&
                typeof pLat === 'number' &&
                typeof pLng === 'number'
              ) {
                rawCollected.push({
                  place_id: r.place_id,
                  name: r.name,
                  lat: pLat,
                  lng: pLng,
                  vicinity: r.vicinity,
                  rating: typeof r.rating === 'number' ? r.rating : undefined,
                  user_ratings_total:
                    typeof r.user_ratings_total === 'number'
                      ? r.user_ratings_total
                      : undefined,
                });
              }
            }
          } else {
            lastErrorMsg = `Places Legacy status: ${data.status}`;
          }
        }
      } catch (err: any) {
        lastErrorMsg = err?.message || 'Places Legacy request error';
      }
    }
  }

  if (!usedNewApi && rawCollected.length === 0) {
    throw new Error(lastErrorMsg || 'Google Places API request failed');
  }

  // Deduplicate by place_id and assign exclusive spatial band
  const seenIds = new Set<string>();
  const normalized: NormalizedBaselinePlace[] = [];

  for (const item of rawCollected) {
    if (seenIds.has(item.place_id)) continue;
    seenIds.add(item.place_id);

    const dist = calculateHaversineMeters(lat, lng, item.lat, item.lng);
    const band = assignExclusiveSpatialBand(dist);
    if (!band) continue;

    normalized.push({
      place_id: item.place_id,
      business_name: item.name,
      category: mapping.key,
      latitude: Number(item.lat.toFixed(5)),
      longitude: Number(item.lng.toFixed(5)),
      source: 'Google Places',
      confidence: 'HIGH',
      distance_m: dist,
      spatial_band: band,
      vicinity: item.vicinity,
      rating: item.rating,
      user_ratings_total: item.user_ratings_total,
      evidence_type: 'DATABASE',
    });
  }

  normalized.sort((a, b) => a.distance_m - b.distance_m);

  return {
    places: normalized,
    apiNote:
      'Live Google Places baseline queried across 300m, 2km, and 5km rings (provider results are ranked/capped per query).',
  };
}

/**
 * Builds the normalized MarketBaselineResponse from a deduplicated list of places.
 * Every baseline factor and explanation is strictly derived from the actual returned counts.
 */
export function buildNormalizedMarketBaseline(params: {
  lat: number;
  lng: number;
  state: string;
  city: string;
  localArea: string;
  label: string;
  businessType: string;
  targetCustomer: string;
  mapping: BusinessTypeMapping;
  places: NormalizedBaselinePlace[];
  dataMode: 'LIVE' | 'DEMO';
  source: string;
  providerStatusNote: string;
  radii: number[];
}): MarketBaselineResponse {
  const {
    lat,
    lng,
    state,
    city,
    localArea,
    label,
    businessType,
    targetCustomer,
    mapping,
    places,
    dataMode,
    source,
    providerStatusNote,
    radii,
  } = params;

  // Deduplicate by place_id before calculating band counts
  const uniqueMap = new Map<string, NormalizedBaselinePlace>();
  for (const p of places) {
    if (!uniqueMap.has(p.place_id)) {
      uniqueMap.set(p.place_id, p);
    }
  }
  const deduplicated = Array.from(uniqueMap.values()).sort(
    (a, b) => a.distance_m - b.distance_m
  );

  const band0To300 = deduplicated.filter((p) => p.spatial_band === '0-300m');
  const band300To2k = deduplicated.filter((p) => p.spatial_band === '300m-2km');
  const band2kTo5k = deduplicated.filter((p) => p.spatial_band === '2-5km');

  const c0 = band0To300.length;
  const c1 = band300To2k.length;
  const c2 = band2kTo5k.length;
  const total = deduplicated.length;

  // 1. Competition Factor (derived from 0-300m and 300m-2km counts)
  const localClusterCount = c0 + c1;
  let competitionLevel: CategoricalLevel = 'LOW';
  if (c0 >= 4 || localClusterCount >= 9) {
    competitionLevel = 'HIGH';
  } else if (c0 >= 2 || localClusterCount >= 4) {
    competitionLevel = 'MEDIUM';
  }
  const competitionExplanation =
    total === 0
      ? `0 mapped ${mapping.pluralLabel} were returned within the 5km catchment.`
      : `${c0} mapped ${mapping.pluralLabel} in 0–300m and ${c1} in 300m–2km (${total} total across 5km).`;

  // 2. Commercial Activity Factor (derived from total mapped places & immediate proximity)
  let activityLevel: CategoricalLevel = 'LOW';
  if (total >= 12 || (c0 >= 3 && c1 >= 5)) {
    activityLevel = 'STRONG';
  } else if (total >= 8 || c0 >= 2) {
    activityLevel = 'HIGH';
  } else if (total >= 3) {
    activityLevel = 'MEDIUM';
  }
  const activityExplanation =
    total === 0
      ? `No baseline ${mapping.pluralLabel} returned in provider registry around this pin.`
      : `${total} mapped ${mapping.pluralLabel} returned across all three catchment bands, indicating ${activityLevel.toLowerCase()} commercial presence.`;

  // 3. Commercial Density Factor (concentration within 2km vs wider 5km)
  let densityLevel: CategoricalLevel = 'LOW';
  if (localClusterCount >= 8) {
    densityLevel = 'HIGH';
  } else if (localClusterCount >= 4) {
    densityLevel = 'MEDIUM';
  }
  const densityExplanation =
    total === 0
      ? `Insufficient mapped entities to establish cluster density.`
      : `${localClusterCount} of ${total} mapped ${mapping.pluralLabel} sit within 2km of the candidate pin (${c2} in the outer 2–5km band).`;

  // 4. Accessibility Factor (derived from immediate 0-300m / 300m-2km commercial corridor presence)
  let accessLevel: CategoricalLevel = 'MEDIUM';
  if (c0 >= 2 && c1 >= 4) {
    accessLevel = 'STRONG';
  } else if (c0 >= 1 || c1 >= 3) {
    accessLevel = 'HIGH';
  } else if (total === 0) {
    accessLevel = 'LOW';
  }
  const nearestText =
    deduplicated.length > 0
      ? `Nearest mapped competitor is ${deduplicated[0].distance_m}m from candidate pin.`
      : `No mapped street-frontage competitors within 5km.`;
  const accessExplanation = `${nearestText} Street-level access verification is reserved for Ground Reality scan.`;

  // 5. Customer Fit Factor (derived from target customer + category cluster evidence)
  let fitLevel: CategoricalLevel = 'MEDIUM';
  if (localClusterCount >= 5 && c0 <= 4) {
    fitLevel = 'STRONG';
  } else if (localClusterCount >= 3) {
    fitLevel = 'HIGH';
  } else if (total === 0) {
    fitLevel = 'LOW';
  }
  const fitExplanation = `Evaluated for ${mapping.displayLabel} targeting "${targetCustomer}" based on ${localClusterCount} mapped category peers within 2km.`;

  // 6. Data Coverage Factor (honest reporting of provider coverage)
  const bandsPopulated = [c0 > 0, c1 > 0, c2 > 0].filter(Boolean).length;
  let coverageLevel: CategoricalLevel = 'LOW';
  if (dataMode === 'LIVE' && bandsPopulated === 3) {
    coverageLevel = 'STRONG';
  } else if (bandsPopulated >= 2) {
    coverageLevel = 'HIGH';
  } else if (bandsPopulated === 1) {
    coverageLevel = 'MEDIUM';
  }
  const coverageSummary =
    dataMode === 'LIVE'
      ? `Google Places returned ${total} deduplicated ${mapping.pluralLabel} across ${bandsPopulated}/3 spatial bands.`
      : `Deterministic demo baseline (${total} mapped ${mapping.pluralLabel} across ${bandsPopulated}/3 spatial bands). Configure GOOGLE_MAPS_API_KEY for live Google Places.`;

  return {
    candidate: {
      latitude: lat,
      longitude: lng,
      state,
      city,
      local_area: localArea,
      label,
    },
    business_type: mapping.displayLabel,
    business_category_key: mapping.key,
    target_customer: targetCustomer,
    source,
    data_mode: dataMode,
    provider_status_note: providerStatusNote,
    evidence_type: 'DATABASE',
    total_mapped: total,
    places: deduplicated,
    bands: {
      '0-300m': {
        band: '0-300m',
        stage_label: 'GROUND REALITY',
        min_m: 0,
        max_m: 300,
        count: c0,
        places: band0To300,
      },
      '300m-2km': {
        band: '300m-2km',
        stage_label: 'LOCAL MARKET',
        min_m: 300,
        max_m: 2000,
        count: c1,
        places: band300To2k,
      },
      '2-5km': {
        band: '2-5km',
        stage_label: 'WIDER MARKET',
        min_m: 2000,
        max_m: 5000,
        count: c2,
        places: band2kTo5k,
      },
    },
    factors: {
      commercial_activity: {
        level: activityLevel,
        explanation: activityExplanation,
        evidence_type: 'DATABASE',
      },
      competition: {
        level: competitionLevel,
        explanation: competitionExplanation,
        evidence_type: 'DATABASE',
      },
      accessibility: {
        level: accessLevel,
        explanation: accessExplanation,
        evidence_type: 'DATABASE',
      },
      commercial_density: {
        level: densityLevel,
        explanation: densityExplanation,
        evidence_type: 'DATABASE',
      },
      customer_fit: {
        level: fitLevel,
        explanation: fitExplanation,
        evidence_type: 'DATABASE',
      },
      data_coverage: {
        level: coverageLevel,
        explanation: coverageSummary,
        evidence_type: 'DATABASE',
      },
    },
    data_coverage: {
      level: coverageLevel,
      summary: coverageSummary,
      radii_queried_m: radii,
      deduplicated_count: total,
      provider_limit_note:
        'Provider search results reflect ranked/indexed listings rather than an exhaustive physical census; unregistered entities require Ground Reality scan.',
    },
    queried_at: new Date().toISOString(),
  };
}

function readJsonBody(req: NodeHttpRequest): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += String(chunk);
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Node HTTP middleware for /api/market-baseline (GET or POST).
 * Keeps GOOGLE_MAPS_API_KEY strictly on the server side.
 */
export function createMarketBaselineMiddleware(
  env: Record<string, string | undefined>
) {
  return async (
    req: NodeHttpRequest,
    res: NodeHttpResponse,
    next: () => void
  ) => {
    const rawUrl = req.url || '';
    const parsedUrl = new URL(rawUrl, 'http://localhost');

    if (parsedUrl.pathname !== '/api/market-baseline') {
      next();
      return;
    }

    try {
      const body =
        req.method === 'POST'
          ? await readJsonBody(req)
          : ({} as Record<string, any>);

      const lat = Number(
        body.latitude ?? parsedUrl.searchParams.get('latitude') ?? NaN
      );
      const lng = Number(
        body.longitude ?? parsedUrl.searchParams.get('longitude') ?? NaN
      );
      const businessType = String(
        body.business_type ??
          parsedUrl.searchParams.get('business_type') ??
          'Café'
      );
      const targetCustomer = String(
        body.target_customer ??
          parsedUrl.searchParams.get('target_customer') ??
          'Students + young professionals'
      );
      const state = String(
        body.state ?? parsedUrl.searchParams.get('state') ?? ''
      );
      const city = String(
        body.city ?? parsedUrl.searchParams.get('city') ?? ''
      );
      const localArea = String(
        body.local_area ?? parsedUrl.searchParams.get('local_area') ?? ''
      );
      const label = String(
        body.label ?? parsedUrl.searchParams.get('label') ?? ''
      );
      const forceDemo =
        Boolean(body.force_demo) ||
        parsedUrl.searchParams.get('force_demo') === '1';

      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'Valid latitude and longitude are required.',
          })
        );
        return;
      }

      const radii: number[] = Array.isArray(body.rings)
        ? body.rings.map(Number).filter((n: number) => !Number.isNaN(n))
        : [300, 2000, 5000];

      const mapping = resolveBusinessTypeMapping(businessType);
      const globalProcess = (globalThis as any).process;
      const rawApiKey = (
        env.GOOGLE_MAPS_API_KEY ||
        env.GOOGLE_PLACES_API_KEY ||
        globalProcess?.env?.GOOGLE_MAPS_API_KEY ||
        globalProcess?.env?.GOOGLE_PLACES_API_KEY ||
        ''
      ).trim();
      const isPlaceholderKey =
        !rawApiKey ||
        rawApiKey === 'your_google_maps_places_api_key_here' ||
        rawApiKey.startsWith('your_');
      const apiKey = isPlaceholderKey ? '' : rawApiKey;

      if (apiKey && !forceDemo) {
        try {
          const liveResult = await queryGooglePlacesLive({
            apiKey,
            lat,
            lng,
            mapping,
            rings: radii,
          });

          const payload = buildNormalizedMarketBaseline({
            lat,
            lng,
            state,
            city,
            localArea,
            label: label || localArea || city || state || 'Candidate Location',
            businessType: mapping.displayLabel,
            targetCustomer,
            mapping,
            places: liveResult.places,
            dataMode: 'LIVE',
            source: 'Google Places',
            providerStatusNote: liveResult.apiNote,
            radii,
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
          return;
        } catch (liveErr: any) {
          // If Google API key is invalid or quota fails, fall back deterministically with an explicit note
          const demoPlaces = buildDeterministicDemoPlaces({
            lat,
            lng,
            mapping,
            localArea,
            city,
          });
          const payload = buildNormalizedMarketBaseline({
            lat,
            lng,
            state,
            city,
            localArea,
            label: label || localArea || city || state || 'Candidate Location',
            businessType: mapping.displayLabel,
            targetCustomer,
            mapping,
            places: demoPlaces,
            dataMode: 'DEMO',
            source: 'Deterministic Demo Baseline (Google API error fallback)',
            providerStatusNote: `Google Places API returned an error (${
              liveErr?.message || 'request failed'
            }); showing deterministic demo baseline.`,
            radii,
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
          return;
        }
      }

      // No Google API key configured -> Deterministic Demo Fallback
      const demoPlaces = buildDeterministicDemoPlaces({
        lat,
        lng,
        mapping,
        localArea,
        city,
      });

      const payload = buildNormalizedMarketBaseline({
        lat,
        lng,
        state,
        city,
        localArea,
        label: label || localArea || city || state || 'Candidate Location',
        businessType: mapping.displayLabel,
        targetCustomer,
        mapping,
        places: demoPlaces,
        dataMode: 'DEMO',
        source: 'Deterministic Demo Baseline',
        providerStatusNote:
          'GOOGLE_MAPS_API_KEY is not configured on the server. Showing deterministic demo baseline.',
        radii,
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err?.message || 'Internal market baseline error',
        })
      );
    }
  };
}
