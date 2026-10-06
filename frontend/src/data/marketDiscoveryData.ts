export type EvidenceTaxonomy =
  | 'OBSERVED'
  | 'DATABASE'
  | 'INFERRED'
  | 'PREDICTED_ANALYTICAL';

export type CategoricalLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'STRONG';

export type SpatialBandKey = '0-300m' | '300m-2km' | '2-5km';

export type LocationResolutionStatus =
  | 'AWAITING_SELECTION'
  | 'LOCATING'
  | 'RESOLVED'
  | 'NOT_FOUND';

export type MarketIntelligenceStatus =
  | 'ANALYZING'
  | 'DATA_PENDING'
  | 'LIVE_BASELINE'
  | 'DEMO_BASELINE';

export type SourceCoverageStatus =
  | 'INDEXED'
  | 'MAPPED'
  | 'BASELINE'
  | 'PENDING';

export type MapCameraLevel =
  | 'country'
  | 'state'
  | 'city'
  | 'locality'
  | 'candidate';

export interface BusinessProfileConfig {
  businessType: string;
  targetCustomer: string;
  expansionObjective: string;
  budget: string;
}

export interface BusinessProfilePresetOptions {
  businessTypes: string[];
  targetCustomers: string[];
  expansionObjectives: string[];
  budgets: string[];
}

/**
 * Normalized competitor/place record independent of raw Google Places response format.
 */
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

export interface BaselinePoiNode {
  id: string;
  name: string;
  category: 'COMPETITOR' | 'COMMERCIAL_POI' | 'TRANSIT_NODE' | 'ANCHOR_HUB';
  subLabel: string;
  lat: number;
  lng: number;
  distanceBand: '0–300m' | '300m–2km' | '2–5km';
  evidenceType: 'DATABASE';
}

export interface BaselineCategoricalSnapshot {
  commercialActivity: CategoricalLevel;
  competition: CategoricalLevel;
  accessibility: CategoricalLevel;
  customerFit: CategoricalLevel;
  commercialDensity: CategoricalLevel;
}

export interface BaselineSourceItem {
  id: 'pois' | 'roads' | 'transit' | 'zone_metadata';
  label: 'POIs' | 'Road network' | 'Transit' | 'Zone metadata';
  status: SourceCoverageStatus;
  detail: string;
  evidenceType: 'DATABASE';
}

export interface SpatialCatchmentRingSpec {
  id: 'ground-reality' | 'local-market' | 'wider-market';
  bandKey: SpatialBandKey;
  rangeLabel: '0–300m' | '300m–2km' | '2–5km';
  stageTitle: 'GROUND REALITY' | 'LOCAL MARKET' | 'WIDER MARKET';
  displayTitle: 'Ground Reality' | 'Local Market' | 'Wider Market';
  radiusMeters: number;
  strokeColor: string;
  dashArray?: string;
}

export interface DemoLocationPreset {
  id: string;
  state: string;
  city: string;
  localArea: string;
  candidateName: string;
  contextNote: string;
  lat: number;
  lng: number;
  defaultZoom: number;
  boundaryPolygon: [number, number][];
  arterialCorridors: {
    name: string;
    path: [number, number][];
  }[];
  baselineSnapshot: BaselineCategoricalSnapshot;
  baselineSources: BaselineSourceItem[];
  surroundingNodes: BaselinePoiNode[];
}

export interface StateGeographicNode {
  state: string;
  lat: number;
  lng: number;
  cities: {
    city: string;
    lat: number;
    lng: number;
    localAreas: {
      name: string;
      lat: number;
      lng: number;
    }[];
  }[];
}

/**
 * Location-specific analysis record derived from State -> City -> Local Area -> Candidate Coordinates.
 * Strictly separates Location Resolution from Market Intelligence Availability.
 */
export interface CandidateLocationAnalysis {
  state: string;
  city: string;
  localArea: string;
  candidateName: string;
  resolvedAddress: string | null;
  displayTitle: string;
  displaySubtitle: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  formattedLat: string;
  formattedLng: string;
  cameraLevel: MapCameraLevel;
  locationStatus: LocationResolutionStatus;
  locationStatusLabel:
    | 'AWAITING SELECTION'
    | 'LOCATING...'
    | 'RESOLVED'
    | 'LOCATION NOT FOUND';
  marketStatus: MarketIntelligenceStatus;
  marketStatusLabel:
    | 'ANALYZING'
    | 'DATA PENDING'
    | 'LIVE · GOOGLE PLACES'
    | 'DEMO FALLBACK';
  contextNote: string;
  boundaryPolygon: [number, number][];
  arterialCorridors: {
    name: string;
    path: [number, number][];
  }[];
  baselineSnapshot: BaselineCategoricalSnapshot | null;
  baselineSources: BaselineSourceItem[];
  surroundingNodes: BaselinePoiNode[];
  marketBaseline: MarketBaselineResponse | null;
}

export const LOCUS_SPATIAL_RINGS: SpatialCatchmentRingSpec[] = [
  {
    id: 'ground-reality',
    bandKey: '0-300m',
    rangeLabel: '0–300m',
    stageTitle: 'GROUND REALITY',
    displayTitle: 'Ground Reality',
    radiusMeters: 300,
    strokeColor: '#FB923C',
  },
  {
    id: 'local-market',
    bandKey: '300m-2km',
    rangeLabel: '300m–2km',
    stageTitle: 'LOCAL MARKET',
    displayTitle: 'Local Market',
    radiusMeters: 2000,
    strokeColor: '#818CF8',
    dashArray: '6 6',
  },
  {
    id: 'wider-market',
    bandKey: '2-5km',
    rangeLabel: '2–5km',
    stageTitle: 'WIDER MARKET',
    displayTitle: 'Wider Market',
    radiusMeters: 5000,
    strokeColor: '#E879F9',
    dashArray: '3 8',
  },
];

