export type EvidenceTaxonomy =
  | 'OBSERVED'
  | 'DATABASE'
  | 'INFERRED'
  | 'PREDICTED_ANALYTICAL';

export type CategoricalLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'STRONG';

export type SourceCoverageStatus =
  | 'INDEXED'
  | 'MAPPED'
  | 'BASELINE'
  | 'CURATED LAYER';

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

export interface CandidateLocationOption {
  id: string;
  label: string;
  microCorridor: string;
  lat: number;
  lng: number;
  coordinatesText: string;
  intersectionNote: string;
  baselineSnapshot: BaselineCategoricalSnapshot;
  baselineSources: BaselineSourceItem[];
  surroundingNodes: BaselinePoiNode[];
}

export interface LocalAreaOption {
  id: string;
  name: string;
  characterTag: string;
  summary: string;
  center: [number, number];
  defaultZoom: number;
  /** Polygon coordinates [lat, lng][] representing the local neighborhood boundary */
  boundaryPolygon: [number, number][];
  /** Primary arterial road lines [lat, lng][] for spatial context */
  arterialCorridors: {
    name: string;
    path: [number, number][];
  }[];
  candidates: CandidateLocationOption[];
}

export interface CityMarketOption {
  id: string;
  name: string;
  regionLabel: string;
  center: [number, number];
  cityZoom: number;
  localAreas: LocalAreaOption[];
}

export interface SpatialCatchmentRingSpec {
  id: 'ground-reality' | 'local-market' | 'wider-market';
  rangeLabel: '0–300m' | '300m–2km' | '2–5km';
  stageTitle: 'GROUND REALITY' | 'LOCAL MARKET' | 'WIDER MARKET';
  cardDescription: 'Ground scan scope' | 'Local market' | 'Wider context';
  radiusMeters: number;
  strokeColor: string;
  fillColor: string;
  dashArray?: string;
}