export const BUSINESS_PROFILE_OPTIONS: BusinessProfilePresetOptions = {
  businessTypes: [
    'Café',
    'Quick Service Restaurant',
    'Specialty Retail Store',
    'Fitness & Wellness Studio',
    'Bakery & Dessert Bar',
  ],
  targetCustomers: [
    'Students + young professionals',
    'Office commuters + daytime teams',
    'Neighborhood families + evening diners',
    'High-intent urban retail shoppers',
  ],
  expansionObjectives: [
    'First outlet',
    'Second neighborhood node',
    'Flagship street frontage',
    'High-density commuter hub',
  ],
  budgets: ['₹15L', '₹25L', '₹45L', '₹80L'],
};

export const DEFAULT_DISCOVERY_BUSINESS_PROFILE: BusinessProfileConfig = {
  businessType: 'Café',
  targetCustomer: 'Students + young professionals',
  expansionObjective: 'First outlet',
  budget: '₹15L',
};

/**
 * Neutral initial geographic center (Central India) before a user selects a State, City, Local Area, or Map Pin.
 */
export const INITIAL_NEUTRAL_COORDINATES = {
  lat: 19.85,
  lng: 78.25,
};

export const EVIDENCE_TAXONOMY_DEFINITIONS: {
  key: EvidenceTaxonomy;
  label: string;
  activeInView1: boolean;
  statusText: string;
  dotColor: string;
}[] = [
  {
    key: 'DATABASE',
    label: 'DATABASE',
    activeInView1: true,
    statusText: 'Baseline registry layer',
    dotColor: '#38BDF8',
  },
  {
    key: 'OBSERVED',
    label: 'OBSERVED',
    activeInView1: false,
    statusText: 'Pending Ground Reality scan',
    dotColor: '#6FAF9B',
  },
  {
    key: 'INFERRED',
    label: 'INFERRED',
    activeInView1: false,
    statusText: 'Pending Intelligence stage',
    dotColor: '#F59E0B',
  },
  {
    key: 'PREDICTED_ANALYTICAL',
    label: 'PREDICTED_ANALYTICAL',
    activeInView1: false,
    statusText: 'Pending Intelligence stage',
    dotColor: '#A855F7',
  },
];

/**
 * Hierarchical State -> City -> Local Area reference index for contextual suggestions
 * and instant offline-resilient coordinate resolution. Users can also enter any arbitrary
 * state, city, or locality which will be geocoded via OpenStreetMap Nominatim.
 */
export const STATE_CITY_HIERARCHY: StateGeographicNode[] = [
  {
    state: 'Telangana',
    lat: 17.8495,
    lng: 79.1151,
    cities: [
      {
        city: 'Hyderabad',
        lat: 17.385,
        lng: 78.4867,
        localAreas: [
          { name: 'Jubilee Hills', lat: 17.4319, lng: 78.407 },
          { name: 'Banjara Hills', lat: 17.4156, lng: 78.4347 },
          { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
          { name: 'Madhapur', lat: 17.4483, lng: 78.3915 },
          { name: 'Kondapur', lat: 17.4622, lng: 78.3568 },
          { name: 'Hitec City', lat: 17.4435, lng: 78.3772 },
          { name: 'Cherlapally', lat: 17.4665, lng: 78.5992 },
          { name: 'Mint Township, Cherlapally', lat: 17.4728, lng: 78.5945 },
          { name: 'Nagaram', lat: 17.4896, lng: 78.6004 },
          { name: 'Kapra', lat: 17.4789, lng: 78.5678 },
          { name: 'Sainikpuri', lat: 17.4835, lng: 78.5522 },
          { name: 'ECIL', lat: 17.4704, lng: 78.5725 },
          { name: 'AS Rao Nagar', lat: 17.4792, lng: 78.5608 },
          { name: 'Uppal', lat: 17.3984, lng: 78.5583 },
          { name: 'Tarnaka', lat: 17.4286, lng: 78.5364 },
          { name: 'Habsiguda', lat: 17.4172, lng: 78.5425 },
          { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
          { name: 'Malkajgiri', lat: 17.4482, lng: 78.5326 },
          { name: 'Alwal', lat: 17.5008, lng: 78.5067 },
          { name: 'Kompally', lat: 17.5416, lng: 78.4869 },
          { name: 'Kukatpally', lat: 17.4948, lng: 78.3996 },
          { name: 'Miyapur', lat: 17.4968, lng: 78.3614 },
          { name: 'Begumpet', lat: 17.4447, lng: 78.4664 },
          { name: 'Ameerpet', lat: 17.4375, lng: 78.4483 },
          { name: 'Somajiguda', lat: 17.4256, lng: 78.4589 },
          { name: 'Himayatnagar', lat: 17.4021, lng: 78.484 },
          { name: 'Manikonda', lat: 17.4018, lng: 78.3762 },
          { name: 'Financial District', lat: 17.4167, lng: 78.3422 },
          { name: 'Dilsukhnagar', lat: 17.3688, lng: 78.5247 },
          { name: 'LB Nagar', lat: 17.3457, lng: 78.5522 },
        ],
      },
      {
        city: 'Warangal',
        lat: 17.9689,
        lng: 79.5941,
        localAreas: [
          { name: 'Hanamkonda', lat: 18.0001, lng: 79.5583 },
          { name: 'Kazipet', lat: 17.9784, lng: 79.5122 },
        ],
      },
      {
        city: 'Nizamabad',
        lat: 18.6725,
        lng: 78.0941,
        localAreas: [],
      },
    ],
  },
  {
    state: 'Maharashtra',
    lat: 19.6633,
    lng: 75.3003,
    cities: [
      {
        city: 'Mumbai',
        lat: 19.076,
        lng: 72.8777,
        localAreas: [
          { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
          { name: 'Lower Parel', lat: 18.9953, lng: 72.83 },
          { name: 'Andheri West', lat: 19.1364, lng: 72.8296 },
          { name: 'Powai', lat: 19.1176, lng: 72.906 },
          { name: 'Colaba', lat: 18.9067, lng: 72.8147 },
          { name: 'Juhu', lat: 19.1075, lng: 72.8263 },
        ],
      },
      {
        city: 'Pune',
        lat: 18.5204,
        lng: 73.8567,
        localAreas: [
          { name: 'Viman Nagar', lat: 18.5665, lng: 73.9143 },
          { name: 'Koregaon Park', lat: 18.5362, lng: 73.894 },
          { name: 'Baner', lat: 18.559, lng: 73.7868 },
          { name: 'Kothrud', lat: 18.5074, lng: 73.8077 },
          { name: 'Aundh', lat: 18.558, lng: 73.8075 },
        ],
      },
      {
        city: 'Nagpur',
        lat: 21.1458,
        lng: 79.0882,
        localAreas: [
          { name: 'Dharampeth', lat: 21.1431, lng: 79.0607 },
          { name: 'Sadar', lat: 21.1611, lng: 79.0815 },
        ],
      },
      {
        city: 'Nashik',
        lat: 19.9975,
        lng: 73.7898,
        localAreas: [{ name: 'College Road', lat: 20.0063, lng: 73.7642 }],
      },
    ],
  },
  {
    state: 'Karnataka',
    lat: 15.3173,
    lng: 75.7139,
    cities: [
      {
        city: 'Bengaluru',
        lat: 12.9716,
        lng: 77.5946,
        localAreas: [
          { name: 'Koramangala', lat: 12.9345, lng: 77.6192 },
          { name: 'Koramangala 5th Block', lat: 12.9345, lng: 77.6192 },
          { name: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
          { name: 'HSR Layout', lat: 12.9116, lng: 77.6389 },
          { name: 'Jayanagar', lat: 12.925, lng: 77.5938 },
          { name: 'Whitefield', lat: 12.9698, lng: 77.75 },
        ],
      },
      {
        city: 'Mysuru',
        lat: 12.2958,
        lng: 76.6394,
        localAreas: [
          { name: 'Gokulam', lat: 12.3262, lng: 76.6285 },
          { name: 'Saraswathipuram', lat: 12.3016, lng: 76.6267 },
        ],
      },
      {
        city: 'Mangaluru',
        lat: 12.9141,
        lng: 74.856,
        localAreas: [],
      },
    ],
  },
  {
    state: 'Gujarat',
    lat: 22.2587,
    lng: 71.1924,
    cities: [
      {
        city: 'Ahmedabad',
        lat: 23.0225,
        lng: 72.5714,
        localAreas: [
          { name: 'Navrangpura', lat: 23.0365, lng: 72.5462 },
          { name: 'Prahlad Nagar', lat: 23.012, lng: 72.5108 },
          { name: 'Sindhu Bhavan Road', lat: 23.0402, lng: 72.5018 },
        ],
      },
      {
        city: 'Surat',
        lat: 21.1702,
        lng: 72.8311,
        localAreas: [
          { name: 'Vesu', lat: 21.1418, lng: 72.7759 },
          { name: 'Adajan', lat: 21.1959, lng: 72.7933 },
        ],
      },
      {
        city: 'Vadodara',
        lat: 22.3072,
        lng: 73.1812,
        localAreas: [{ name: 'Alkapuri', lat: 22.3106, lng: 73.1687 }],
      },
    ],
  },
  {
    state: 'Delhi',
    lat: 28.6139,
    lng: 77.209,
    cities: [
      {
        city: 'New Delhi',
        lat: 28.6139,
        lng: 77.209,
        localAreas: [
          { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
          { name: 'Hauz Khas', lat: 28.5494, lng: 77.2001 },
          { name: 'Khan Market', lat: 28.6001, lng: 77.227 },
          { name: 'Saket', lat: 28.5245, lng: 77.2066 },
        ],
      },
    ],
  },
  {
    state: 'Tamil Nadu',
    lat: 11.1271,
    lng: 78.6569,
    cities: [
      {
        city: 'Chennai',
        lat: 13.0827,
        lng: 80.2707,
        localAreas: [
          { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
          { name: 'Anna Nagar', lat: 13.085, lng: 80.2101 },
          { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
          { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
        ],
      },
      {
        city: 'Coimbatore',
        lat: 11.0168,
        lng: 76.9558,
        localAreas: [
          { name: 'RS Puram', lat: 11.0085, lng: 76.9512 },
          { name: 'Peelamedu', lat: 11.0283, lng: 77.0028 },
        ],
      },
    ],
  },
  {
    state: 'West Bengal',
    lat: 22.9868,
    lng: 87.855,
    cities: [
      {
        city: 'Kolkata',
        lat: 22.5726,
        lng: 88.3639,
        localAreas: [
          { name: 'Park Street', lat: 22.5529, lng: 88.3522 },
          { name: 'Salt Lake Sector V', lat: 22.5769, lng: 88.4337 },
          { name: 'Ballygunge', lat: 22.528, lng: 88.3659 },
        ],
      },
    ],
  },
  {
    state: 'Rajasthan',
    lat: 27.0238,
    lng: 74.2179,
    cities: [
      {
        city: 'Jaipur',
        lat: 26.9124,
        lng: 75.7873,
        localAreas: [
          { name: 'C-Scheme', lat: 26.9124, lng: 75.7873 },
          { name: 'Malviya Nagar', lat: 26.8549, lng: 75.8243 },
        ],
      },
      {
        city: 'Udaipur',
        lat: 24.5854,
        lng: 73.7125,
        localAreas: [],
      },
    ],
  },
  {
    state: 'Kerala',
    lat: 10.8505,
    lng: 76.2711,
    cities: [
      {
        city: 'Kochi',
        lat: 9.9312,
        lng: 76.2673,
        localAreas: [
          { name: 'Panampilly Nagar', lat: 9.9616, lng: 76.2969 },
          { name: 'Edappally', lat: 10.0261, lng: 76.3125 },
        ],
      },
      {
        city: 'Thiruvananthapuram',
        lat: 8.5241,
        lng: 76.9366,
        localAreas: [],
      },
    ],
  },
  {
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
    cities: [
      {
        city: 'Noida',
        lat: 28.5355,
        lng: 77.391,
        localAreas: [{ name: 'Sector 18', lat: 28.5708, lng: 77.3261 }],
      },
      {
        city: 'Lucknow',
        lat: 26.8467,
        lng: 80.9462,
        localAreas: [{ name: 'Gomti Nagar', lat: 26.85, lng: 81.0 }],
      },
    ],
  },
  {
    state: 'Madhya Pradesh',
    lat: 22.9734,
    lng: 78.6569,
    cities: [
      {
        city: 'Indore',
        lat: 22.7196,
        lng: 75.8577,
        localAreas: [{ name: 'Vijay Nagar', lat: 22.7533, lng: 75.8937 }],
      },
      {
        city: 'Bhopal',
        lat: 23.2599,
        lng: 77.4126,
        localAreas: [],
      },
    ],
  },
];

/**
 * Explicitly labeled Demo Locations for optional one-click inspection.
 */
export const DEMO_LOCATION_PRESETS: DemoLocationPreset[] = [
  {
    id: 'demo-jubilee-hills',
    state: 'Telangana',
    city: 'Hyderabad',
    localArea: 'Jubilee Hills',
    candidateName: 'Road No. 36 — Jubilee Hills',
    contextNote: 'High-street café & boutique retail corridor (Demo baseline dataset)',
    lat: 17.4319,
    lng: 78.4071,
    defaultZoom: 16,
    boundaryPolygon: [
      [17.4375, 78.4005],
      [17.4381, 78.4142],
      [17.4258, 78.4138],
      [17.4252, 78.4011],
    ],
    arterialCorridors: [
      {
        name: 'Road No. 36 Commercial Spine',
        path: [
          [17.4368, 78.4021],
          [17.4319, 78.4071],
          [17.4272, 78.4125],
        ],
      },
    ],
    baselineSnapshot: {
      commercialActivity: 'HIGH',
      competition: 'HIGH',
      accessibility: 'STRONG',
      customerFit: 'STRONG',
      commercialDensity: 'HIGH',
    },
    baselineSources: [
      {
        id: 'pois',
        label: 'POIs',
        status: 'INDEXED',
        detail: 'Commercial & F&B registry',
        evidenceType: 'DATABASE',
      },
      {
        id: 'roads',
        label: 'Road network',
        status: 'MAPPED',
        detail: 'Road No. 36 & 45 corridor grid',
        evidenceType: 'DATABASE',
      },
      {
        id: 'transit',
        label: 'Transit',
        status: 'MAPPED',
        detail: 'Jubilee Hills Check Post Metro & bus stops',
        evidenceType: 'DATABASE',
      },
      {
        id: 'zone_metadata',
        label: 'Zone metadata',
        status: 'BASELINE',
        detail: 'High-street commercial corridor',
        evidenceType: 'DATABASE',
      },
    ],
    surroundingNodes: [
      {
        id: 'jh-poi-1',
        name: 'Roastery Coffee House',
        category: 'COMPETITOR',
        subLabel: 'Specialty Café',
        lat: 17.4328,
        lng: 78.4063,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'jh-poi-2',
        name: 'Concu Jubilee Hills',
        category: 'COMPETITOR',
        subLabel: 'Patisserie & Café',
        lat: 17.4311,
        lng: 78.4081,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'jh-poi-3',
        name: 'Jubilee Hills Check Post Metro',
        category: 'TRANSIT_NODE',
        subLabel: 'Blue Line Metro Station',
        lat: 17.4342,
        lng: 78.4105,
        distanceBand: '300m–2km',
        evidenceType: 'DATABASE',
      },
    ],
  },
  {
    id: 'demo-koramangala',
    state: 'Karnataka',
    city: 'Bengaluru',
    localArea: 'Koramangala 5th Block',
    candidateName: 'JNC Road — 1st Cross',
    contextNote: 'Walkable college & co-working commercial pocket (Demo baseline dataset)',
    lat: 12.9345,
    lng: 77.6192,
    defaultZoom: 16,
    boundaryPolygon: [
      [12.9408, 77.6118],
      [12.9412, 77.6272],
      [12.9288, 77.6268],
      [12.9285, 77.6122],
    ],
    arterialCorridors: [
      {
        name: '80 Feet Road Commercial Spine',
        path: [
          [12.9395, 77.614],
          [12.9345, 77.6192],
          [12.9302, 77.6248],
        ],
      },
    ],
    baselineSnapshot: {
      commercialActivity: 'HIGH',
      competition: 'HIGH',
      accessibility: 'STRONG',
      customerFit: 'STRONG',
      commercialDensity: 'HIGH',
    },
    baselineSources: [
      {
        id: 'pois',
        label: 'POIs',
        status: 'INDEXED',
        detail: 'Commercial & F&B registry',
        evidenceType: 'DATABASE',
      },
      {
        id: 'roads',
        label: 'Road network',
        status: 'MAPPED',
        detail: '80ft Rd + block street grid',
        evidenceType: 'DATABASE',
      },
      {
        id: 'transit',
        label: 'Transit',
        status: 'MAPPED',
        detail: 'Arterial bus stops mapped',
        evidenceType: 'DATABASE',
      },
      {
        id: 'zone_metadata',
        label: 'Zone metadata',
        status: 'BASELINE',
        detail: 'High-street commercial zone',
        evidenceType: 'DATABASE',
      },
    ],
    surroundingNodes: [
      {
        id: 'kora-poi-1',
        name: 'Third Wave Coffee',
        category: 'COMPETITOR',
        subLabel: 'Listed Café Chain',
        lat: 12.9354,
        lng: 77.6184,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'kora-poi-2',
        name: '91springboard Hub',
        category: 'ANCHOR_HUB',
        subLabel: 'Coworking Anchor',
        lat: 12.9336,
        lng: 77.6204,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'kora-poi-3',
        name: '80 Feet Rd Transit Stop',
        category: 'TRANSIT_NODE',
        subLabel: 'Arterial Bus Stop',
        lat: 12.9362,
        lng: 77.6215,
        distanceBand: '300m–2km',
        evidenceType: 'DATABASE',
      },
    ],
  },
  {
    id: 'demo-viman-nagar',
    state: 'Maharashtra',
    city: 'Pune',
    localArea: 'Viman Nagar',
    candidateName: 'Symbiosis Road — Corner Plot',
    contextNote: 'Student & young professional corridor along Dutta Mandir Rd (Demo baseline dataset)',
    lat: 18.5665,
    lng: 73.9143,
    defaultZoom: 16,
    boundaryPolygon: [
      [18.5732, 73.9062],
      [18.5738, 73.9218],
      [18.5612, 73.9229],
      [18.5598, 73.9074],
    ],
    arterialCorridors: [
      {
        name: 'Symbiosis — Dutta Mandir Corridor',
        path: [
          [18.5678, 73.9078],
          [18.5665, 73.9143],
          [18.5654, 73.9212],
        ],
      },
    ],
    baselineSnapshot: {
      commercialActivity: 'HIGH',
      competition: 'MEDIUM',
      accessibility: 'STRONG',
      customerFit: 'STRONG',
      commercialDensity: 'HIGH',
    },
    baselineSources: [
      {
        id: 'pois',
        label: 'POIs',
        status: 'INDEXED',
        detail: 'Commercial & F&B registry',
        evidenceType: 'DATABASE',
      },
      {
        id: 'roads',
        label: 'Road network',
        status: 'MAPPED',
        detail: 'Street & intersection graph',
        evidenceType: 'DATABASE',
      },
      {
        id: 'transit',
        label: 'Transit',
        status: 'MAPPED',
        detail: 'Feeder bus & metro stops',
        evidenceType: 'DATABASE',
      },
      {
        id: 'zone_metadata',
        label: 'Zone metadata',
        status: 'BASELINE',
        detail: 'Mixed commercial frontage',
        evidenceType: 'DATABASE',
      },
    ],
    surroundingNodes: [
      {
        id: 'vn-poi-1',
        name: 'Third Wave Coffee',
        category: 'COMPETITOR',
        subLabel: 'Listed Specialty Café',
        lat: 18.5674,
        lng: 73.9135,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'vn-poi-2',
        name: 'Symbiosis Campus Hub',
        category: 'ANCHOR_HUB',
        subLabel: 'Institutional Anchor',
        lat: 18.5656,
        lng: 73.9128,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'vn-poi-3',
        name: 'Dutta Mandir Transit Stop',
        category: 'TRANSIT_NODE',
        subLabel: 'Bus Corridor Access',
        lat: 18.5671,
        lng: 73.9159,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
    ],
  },
  {
    id: 'demo-navrangpura',
    state: 'Gujarat',
    city: 'Ahmedabad',
    localArea: 'Navrangpura',
    candidateName: 'University Road — CEPT Node',
    contextNote: 'Multi-campus institutional & youth café belt (Demo baseline dataset)',
    lat: 23.0365,
    lng: 72.5462,
    defaultZoom: 16,
    boundaryPolygon: [
      [23.0432, 72.5388],
      [23.0435, 72.5535],
      [23.0301, 72.5538],
      [23.0298, 72.5392],
    ],
    arterialCorridors: [
      {
        name: 'University Road Spine',
        path: [
          [23.0398, 72.541],
          [23.0365, 72.5462],
          [23.0332, 72.5515],
        ],
      },
    ],
    baselineSnapshot: {
      commercialActivity: 'HIGH',
      competition: 'MEDIUM',
      accessibility: 'STRONG',
      customerFit: 'STRONG',
      commercialDensity: 'MEDIUM',
    },
    baselineSources: [
      {
        id: 'pois',
        label: 'POIs',
        status: 'INDEXED',
        detail: 'Campus & café registry',
        evidenceType: 'DATABASE',
      },
      {
        id: 'roads',
        label: 'Road network',
        status: 'MAPPED',
        detail: 'University Rd street network',
        evidenceType: 'DATABASE',
      },
      {
        id: 'transit',
        label: 'Transit',
        status: 'MAPPED',
        detail: 'Metro & BRTS stops',
        evidenceType: 'DATABASE',
      },
      {
        id: 'zone_metadata',
        label: 'Zone metadata',
        status: 'BASELINE',
        detail: 'Institutional corridor',
        evidenceType: 'DATABASE',
      },
    ],
    surroundingNodes: [
      {
        id: 'ahm-poi-1',
        name: 'CEPT University Anchor',
        category: 'ANCHOR_HUB',
        subLabel: 'Academic Campus',
        lat: 23.0372,
        lng: 72.5451,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
      {
        id: 'ahm-poi-2',
        name: 'HL College Food Street',
        category: 'COMPETITOR',
        subLabel: 'Listed Café Cluster',
        lat: 23.0351,
        lng: 72.5476,
        distanceBand: '0–300m',
        evidenceType: 'DATABASE',
      },
    ],
  },
];

/**
 * Helper to create a clean neighborhood bounding box around any arbitrary coordinate
 */
export function buildNeighborhoodBoundaryAround(
  lat: number,
  lng: number,
  halfSpanDeg = 0.0065
): [number, number][] {
  return [
    [lat + halfSpanDeg, lng - halfSpanDeg * 1.15],
    [lat + halfSpanDeg * 1.04, lng + halfSpanDeg * 1.15],
    [lat - halfSpanDeg, lng + halfSpanDeg * 1.1],
    [lat - halfSpanDeg * 1.03, lng - halfSpanDeg * 1.12],
  ];
}

/**
 * Checks whether a given city belongs to a DIFFERENT known state in the reference index.
 * Used when the user changes State so we can clear a mismatched City from a previous State.
 */
export function isCityMismatchedForState(
  stateInput: string,
  cityInput: string
): boolean {
  const sNorm = stateInput.trim().toLowerCase();
  const cNorm = cityInput.trim().toLowerCase();
  if (!sNorm || !cNorm) return false;

  const matchedStateNode = STATE_CITY_HIERARCHY.find(
    (s) => s.state.toLowerCase() === sNorm
  );
  if (!matchedStateNode) return false;

  // Check if the city exists in the new state
  const existsInNewState = matchedStateNode.cities.some(
    (c) =>
      c.city.toLowerCase() === cNorm ||
      (cNorm === 'bangalore' && c.city === 'Bengaluru')
  );
  if (existsInNewState) return false;

  // Check if the city belongs to another known state
  const existsInAnotherKnownState = STATE_CITY_HIERARCHY.some(
    (s) =>
      s.state.toLowerCase() !== sNorm &&
      s.cities.some(
        (c) =>
          c.city.toLowerCase() === cNorm ||
          (cNorm === 'bangalore' && c.city === 'Bengaluru')
      )
  );
  return existsInAnotherKnownState;
}

/**
 * Resolves hierarchical coordinates from State -> City -> Local Area using the reference index.
 * Only returns a match for the deepest populated field so an unknown Local Area or City
 * isn't masked by a parent State match—allowing live Nominatim geocoding (or Location not found) to run.
 */
export function lookupHierarchicalAnchor(
  stateInput: string,
  cityInput: string,
  localAreaInput: string
): {
  lat: number;
  lng: number;
  level: MapCameraLevel;
  matchedState?: string;
  matchedCity?: string;
  matchedArea?: string;
} | null {
  const sNorm = stateInput.trim().toLowerCase();
  const cNorm = cityInput.trim().toLowerCase();
  const aNorm = localAreaInput.trim().toLowerCase();

  // 1. If Local Area is provided, match Local Area in the hierarchy
  if (aNorm) {
    for (const sNode of STATE_CITY_HIERARCHY) {
      if (sNorm && !sNode.state.toLowerCase().includes(sNorm)) continue;
      for (const cNode of sNode.cities) {
        if (
          cNorm &&
          cNode.city.toLowerCase() !== cNorm &&
          !(cNorm === 'bangalore' && cNode.city === 'Bengaluru')
        ) {
          continue;
        }
        const areaMatch = cNode.localAreas.find(
          (a) =>
            a.name.toLowerCase() === aNorm ||
            a.name.toLowerCase().includes(aNorm) ||
            aNorm.includes(a.name.toLowerCase())
        );
        if (areaMatch) {
          return {
            lat: areaMatch.lat,
            lng: areaMatch.lng,
            level: 'locality',
            matchedState: sNode.state,
            matchedCity: cNode.city,
            matchedArea: areaMatch.name,
          };
        }
      }
    }
    return null;
  }

  // 2. If City is provided (and no Local Area), match the City
  if (cNorm) {
    for (const sNode of STATE_CITY_HIERARCHY) {
      if (sNorm && !sNode.state.toLowerCase().includes(sNorm)) continue;
      const cityMatch = sNode.cities.find(
        (c) =>
          c.city.toLowerCase() === cNorm ||
          (cNorm === 'bangalore' && c.city === 'Bengaluru')
      );
      if (cityMatch) {
        return {
          lat: cityMatch.lat,
          lng: cityMatch.lng,
          level: 'city',
          matchedState: sNode.state,
          matchedCity: cityMatch.city,
        };
      }
    }
    return null;
  }

  // 3. If only State is provided, match the State
  if (sNorm) {
    const stateMatch = STATE_CITY_HIERARCHY.find(
      (s) =>
        s.state.toLowerCase() === sNorm || s.state.toLowerCase().includes(sNorm)
    );
    if (stateMatch) {
      return {
        lat: stateMatch.lat,
        lng: stateMatch.lng,
        level: 'state',
        matchedState: stateMatch.state,
      };
    }
    return null;
  }

  return null;
}

/**
 * Finds the closest known State / City / Local Area when a user drops a pin directly on the map
 * without having typed State/City yet. Never overwrites non-empty user inputs.
 */
export function inferNearestGeographicHierarchy(
  lat: number,
  lng: number
): { state?: string; city?: string; localArea?: string } {
  let bestArea: {
    state: string;
    city: string;
    localArea: string;
    distDeg: number;
  } | null = null;
  let bestCity: { state: string; city: string; distDeg: number } | null = null;

  for (const sNode of STATE_CITY_HIERARCHY) {
    for (const cNode of sNode.cities) {
      const cDist = Math.hypot(cNode.lat - lat, cNode.lng - lng);
      if (!bestCity || cDist < bestCity.distDeg) {
        bestCity = { state: sNode.state, city: cNode.city, distDeg: cDist };
      }
      for (const aNode of cNode.localAreas) {
        const aDist = Math.hypot(aNode.lat - lat, aNode.lng - lng);
        if (!bestArea || aDist < bestArea.distDeg) {
          bestArea = {
            state: sNode.state,
            city: cNode.city,
            localArea: aNode.name,
            distDeg: aDist,
          };
        }
      }
    }
  }

  // Within ~4.5km of a known neighborhood
  if (bestArea && bestArea.distDeg <= 0.042) {
    return {
      state: bestArea.state,
      city: bestArea.city,
      localArea: bestArea.localArea,
    };
  }
  // Within ~25km of a known city
  if (bestCity && bestCity.distDeg <= 0.24) {
    return {
      state: bestCity.state,
      city: bestCity.city,
    };
  }
  return {};
}

/**
 * Fetches the normalized market baseline from the LOCUS backend endpoint (/api/market-baseline).
 */
export async function fetchMarketBaseline(params: {
  businessType: string;
  targetCustomer: string;
  latitude: number;
  longitude: number;
  state: string;
  city: string;
  localArea: string;
  label: string;
  signal?: AbortSignal;
}): Promise<MarketBaselineResponse> {
  const response = await fetch('/api/market-baseline', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      business_type: params.businessType,
      target_customer: params.targetCustomer,
      latitude: params.latitude,
      longitude: params.longitude,
      state: params.state,
      city: params.city,
      local_area: params.localArea,
      label: params.label,
      rings: [300, 2000, 5000],
    }),
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(`Market baseline request failed (${response.status})`);
  }

  return (await response.json()) as MarketBaselineResponse;
}

/**
 * Derives the location-specific analysis context for any State, City, Local Area, and Candidate Coordinate.
 */
export function resolveLocationAnalysis(params: {
  state: string;
  city: string;
  localArea: string;
  coordinates: { lat: number; lng: number };
  hasUserSelectedLocation: boolean;
  cameraLevel: MapCameraLevel;
  customCandidateLabel?: string | null;
  resolvedAddress?: string | null;
  isLocating?: boolean;
  locationNotFoundError?: string | null;
  isAnalyzing?: boolean;
  marketBaseline?: MarketBaselineResponse | null;
}): CandidateLocationAnalysis {
  const {
    state,
    city,
    localArea,
    coordinates,
    hasUserSelectedLocation,
    cameraLevel,
    customCandidateLabel,
    resolvedAddress = null,
    isLocating = false,
    locationNotFoundError = null,
    isAnalyzing = false,
    marketBaseline = null,
  } = params;

  const formattedLat = `${Math.abs(coordinates.lat).toFixed(4)}° ${
    coordinates.lat >= 0 ? 'N' : 'S'
  }`;
  const formattedLng = `${Math.abs(coordinates.lng).toFixed(4)}° ${
    coordinates.lng >= 0 ? 'E' : 'W'
  }`;

  const cleanState = state.trim();
  const cleanCity = city.trim();
  const cleanArea = localArea.trim();

  if (locationNotFoundError) {
    return {
      state: cleanState,
      city: cleanCity,
      localArea: cleanArea,
      candidateName: 'Location not found',
      resolvedAddress: null,
      displayTitle: 'Location not found',
      displaySubtitle: locationNotFoundError,
      coordinates,
      formattedLat,
      formattedLng,
      cameraLevel,
      locationStatus: 'NOT_FOUND',
      locationStatusLabel: 'LOCATION NOT FOUND',
      marketStatus: 'DATA_PENDING',
      marketStatusLabel: 'DATA PENDING',
      contextNote:
        'Check the spelling of the State, City, or Local Area, or click directly on the map to place a candidate coordinate.',
      boundaryPolygon: [],
      arterialCorridors: [],
      baselineSnapshot: null,
      baselineSources: [],
      surroundingNodes: [],
      marketBaseline: null,
    };
  }

  if (isLocating) {
    const queryLabel =
      [cleanArea, cleanCity, cleanState].filter(Boolean).join(', ') ||
      'Selected coordinate';
    return {
      state: cleanState,
      city: cleanCity,
      localArea: cleanArea,
      candidateName: queryLabel,
      resolvedAddress,
      displayTitle: 'Locating...',
      displaySubtitle: `Resolving geographic coordinates for ${queryLabel}`,
      coordinates,
      formattedLat,
      formattedLng,
      cameraLevel,
      locationStatus: 'LOCATING',
      locationStatusLabel: 'LOCATING...',
      marketStatus: 'ANALYZING',
      marketStatusLabel: 'ANALYZING',
      contextNote: 'Resolving spatial coordinates and catchment rings...',
      boundaryPolygon: [],
      arterialCorridors: [],
      baselineSnapshot: null,
      baselineSources: [],
      surroundingNodes: [],
      marketBaseline: null,
    };
  }

  // Initial unselected state: "Choose where you want to investigate."
  if (!hasUserSelectedLocation && !cleanState && !cleanCity && !cleanArea) {
    return {
      state: '',
      city: '',
      localArea: '',
      candidateName: 'Select a candidate location',
      resolvedAddress: null,
      displayTitle: 'Choose where you want to investigate',
      displaySubtitle:
        'Select State, City, and Local Area or click on the map to place a candidate location pin.',
      coordinates,
      formattedLat,
      formattedLng,
      cameraLevel: 'country',
      locationStatus: 'AWAITING_SELECTION',
      locationStatusLabel: 'AWAITING SELECTION',
      marketStatus: 'DATA_PENDING',
      marketStatusLabel: 'DATA PENDING',
      contextNote:
        'Resolve a candidate location to query mapped competitors across 0–300m, 300m–2km, and 2–5km spatial bands.',
      boundaryPolygon: [],
      arterialCorridors: [],
      baselineSnapshot: null,
      baselineSources: [
        {
          id: 'roads',
          label: 'Road network',
          status: 'MAPPED',
          detail: 'OpenStreetMap street geometry ready',
          evidenceType: 'DATABASE',
        },
        {
          id: 'pois',
          label: 'POIs',
          status: 'PENDING',
          detail: 'Awaiting candidate coordinate',
          evidenceType: 'DATABASE',
        },
      ],
      surroundingNodes: [],
      marketBaseline: null,
    };
  }

  // Check if the selected coordinate is anchored on one of the documented Demo Location Presets (~80m tolerance)
  const matchedDemo = DEMO_LOCATION_PRESETS.find((preset) => {
    const dLat = Math.abs(preset.lat - coordinates.lat);
    const dLng = Math.abs(preset.lng - coordinates.lng);
    return dLat < 0.0008 && dLng < 0.0008;
  });

  const inferred = inferNearestGeographicHierarchy(
    coordinates.lat,
    coordinates.lng
  );

  // Always preserve user's entered State / City / Local Area first; enrich only if empty
  const effectiveState =
    cleanState || matchedDemo?.state || inferred.state || '';
  const effectiveCity =
    cleanCity || matchedDemo?.city || inferred.city || '';
  const effectiveLocalArea =
    cleanArea || matchedDemo?.localArea || inferred.localArea || '';

  const resolvedTitle =
    effectiveLocalArea ||
    customCandidateLabel ||
    matchedDemo?.candidateName ||
    effectiveCity ||
    effectiveState ||
    'Selected Candidate Pin';

  const subtitleParts = [
    effectiveLocalArea && effectiveLocalArea !== resolvedTitle
      ? effectiveLocalArea
      : null,
    effectiveCity,
    effectiveState,
  ].filter(Boolean);

  const resolvedSubtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(', ')
      : `${formattedLat} · ${formattedLng}`;

  // Convert normalized marketBaseline places into map POI nodes so the map renders all competitors
  const baselinePlaceNodes: BaselinePoiNode[] = marketBaseline
    ? marketBaseline.places.map((p) => ({
        id: p.place_id,
        name: p.business_name,
        category: 'COMPETITOR',
        subLabel: `${p.distance_m}m · ${p.source}`,
        lat: p.latitude,
        lng: p.longitude,
        distanceBand:
          p.spatial_band === '0-300m'
            ? '0–300m'
            : p.spatial_band === '300m-2km'
            ? '300m–2km'
            : '2–5km',
        evidenceType: 'DATABASE',
      }))
    : matchedDemo?.surroundingNodes || [];

  const computedSnapshot: BaselineCategoricalSnapshot | null = marketBaseline
    ? {
        commercialActivity: marketBaseline.factors.commercial_activity.level,
        competition: marketBaseline.factors.competition.level,
        accessibility: marketBaseline.factors.accessibility.level,
        customerFit: marketBaseline.factors.customer_fit.level,
        commercialDensity: marketBaseline.factors.commercial_density.level,
      }
    : matchedDemo?.baselineSnapshot || null;

  if (isAnalyzing) {
    return {
      state: effectiveState,
      city: effectiveCity,
      localArea: effectiveLocalArea,
      candidateName: customCandidateLabel || resolvedTitle,
      resolvedAddress,
      displayTitle: resolvedTitle,
      displaySubtitle: resolvedSubtitle,
      coordinates,
      formattedLat,
      formattedLng,
      cameraLevel,
      locationStatus: 'RESOLVED',
      locationStatusLabel: 'RESOLVED',
      marketStatus: 'ANALYZING',
      marketStatusLabel: 'ANALYZING',
      contextNote: `Querying ${
        marketBaseline?.business_type || 'market'
      } baseline across 0–300m, 300m–2km, and 2–5km bands...`,
      boundaryPolygon:
        matchedDemo?.boundaryPolygon ||
        buildNeighborhoodBoundaryAround(coordinates.lat, coordinates.lng),
      arterialCorridors: matchedDemo?.arterialCorridors || [],
      baselineSnapshot: computedSnapshot,
      baselineSources: matchedDemo?.baselineSources || [],
      surroundingNodes: baselinePlaceNodes,
      marketBaseline,
    };
  }

  if (marketBaseline) {
    const isLive = marketBaseline.data_mode === 'LIVE';
    return {
      state: effectiveState,
      city: effectiveCity,
      localArea: effectiveLocalArea,
      candidateName: customCandidateLabel || resolvedTitle,
      resolvedAddress,
      displayTitle: resolvedTitle,
      displaySubtitle: resolvedSubtitle,
      coordinates,
      formattedLat,
      formattedLng,
      cameraLevel,
      locationStatus: 'RESOLVED',
      locationStatusLabel: 'RESOLVED',
      marketStatus: isLive ? 'LIVE_BASELINE' : 'DEMO_BASELINE',
      marketStatusLabel: isLive ? 'LIVE · GOOGLE PLACES' : 'DEMO FALLBACK',
      contextNote: marketBaseline.data_coverage.summary,
      boundaryPolygon:
        matchedDemo?.boundaryPolygon ||
        (cameraLevel === 'state' || cameraLevel === 'country'
          ? []
          : buildNeighborhoodBoundaryAround(coordinates.lat, coordinates.lng)),
      arterialCorridors: matchedDemo?.arterialCorridors || [],
      baselineSnapshot: computedSnapshot,
      baselineSources: [
        {
          id: 'pois',
          label: 'POIs',
          status: isLive ? 'INDEXED' : 'BASELINE',
          detail: `${marketBaseline.total_mapped} mapped (${marketBaseline.source})`,
          evidenceType: 'DATABASE',
        },
        {
          id: 'roads',
          label: 'Road network',
          status: 'MAPPED',
          detail: 'OpenStreetMap street geometry active',
          evidenceType: 'DATABASE',
        },
        {
          id: 'transit',
          label: 'Transit',
          status: 'MAPPED',
          detail: 'Corridor access evaluated',
          evidenceType: 'DATABASE',
        },
        {
          id: 'zone_metadata',
          label: 'Zone metadata',
          status: 'BASELINE',
          detail: '300m / 2km / 5km catchment rings',
          evidenceType: 'DATABASE',
        },
      ],
      surroundingNodes: baselinePlaceNodes,
      marketBaseline,
    };
  }

  return {
    state: effectiveState,
    city: effectiveCity,
    localArea: effectiveLocalArea,
    candidateName: customCandidateLabel || resolvedTitle,
    resolvedAddress,
    displayTitle: resolvedTitle,
    displaySubtitle: resolvedSubtitle,
    coordinates,
    formattedLat,
    formattedLng,
    cameraLevel,
    locationStatus: 'RESOLVED',
    locationStatusLabel: 'RESOLVED',
    marketStatus: 'DATA_PENDING',
    marketStatusLabel: 'DATA PENDING',
    contextNote:
      'Coordinates and spatial catchment rings are resolved. Querying market baseline...',
    boundaryPolygon:
      cameraLevel === 'state' || cameraLevel === 'country'
        ? []
        : buildNeighborhoodBoundaryAround(coordinates.lat, coordinates.lng),
    arterialCorridors: [],
    baselineSnapshot: null,
    baselineSources: [
      {
        id: 'roads',
        label: 'Road network',
        status: 'MAPPED',
        detail: 'OpenStreetMap street geometry active',
        evidenceType: 'DATABASE',
      },
      {
        id: 'pois',
        label: 'POIs',
        status: 'PENDING',
        detail: 'Awaiting baseline query',
        evidenceType: 'DATABASE',
      },
    ],
    surroundingNodes: [],
    marketBaseline: null,
  };
}