export const LOCUS_SPATIAL_RINGS: SpatialCatchmentRingSpec[] = [
  {
    id: 'ground-reality',
    rangeLabel: '0–300m',
    stageTitle: 'GROUND REALITY',
    cardDescription: 'Ground scan scope',
    radiusMeters: 300,
    strokeColor: '#6FAF9B',
    fillColor: 'rgba(111, 175, 155, 0.14)',
  },
  {
    id: 'local-market',
    rangeLabel: '300m–2km',
    stageTitle: 'LOCAL MARKET',
    cardDescription: 'Local market',
    radiusMeters: 2000,
    strokeColor: '#38BDF8',
    fillColor: 'rgba(56, 189, 248, 0.05)',
    dashArray: '6 6',
  },
  {
    id: 'wider-market',
    rangeLabel: '2–5km',
    stageTitle: 'WIDER MARKET',
    cardDescription: 'Wider context',
    radiusMeters: 5000,
    strokeColor: '#94A3B8',
    fillColor: 'rgba(148, 163, 184, 0.02)',
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

export const EVIDENCE_TAXONOMY_DEFINITIONS: {
  key: EvidenceTaxonomy;
  label: string;
  view1State: 'ACTIVE_IN_VIEW_1' | 'PENDING_VIEW_2' | 'PENDING_VIEW_3';
  statusText: string;
  dotColor: string;
}[] = [
  {
    key: 'DATABASE',
    label: 'DATABASE',
    view1State: 'ACTIVE_IN_VIEW_1',
    statusText: 'Active baseline layer',
    dotColor: '#38BDF8',
  },
  {
    key: 'OBSERVED',
    label: 'OBSERVED',
    view1State: 'PENDING_VIEW_2',
    statusText: 'Awaits View 2 Ground Reality',
    dotColor: '#6FAF9B',
  },
  {
    key: 'INFERRED',
    label: 'INFERRED',
    view1State: 'PENDING_VIEW_3',
    statusText: 'Awaits View 3 Synthesis',
    dotColor: '#F59E0B',
  },
  {
    key: 'PREDICTED_ANALYTICAL',
    label: 'PREDICTED_ANALYTICAL',
    view1State: 'PENDING_VIEW_3',
    statusText: 'Awaits View 3 Synthesis',
    dotColor: '#A855F7',
  },
];

/**
 * Isolated demo dataset for View 1 (Market Discovery).
 * Structured so any city / neighborhood / candidate location can be injected from a backend API
 * without changing component logic.
 */
export const DEMO_MARKET_DISCOVERY_CITIES: CityMarketOption[] = [
  {
    id: 'city-pune',
    name: 'Pune',
    regionLabel: 'Western Urban Corridor',
    center: [18.5362, 73.894],
    cityZoom: 13,
    localAreas: [
      {
        id: 'area-viman-nagar',
        name: 'Viman Nagar',
        characterTag: 'University + Tech Park Neighborhood',
        summary:
          'Dense student + young professional catchment along Dutta Mandir & Symbiosis corridors.',
        center: [18.5665, 73.9143],
        defaultZoom: 15,
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
          {
            name: 'Nagar Road Transit Spine',
            path: [
              [18.5602, 73.9082],
              [18.5625, 73.9152],
              [18.5648, 73.9224],
            ],
          },
        ],
        candidates: [
          {
            id: 'cand-vn-symbiosis-jct',
            label: 'Symbiosis Road — Corner Plot C1',
            microCorridor: 'Opposite Campus Gate 2 / Dutta Mandir Cross',
            lat: 18.5665,
            lng: 73.9143,
            coordinatesText: '18.5665° N, 73.9143° E',
            intersectionNote: 'Primary pedestrian spine between university hostels & retail high-street',
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
                detail: 'Commercial & F&B registry points',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: 'Primary + secondary street graph',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Feeder bus + arterial stops',
                evidenceType: 'DATABASE',
              },
              {
                id: 'zone_metadata',
                label: 'Zone metadata',
                status: 'BASELINE',
                detail: 'Mixed commercial street frontage',
                evidenceType: 'DATABASE',
              },
            ],
            surroundingNodes: [
              {
                id: 'vn-poi-1',
                name: 'Third Wave Coffee Registry Pin',
                category: 'COMPETITOR',
                subLabel: 'Listed Specialty Café',
                lat: 18.5674,
                lng: 73.9135,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn-poi-2',
                name: 'Symbiosis Academic Hub',
                category: 'ANCHOR_HUB',
                subLabel: 'Institutional Anchor',
                lat: 18.5656,
                lng: 73.9128,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn-poi-3',
                name: 'Dutta Mandir Chowk Bus Stop',
                category: 'TRANSIT_NODE',
                subLabel: 'Local Transit Access',
                lat: 18.5671,
                lng: 73.9159,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn-poi-4',
                name: 'Phoenix Marketcity Commercial Cluster',
                category: 'COMMERCIAL_POI',
                subLabel: 'Regional Retail Hub',
                lat: 18.5621,
                lng: 73.9168,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn-poi-5',
                name: 'Ramwadi Metro Station',
                category: 'TRANSIT_NODE',
                subLabel: 'Aqua Line Rapid Transit',
                lat: 18.5608,
                lng: 73.9102,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
            ],
          },
          {
            id: 'cand-vn-konark-arcade',
            label: 'Konark Arcade — Lane 4 Frontage',
            microCorridor: 'East Viman Nagar Residential-Commercial Edge',
            lat: 18.5649,
            lng: 73.9182,
            coordinatesText: '18.5649° N, 73.9182° E',
            intersectionNote: 'Quieter secondary street with mid-rise residential blocks',
            baselineSnapshot: {
              commercialActivity: 'MEDIUM',
              competition: 'LOW',
              accessibility: 'MEDIUM',
              customerFit: 'HIGH',
              commercialDensity: 'MEDIUM',
            },
            baselineSources: [
              {
                id: 'pois',
                label: 'POIs',
                status: 'INDEXED',
                detail: 'Commercial & F&B registry points',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: 'Neighborhood grid geometry',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Arterial feeder access',
                evidenceType: 'DATABASE',
              },
              {
                id: 'zone_metadata',
                label: 'Zone metadata',
                status: 'BASELINE',
                detail: 'Neighborhood retail pocket',
                evidenceType: 'DATABASE',
              },
            ],
            surroundingNodes: [
              {
                id: 'vn2-poi-1',
                name: 'Neighborhood Bakery Pin',
                category: 'COMPETITOR',
                subLabel: 'Listed Bakery & Café',
                lat: 18.5655,
                lng: 73.9175,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn2-poi-2',
                name: 'Viman Nagar Corner Transit Stop',
                category: 'TRANSIT_NODE',
                subLabel: 'Bus Stop',
                lat: 18.5637,
                lng: 73.9191,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'vn2-poi-3',
                name: 'IT Park West Gate',
                category: 'ANCHOR_HUB',
                subLabel: 'Office Daytime Catchment',
                lat: 18.5682,
                lng: 73.9199,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
            ],
          },
        ],
      },
      {
        id: 'area-koregaon-annexe',
        name: 'Koregaon Park Annexe',
        characterTag: 'High-Street + Boutique Dining District',
        summary:
          'Established lifestyle and café district with dense listed competition along North Main Road.',
        center: [18.5362, 73.894],
        defaultZoom: 15,
        boundaryPolygon: [
          [18.5425, 73.8865],
          [18.542, 73.9025],
          [18.5305, 73.9018],
          [18.531, 73.8872],
        ],
        arterialCorridors: [
          {
            name: 'North Main Road Spine',
            path: [
              [18.5382, 73.8875],
              [18.5368, 73.894],
              [18.5355, 73.901],
            ],
          },
        ],
        candidates: [
          {
            id: 'cand-kp-lane-6',
            label: 'North Main — Lane 6 Junction',
            microCorridor: 'Lane 6 / North Main Commercial Node',
            lat: 18.5368,
            lng: 73.8945,
            coordinatesText: '18.5368° N, 73.8945° E',
            intersectionNote: 'High-visibility lifestyle corridor with dense listed dining venues',
            baselineSnapshot: {
              commercialActivity: 'HIGH',
              competition: 'HIGH',
              accessibility: 'HIGH',
              customerFit: 'HIGH',
              commercialDensity: 'HIGH',
            },
            baselineSources: [
              {
                id: 'pois',
                label: 'POIs',
                status: 'INDEXED',
                detail: 'Dense F&B & retail registry',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: 'Lane grid + arterial spine',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Corridor bus & metro feeder',
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
                id: 'kp-poi-1',
                name: 'Starbucks Registry Node',
                category: 'COMPETITOR',
                subLabel: 'Global Café Chain',
                lat: 18.5375,
                lng: 73.8938,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kp-poi-2',
                name: 'Blue Tokai Roastery Pin',
                category: 'COMPETITOR',
                subLabel: 'Specialty Coffee',
                lat: 18.5361,
                lng: 73.8954,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kp-poi-3',
                name: 'Kalyani Nagar Bridge Transit Node',
                category: 'TRANSIT_NODE',
                subLabel: 'Metro & Bus Connector',
                lat: 18.5412,
                lng: 73.8988,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'city-bengaluru',
    name: 'Bengaluru',
    regionLabel: 'Southern Metro Hub',
    center: [12.9352, 77.6245],
    cityZoom: 13,
    localAreas: [
      {
        id: 'area-koramangala-5',
        name: 'Koramangala 5th Block',
        characterTag: 'University + Startup Commercial Pocket',
        summary:
          'High-activity neighborhood grid connecting 80 Feet Road, college hostels, and co-working clusters.',
        center: [12.9345, 77.6192],
        defaultZoom: 15,
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
          {
            name: 'Jyoti Nivas College Road',
            path: [
              [12.9372, 77.6168],
              [12.9338, 77.6185],
              [12.9305, 77.6202],
            ],
          },
        ],
        candidates: [
          {
            id: 'cand-kora-jnc-cross',
            label: 'JNC Road — 1st Cross Corner',
            microCorridor: 'Jyoti Nivas College Road / 80 Feet Link',
            lat: 12.9345,
            lng: 77.6192,
            coordinatesText: '12.9345° N, 77.6192° E',
            intersectionNote: 'Walkable student & startup nexus with strong evening activity',
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
                detail: '14 baseline registry entities mapped',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: '80ft Rd + interior block grid',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'BMTC arterial stops mapped',
                evidenceType: 'DATABASE',
              },
              {
                id: 'zone_metadata',
                label: 'Zone metadata',
                status: 'BASELINE',
                detail: 'Commercial high-street overlay',
                evidenceType: 'DATABASE',
              },
            ],
            surroundingNodes: [
              {
                id: 'kora-poi-1',
                name: 'Third Wave Coffee Registry Pin',
                category: 'COMPETITOR',
                subLabel: 'Listed Café Chain',
                lat: 12.9354,
                lng: 77.6184,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kora-poi-2',
                name: '91springboard Coworking Hub',
                category: 'ANCHOR_HUB',
                subLabel: 'Startup Office Anchor',
                lat: 12.9336,
                lng: 77.6204,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kora-poi-3',
                name: 'Jyoti Nivas Institutional Campus',
                category: 'ANCHOR_HUB',
                subLabel: 'University Catchment',
                lat: 12.9351,
                lng: 77.6173,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kora-poi-4',
                name: '80 Feet Rd Transit Stop',
                category: 'TRANSIT_NODE',
                subLabel: 'Primary Bus Corridor',
                lat: 12.9362,
                lng: 77.6215,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
            ],
          },
          {
            id: 'cand-kora-17th-main',
            label: '17th Main — Parkview Pocket',
            microCorridor: 'Interior 5th Block Mixed Spine',
            lat: 12.9322,
            lng: 77.6221,
            coordinatesText: '12.9322° N, 77.6221° E',
            intersectionNote: 'Balanced residential-office pocket 250m off main arterial',
            baselineSnapshot: {
              commercialActivity: 'MEDIUM',
              competition: 'MEDIUM',
              accessibility: 'HIGH',
              customerFit: 'HIGH',
              commercialDensity: 'MEDIUM',
            },
            baselineSources: [
              {
                id: 'pois',
                label: 'POIs',
                status: 'INDEXED',
                detail: 'Commercial & F&B registry points',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: 'Interior block street network',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Feeder stops within 400m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'zone_metadata',
                label: 'Zone metadata',
                status: 'BASELINE',
                detail: 'Mixed neighborhood commercial',
                evidenceType: 'DATABASE',
              },
            ],
            surroundingNodes: [
              {
                id: 'kora2-poi-1',
                name: 'Chai Point Registry Pin',
                category: 'COMPETITOR',
                subLabel: 'Beverage QSR',
                lat: 12.9329,
                lng: 77.6214,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'kora2-poi-2',
                name: 'Forum Mall Transit Hub',
                category: 'TRANSIT_NODE',
                subLabel: 'Regional Transit & Retail',
                lat: 12.9344,
                lng: 77.6113,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
            ],
          },
        ],
      },
      {
        id: 'area-indiranagar-12',
        name: 'Indiranagar 12th Main',
        characterTag: 'Metro-Connected Retail & Dining Spine',
        summary:
          'High-visibility commercial boulevard linked directly to Indiranagar Metro and 100 Feet Road.',
        center: [12.9719, 77.6412],
        defaultZoom: 15,
        boundaryPolygon: [
          [12.9778, 77.6345],
          [12.9782, 77.6478],
          [12.9662, 77.6482],
          [12.9658, 77.6348],
        ],
        arterialCorridors: [
          {
            name: '100 Feet Road Corridor',
            path: [
              [12.9772, 77.6408],
              [12.9719, 77.6412],
              [12.9665, 77.6415],
            ],
          },
        ],
        candidates: [
          {
            id: 'cand-ind-12th-main-corner',
            label: '12th Main — 3rd Cross Node',
            microCorridor: '12th Main Commercial Promenade',
            lat: 12.9719,
            lng: 77.6412,
            coordinatesText: '12.9719° N, 77.6412° E',
            intersectionNote: 'Premier dining promenade with rapid metro connectivity',
            baselineSnapshot: {
              commercialActivity: 'HIGH',
              competition: 'HIGH',
              accessibility: 'STRONG',
              customerFit: 'HIGH',
              commercialDensity: 'HIGH',
            },
            baselineSources: [
              {
                id: 'pois',
                label: 'POIs',
                status: 'INDEXED',
                detail: ' Commercial & dining registry',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: '100ft Rd + 12th Main grid',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Purple Line Metro + Bus',
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
                id: 'ind-poi-1',
                name: 'Indiranagar Metro Station',
                category: 'TRANSIT_NODE',
                subLabel: 'Rapid Transit Hub',
                lat: 12.9784,
                lng: 77.6386,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
              {
                id: 'ind-poi-2',
                name: '12th Main Roastery Pin',
                category: 'COMPETITOR',
                subLabel: 'Listed Specialty Café',
                lat: 12.9711,
                lng: 77.6403,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'city-ahmedabad',
    name: 'Ahmedabad',
    regionLabel: 'Western Institutional & University Belt',
    center: [23.0365, 72.5462],
    cityZoom: 13,
    localAreas: [
      {
        id: 'area-navrangpura-ceg',
        name: 'Navrangpura — University Road',
        characterTag: 'Campus + Youth Café District',
        summary:
          'Concentrated institutional cluster around CEPT, LD Engineering, and HL College corridors.',
        center: [23.0365, 72.5462],
        defaultZoom: 15,
        boundaryPolygon: [
          [23.0432, 72.5388],
          [23.0435, 72.5535],
          [23.0301, 72.5538],
          [23.0298, 72.5392],
        ],
        arterialCorridors: [
          {
            name: 'University Road Institutional Spine',
            path: [
              [23.0398, 72.541],
              [23.0365, 72.5462],
              [23.0332, 72.5515],
            ],
          },
        ],
        candidates: [
          {
            id: 'cand-ahm-cept-gate',
            label: 'University Road — CEPT North Node',
            microCorridor: 'University Rd / Commerce Six Roads Link',
            lat: 23.0365,
            lng: 72.5462,
            coordinatesText: '23.0365° N, 72.5462° E',
            intersectionNote: 'Walkable multi-campus frontage with metro connectivity',
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
                detail: 'Campus & café registry points',
                evidenceType: 'DATABASE',
              },
              {
                id: 'roads',
                label: 'Road network',
                status: 'MAPPED',
                detail: 'University Rd + CG Rd network',
                evidenceType: 'DATABASE',
              },
              {
                id: 'transit',
                label: 'Transit',
                status: 'MAPPED',
                detail: 'Commerce Six Roads Metro + BRTS',
                evidenceType: 'DATABASE',
              },
              {
                id: 'zone_metadata',
                label: 'Zone metadata',
                status: 'BASELINE',
                detail: 'Institutional + commercial corridor',
                evidenceType: 'DATABASE',
              },
            ],
            surroundingNodes: [
              {
                id: 'ahm-poi-1',
                name: 'CEPT University Campus Anchor',
                category: 'ANCHOR_HUB',
                subLabel: 'Academic Hub',
                lat: 23.0372,
                lng: 72.5451,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
              {
                id: 'ahm-poi-2',
                name: 'Commerce Six Roads Metro Station',
                category: 'TRANSIT_NODE',
                subLabel: 'Metro Transit Node',
                lat: 23.0402,
                lng: 72.5508,
                distanceBand: '300m–2km',
                evidenceType: 'DATABASE',
              },
              {
                id: 'ahm-poi-3',
                name: 'HL College Food Street Pin',
                category: 'COMPETITOR',
                subLabel: 'Listed Beverage & Snack Cluster',
                lat: 23.0351,
                lng: 72.5476,
                distanceBand: '0–300m',
                evidenceType: 'DATABASE',
              },
            ],
          },
        ],
      },
    ],
  },
];
