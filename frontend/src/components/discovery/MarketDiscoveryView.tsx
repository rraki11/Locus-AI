import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Edit3,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  AVAILABLE_BUSINESS_FORMATS,
  AVAILABLE_BUSINESS_PRIORITIES,
  SAMPLE_BUSINESS_PROFILES,
  interpretBusinessDescription,
  parseInrBudget,
} from '../../utils/businessProfileInterpreter';
import {
  BUSINESS_PROFILE_OPTIONS,
  BaselineFactorItem,
  BusinessProfileConfig,
  CategoricalLevel,
  DEFAULT_DISCOVERY_BUSINESS_PROFILE,
  DEMO_LOCATION_PRESETS,
  DemoLocationPreset,
  EVIDENCE_TAXONOMY_DEFINITIONS,
  LOCUS_SPATIAL_RINGS,
  MapCameraLevel,
  MarketBaselineResponse,
  STATE_CITY_HIERARCHY,
  SpatialBandKey,
  fetchMarketBaseline,
  inferNearestGeographicHierarchy,
  isCityMismatchedForState,
  lookupHierarchicalAnchor,
  resolveLocationAnalysis,
} from '../../data/marketDiscoveryData';
import { MarketDiscoveryMap } from './MarketDiscoveryMap';
import { WorkspaceSplineAmbient } from './WorkspaceSplineAmbient';
import {
  WorkspaceStageHero,
  WorkspaceStageNav,
  WorkspaceViewKey,
} from '../common/WorkspaceStageNav';

export interface MarketDiscoveryViewProps {
  /** Scroll transition progress from Page 2 into Page 3 (0.0 -> 1.0) */
  entryProgress?: number;
  initialProfile?: BusinessProfileConfig;
  preferFallback?: boolean;
  onBackToPage2?: () => void;
  onContinueToGroundReality?: (payload: {
    profile: BusinessProfileConfig;
    state: string;
    city: string;
    localArea: string;
    candidateName: string;
    coordinates: { lat: number; lng: number };
    marketBaseline: MarketBaselineResponse | null;
  }) => void;
  unlockedViews?: Set<WorkspaceViewKey>;
  onNavigateToView?: (targetView: WorkspaceViewKey) => void;
}

const CATEGORICAL_TEXT_COLOR: Record<CategoricalLevel, string> = {
  HIGH: 'text-[#818CF8]',
  STRONG: 'text-[#FB923C]',
  MEDIUM: 'text-[#E879F9]',
  LOW: 'text-slate-400',
};

const CATEGORICAL_BADGE_BG: Record<CategoricalLevel, string> = {
  HIGH: 'border-[#818CF8]/35 bg-[#4F46E5]/15 text-[#A5B4FC]',
  STRONG: 'border-[#FB923C]/40 bg-[#F97316]/15 text-[#FDBA74]',
  MEDIUM: 'border-[#E879F9]/35 bg-[#A855F7]/15 text-[#F0ABFC]',
  LOW: 'border-white/10 bg-white/[0.04] text-slate-300',
};

const INITIAL_DEMO_PRESET = DEMO_LOCATION_PRESETS[0]; // Telangana -> Hyderabad -> Jubilee Hills

export const MarketDiscoveryView: React.FC<MarketDiscoveryViewProps> = ({
  entryProgress = 1,
  initialProfile = DEFAULT_DISCOVERY_BUSINESS_PROFILE,
  preferFallback = false,
  onBackToPage2,
  onContinueToGroundReality,
  unlockedViews,
  onNavigateToView,
}) => {
  // 1. Business & Hierarchical Location Setup (Preserved across map & geocoding actions)
  const [profile, setProfile] = useState<BusinessProfileConfig>(initialProfile);
  const [descriptionInput, setDescriptionInput] = useState<string>(
    initialProfile.businessDescription ?? ''
  );
  const [budgetInputStr, setBudgetInputStr] = useState<string>(
    initialProfile.budget ?? ''
  );
  const [budgetValidationError, setBudgetValidationError] = useState<
    string | null
  >(null);
  const [interpretationFeedback, setInterpretationFeedback] = useState<{
    notes: string[];
    confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_CLARIFICATION';
  } | null>(null);
  const [showAdvancedProfileEdit, setShowAdvancedProfileEdit] =
    useState<boolean>(false);

  const [stateInput, setStateInput] = useState<string>(
    INITIAL_DEMO_PRESET.state
  );
  const [cityInput, setCityInput] = useState<string>(INITIAL_DEMO_PRESET.city);
  const [localAreaInput, setLocalAreaInput] = useState<string>(
    INITIAL_DEMO_PRESET.localArea
  );
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(
    `${INITIAL_DEMO_PRESET.candidateName}, ${INITIAL_DEMO_PRESET.city}, ${INITIAL_DEMO_PRESET.state}`
  );

  // 2. Primary Candidate Location State (Map is the spatial source of truth)
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number }>({
    lat: INITIAL_DEMO_PRESET.lat,
    lng: INITIAL_DEMO_PRESET.lng,
  });
  const [hasUserSelectedLocation, setHasUserSelectedLocation] =
    useState<boolean>(true);
  const [cameraLevel, setCameraLevel] = useState<MapCameraLevel>('candidate');
  const [customCandidateLabel, setCustomCandidateLabel] = useState<
    string | null
  >(INITIAL_DEMO_PRESET.candidateName);

  // 3. Geocoding & Market Baseline Engine State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationNotFoundError, setLocationNotFoundError] = useState<
    string | null
  >(null);
  const [searchFeedbackMessage, setSearchFeedbackMessage] = useState<
    string | null
  >('Location resolved');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [marketBaseline, setMarketBaseline] =
    useState<MarketBaselineResponse | null>(null);

  // Track which hierarchy string has already been geocoded so we know if inputs were edited
  const lastGeocodedKeyRef = useRef<string>(
    `${INITIAL_DEMO_PRESET.state}|${INITIAL_DEMO_PRESET.city}|${INITIAL_DEMO_PRESET.localArea}`.toLowerCase()
  );

  // 4. Progressive Disclosure
  const [evidenceExpanded, setEvidenceExpanded] = useState<boolean>(false);
  const [groundRealityHandedOff, setGroundRealityHandedOff] =
    useState<boolean>(false);

  // Contextual City suggestions associated with the entered State
  const contextualCities = useMemo(() => {
    const cleanState = stateInput.trim().toLowerCase();
    if (!cleanState) {
      return STATE_CITY_HIERARCHY.flatMap((s) => s.cities.map((c) => c.city));
    }
    const matchedState = STATE_CITY_HIERARCHY.find(
      (s) =>
        s.state.toLowerCase() === cleanState ||
        s.state.toLowerCase().includes(cleanState)
    );
    if (matchedState) {
      return matchedState.cities.map((c) => c.city);
    }
    return [];
  }, [stateInput]);

  // Contextual Local Area suggestions associated with the entered City
  const contextualLocalAreas = useMemo(() => {
    const cleanCity = cityInput.trim().toLowerCase();
    if (!cleanCity) return [];
    for (const sNode of STATE_CITY_HIERARCHY) {
      const matchedCity = sNode.cities.find(
        (c) =>
          c.city.toLowerCase() === cleanCity ||
          (cleanCity === 'bangalore' && c.city === 'Bengaluru')
      );
      if (matchedCity) {
        return matchedCity.localAreas.map((a) => a.name);
      }
    }
    return [];
  }, [cityInput]);

  // Query the backend Market Baseline Engine whenever resolved coordinates or businessType change
  const loadMarketBaselineForCandidate = useCallback(
    async (params: {
      lat: number;
      lng: number;
      businessType: string;
      targetCustomer: string;
      state: string;
      city: string;
      localArea: string;
      label: string;
    }) => {
      setIsAnalyzing(true);
      try {
        const result = await fetchMarketBaseline({
          businessType: params.businessType,
          targetCustomer: params.targetCustomer,
          latitude: params.lat,
          longitude: params.lng,
          state: params.state,
          city: params.city,
          localArea: params.localArea,
          label: params.label,
        });
        setMarketBaseline(result);
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!hasUserSelectedLocation || isLocating || locationNotFoundError) {
      return;
    }

    const controller = new AbortController();
    setIsAnalyzing(true);

    const candidateLabel =
      localAreaInput.trim() ||
      customCandidateLabel ||
      cityInput.trim() ||
      stateInput.trim() ||
      'Selected Candidate';

    fetchMarketBaseline({
      businessType: profile.businessType,
      targetCustomer: profile.targetCustomer,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      state: stateInput,
      city: cityInput,
      localArea: localAreaInput,
      label: candidateLabel,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setMarketBaseline(res);
          setIsAnalyzing(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsAnalyzing(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    coordinates.lat,
    coordinates.lng,
    stateInput,
    cityInput,
    localAreaInput,
    customCandidateLabel,
    profile.businessType,
    profile.targetCustomer,
    hasUserSelectedLocation,
    isLocating,
    locationNotFoundError,
  ]);

  // Derive location-specific analysis from current State -> City -> Local Area -> Coordinates + MarketBaseline
  const analysis = useMemo(
    () =>
      resolveLocationAnalysis({
        state: stateInput,
        city: cityInput,
        localArea: localAreaInput,
        resolvedAddress,
        coordinates,
        hasUserSelectedLocation,
        cameraLevel,
        customCandidateLabel,
        isLocating,
        locationNotFoundError,
        isAnalyzing,
        marketBaseline,
      }),
    [
      stateInput,
      cityInput,
      localAreaInput,
      resolvedAddress,
      coordinates,
      hasUserSelectedLocation,
      cameraLevel,
      customCandidateLabel,
      isLocating,
      locationNotFoundError,
      isAnalyzing,
      marketBaseline,
    ]
  );

  const reverseGeocodeAbortRef = useRef<AbortController | null>(null);
  const autoLocateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (reverseGeocodeAbortRef.current) {
        reverseGeocodeAbortRef.current.abort();
      }
      if (autoLocateTimerRef.current !== null) {
        window.clearTimeout(autoLocateTimerRef.current);
      }
    };
  }, []);

  // Geocode or reposition map when user enters/selects State -> City -> Local Area
  const resolveHierarchyAndMoveMap = useCallback(
    async (
      nextState: string,
      nextCity: string,
      nextArea: string,
      overrideBusinessType?: string
    ) => {
      const cleanState = nextState.trim();
      const cleanCity = nextCity.trim();
      const cleanArea = nextArea.trim();
      const activeBiz = overrideBusinessType ?? profile.businessType;

      if (!cleanState && !cleanCity && !cleanArea) {
        return;
      }

      if (autoLocateTimerRef.current !== null) {
        window.clearTimeout(autoLocateTimerRef.current);
        autoLocateTimerRef.current = null;
      }

      setGroundRealityHandedOff(false);
      setLocationNotFoundError(null);
      setIsLocating(true);
      setSearchFeedbackMessage('Locating...');

      // 1. Instant hierarchical anchor lookup when matching known State / City / Local Area
      const localMatch = lookupHierarchicalAnchor(
        cleanState,
        cleanCity,
        cleanArea
      );
      if (localMatch) {
        const syncedState = localMatch.matchedState || cleanState || '';
        const syncedCity =
          localMatch.level === 'state'
            ? ''
            : localMatch.matchedCity || cleanCity || '';
        const syncedArea =
          localMatch.level === 'locality' || localMatch.level === 'candidate'
            ? localMatch.matchedArea || cleanArea || ''
            : cleanArea;

        setStateInput(syncedState);
        setCityInput(syncedCity);
        setLocalAreaInput(syncedArea);

        const resolvedTitle =
          syncedArea || syncedCity || syncedState || 'Candidate';
        const formattedAddr = [syncedArea, syncedCity, syncedState]
          .filter(Boolean)
          .join(', ');

        lastGeocodedKeyRef.current = `${syncedState}|${syncedCity}|${syncedArea}`.toLowerCase();
        setResolvedAddress(formattedAddr);
        setIsLocating(false);
        setHasUserSelectedLocation(true);
        setCameraLevel(localMatch.level);
        setCustomCandidateLabel(resolvedTitle);
        setCoordinates({ lat: localMatch.lat, lng: localMatch.lng });
        setSearchFeedbackMessage('Location resolved');

        void loadMarketBaselineForCandidate({
          lat: localMatch.lat,
          lng: localMatch.lng,
          businessType: activeBiz,
          targetCustomer: profile.targetCustomer,
          state: syncedState,
          city: syncedCity,
          localArea: syncedArea,
          label: resolvedTitle,
        });
        return;
      }

      // 2. Live OpenStreetMap Nominatim lookup with addressdetails=1 for arbitrary locations
      const desiredLevel: MapCameraLevel = cleanArea
        ? 'locality'
        : cleanCity
        ? 'city'
        : 'state';

      const query = [cleanArea, cleanCity, cleanState]
        .filter(Boolean)
        .join(', ');

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
            query
          )}`,
          {
            headers: {
              Accept: 'application/json',
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const firstHit = data[0];
            const lat = Number(parseFloat(firstHit.lat).toFixed(5));
            const lon = Number(parseFloat(firstHit.lon).toFixed(5));
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              const addr = firstHit.address || {};
              const geocodedState =
                addr.state || addr.state_district || addr.region || '';
              const geocodedCity =
                addr.city ||
                addr.town ||
                addr.municipality ||
                addr.city_district ||
                addr.county ||
                '';
              const geocodedArea =
                addr.suburb ||
                addr.neighbourhood ||
                addr.quarter ||
                addr.residential ||
                addr.village ||
                addr.hamlet ||
                '';

              const syncedState = cleanState || geocodedState;
              const syncedCity =
                desiredLevel === 'state' ? '' : cleanCity || geocodedCity;
              const syncedArea =
                desiredLevel === 'locality'
                  ? cleanArea || geocodedArea
                  : cleanArea;

              setStateInput(syncedState);
              setCityInput(syncedCity);
              setLocalAreaInput(syncedArea);

              const resolvedTitle =
                syncedArea || syncedCity || syncedState || 'Candidate';
              lastGeocodedKeyRef.current = `${syncedState}|${syncedCity}|${syncedArea}`.toLowerCase();
              setResolvedAddress(
                typeof firstHit.display_name === 'string'
                  ? firstHit.display_name
                  : query
              );
              setIsLocating(false);
              setHasUserSelectedLocation(true);
              setCameraLevel(desiredLevel);
              setCustomCandidateLabel(resolvedTitle);
              setCoordinates({ lat, lng: lon });
              setSearchFeedbackMessage('Location resolved');

              void loadMarketBaselineForCandidate({
                lat,
                lng: lon,
                businessType: activeBiz,
                targetCustomer: profile.targetCustomer,
                state: syncedState,
                city: syncedCity,
                localArea: syncedArea,
                label: resolvedTitle,
              });
              return;
            }
          }
        }
      } catch {
        // Network error falls through to honest not-found recovery
      }

      // 3. Honest Failure Recovery
      setIsLocating(false);
      setSearchFeedbackMessage('Location not found');
      setLocationNotFoundError(
        `Could not resolve "${query}". Check spelling or click directly on the map.`
      );
    },
    [
      profile.businessType,
      profile.targetCustomer,
      loadMarketBaselineForCandidate,
    ]
  );

  const scheduleAutoLocate = useCallback(
    (nextState: string, nextCity: string, nextArea: string, delayMs = 600) => {
      if (autoLocateTimerRef.current !== null) {
        window.clearTimeout(autoLocateTimerRef.current);
      }
      autoLocateTimerRef.current = window.setTimeout(() => {
        autoLocateTimerRef.current = null;
        const key = `${nextState.trim()}|${nextCity.trim()}|${nextArea.trim()}`.toLowerCase();
        if (
          (nextState.trim() || nextCity.trim() || nextArea.trim()) &&
          key !== lastGeocodedKeyRef.current
        ) {
          void resolveHierarchyAndMoveMap(nextState, nextCity, nextArea);
        }
      }, delayMs);
    },
    [resolveHierarchyAndMoveMap]
  );

  // When State changes, clear stale City & Local Area if the state changed, and auto-resolve
  const handleStateChange = (nextStateVal: string) => {
    const prevNorm = stateInput.trim().toLowerCase();
    const nextNorm = nextStateVal.trim().toLowerCase();

    setStateInput(nextStateVal);
    setLocationNotFoundError(null);
    setSearchFeedbackMessage(null);

    let nextCity = cityInput;
    let nextArea = localAreaInput;

    if (
      (prevNorm && prevNorm !== nextNorm) ||
      isCityMismatchedForState(nextStateVal, cityInput)
    ) {
      nextCity = '';
      nextArea = '';
      setCityInput('');
      setLocalAreaInput('');
    }

    const isExactStatePreset = STATE_CITY_HIERARCHY.some(
      (s) => s.state.toLowerCase() === nextNorm
    );
    if (isExactStatePreset) {
      void resolveHierarchyAndMoveMap(nextStateVal, nextCity, nextArea);
    } else if (nextNorm.length >= 3) {
      scheduleAutoLocate(nextStateVal, nextCity, nextArea, 650);
    }
  };

  // When City changes, always clear stale Local Area from the previous city and auto-resolve
  const handleCityChange = (nextCityVal: string) => {
    const prevCity = cityInput.trim().toLowerCase();
    const nextCity = nextCityVal.trim().toLowerCase();
    setCityInput(nextCityVal);
    setLocationNotFoundError(null);
    setSearchFeedbackMessage(null);

    let nextArea = localAreaInput;
    if (prevCity !== nextCity && localAreaInput.trim()) {
      nextArea = '';
      setLocalAreaInput('');
    }

    // Check if the chosen city belongs to a known state in our hierarchy
    let effectiveState = stateInput;
    const matchedParentState = STATE_CITY_HIERARCHY.find((s) =>
      s.cities.some(
        (c) =>
          c.city.toLowerCase() === nextCity ||
          (nextCity === 'bangalore' && c.city === 'Bengaluru')
      )
    );
    if (matchedParentState) {
      effectiveState = matchedParentState.state;
      if (stateInput.trim().toLowerCase() !== matchedParentState.state.toLowerCase()) {
        setStateInput(matchedParentState.state);
      }
      void resolveHierarchyAndMoveMap(effectiveState, nextCityVal, nextArea);
      return;
    }

    if (nextCity.length >= 3) {
      scheduleAutoLocate(effectiveState, nextCityVal, nextArea, 650);
    }
  };

  // When Local Area changes, immediately resolve if matching a suggestion or schedule auto-locate
  const handleLocalAreaChange = (nextAreaVal: string) => {
    const nextAreaNorm = nextAreaVal.trim().toLowerCase();
    setLocalAreaInput(nextAreaVal);
    setLocationNotFoundError(null);
    setSearchFeedbackMessage(null);

    if (!nextAreaNorm) return;

    // Check if it matches a known local area in the hierarchy
    for (const sNode of STATE_CITY_HIERARCHY) {
      for (const cNode of sNode.cities) {
        const matchedArea = cNode.localAreas.find(
          (a) => a.name.toLowerCase() === nextAreaNorm
        );
        if (matchedArea) {
          setStateInput(sNode.state);
          setCityInput(cNode.city);
          void resolveHierarchyAndMoveMap(
            sNode.state,
            cNode.city,
            matchedArea.name
          );
          return;
        }
      }
    }

    if (nextAreaNorm.length >= 3) {
      scheduleAutoLocate(stateInput, cityInput, nextAreaVal, 650);
    }
  };

  // Interpret free-text business description using deterministic rule-based analysis
  const handleInterpretDescription = (textToInterpret: string) => {
    if (!textToInterpret.trim()) {
      setInterpretationFeedback({
        notes: ['Please enter a business description to interpret.'],
        confidence: 'NEEDS_CLARIFICATION',
      });
      return;
    }

    const interpreted = interpretBusinessDescription(textToInterpret);
    setProfile((prev) => ({
      ...prev,
      businessDescription: textToInterpret,
      businessType: interpreted.businessType,
      categoryKey: interpreted.categoryKey,
      targetCustomer: interpreted.targetCustomer,
      preferredFormat: interpreted.preferredFormat ?? prev.preferredFormat,
      preferredSurroundings: interpreted.preferredSurroundings,
      priorities: interpreted.priorities,
      budget: interpreted.budgetValue !== null ? interpreted.budgetFormatted : prev.budget,
    }));

    if (interpreted.budgetValue !== null) {
      setBudgetInputStr(interpreted.budgetFormatted);
      setBudgetValidationError(null);
    }

    setInterpretationFeedback({
      notes: interpreted.interpretationNotes,
      confidence: interpreted.confidence,
    });
  };

  // Handle direct budget input updates with strict validation
  const handleBudgetInputChange = (rawVal: string) => {
    setBudgetInputStr(rawVal);
    if (!rawVal.trim()) {
      setBudgetValidationError('Budget is required');
      setProfile((prev) => ({ ...prev, budget: '' }));
      return;
    }

    const parsed = parseInrBudget(rawVal);
    if (!parsed.isValid) {
      setBudgetValidationError(parsed.validationError || 'Invalid budget');
      setProfile((prev) => ({ ...prev, budget: rawVal }));
    } else {
      setBudgetValidationError(parsed.validationError || null);
      setProfile((prev) => ({
        ...prev,
        budget: parsed.formatted,
      }));
    }
  };

  // Load a sample example preset without forcing defaults
  const handleLoadSampleProfile = (sample: (typeof SAMPLE_BUSINESS_PROFILES)[0]) => {
    setDescriptionInput(sample.description);
    handleInterpretDescription(sample.description);
  };

  // Selecting a Business Type (e.g. Café, Tea Stall) resolves any pending location edits and computes the baseline
  const handleBusinessTypeChange = (nextBusinessType: string) => {
    setProfile((prev) => ({
      ...prev,
      businessType: nextBusinessType,
    }));

    const currentKey = `${stateInput.trim()}|${cityInput.trim()}|${localAreaInput.trim()}`.toLowerCase();
    if (
      (stateInput.trim() || cityInput.trim() || localAreaInput.trim()) &&
      currentKey !== lastGeocodedKeyRef.current
    ) {
      void resolveHierarchyAndMoveMap(
        stateInput,
        cityInput,
        localAreaInput,
        nextBusinessType
      );
    }
  };

  // Handler when clicking on the map or dragging the candidate pin:
  // Immediately replaces stale State/City/Local Area with the clicked neighborhood and refines via live reverse geocoding
  const handleMapCoordinateUpdate = useCallback(
    async (nextCoords: { lat: number; lng: number }) => {
      if (autoLocateTimerRef.current !== null) {
        window.clearTimeout(autoLocateTimerRef.current);
        autoLocateTimerRef.current = null;
      }

      // 1. Immediate local hierarchy check so stale inputs (e.g. 'Jubilee Hills') never linger
      const nearest = inferNearestGeographicHierarchy(
        nextCoords.lat,
        nextCoords.lng
      );

      const immediateState = nearest.state || stateInput.trim() || '';
      const immediateCity = nearest.city || cityInput.trim() || '';
      const immediateArea = nearest.localArea || '';
      const immediateTitle =
        immediateArea || immediateCity || 'Selected Candidate';
      const immediateCandidateLabel = `${immediateTitle} — Candidate`;

      setCoordinates(nextCoords);
      setHasUserSelectedLocation(true);
      setLocationNotFoundError(null);
      setIsLocating(false);
      setCameraLevel('candidate');
      setGroundRealityHandedOff(false);

      if (immediateState) setStateInput(immediateState);
      if (immediateCity) setCityInput(immediateCity);
      setLocalAreaInput(immediateArea);
      setCustomCandidateLabel(immediateCandidateLabel);
      setResolvedAddress(
        [immediateArea, immediateCity, immediateState]
          .filter(Boolean)
          .join(', ') ||
          `${nextCoords.lat.toFixed(4)}, ${nextCoords.lng.toFixed(4)}`
      );
      lastGeocodedKeyRef.current = `${immediateState}|${immediateCity}|${immediateArea}`.toLowerCase();
      setSearchFeedbackMessage(
        immediateArea
          ? `Resolved to ${immediateArea}`
          : 'Resolving selected area...'
      );

      // 2. Live OpenStreetMap Nominatim Reverse Geocoding for exact neighborhood, city, and state
      if (reverseGeocodeAbortRef.current) {
        reverseGeocodeAbortRef.current.abort();
      }
      const controller = new AbortController();
      reverseGeocodeAbortRef.current = controller;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${nextCoords.lat}&lon=${nextCoords.lng}&zoom=16&addressdetails=1`,
          {
            headers: {
              Accept: 'application/json',
            },
            signal: controller.signal,
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data && data.address && !controller.signal.aborted) {
            const addr = data.address;
            const revState =
              addr.state ||
              nearest.state ||
              addr.region ||
              addr.state_district ||
              immediateState;

            const revCity =
              addr.city ||
              addr.municipality ||
              nearest.city ||
              addr.town ||
              addr.city_district ||
              (typeof addr.county === 'string'
                ? addr.county.replace(/\s+mandal$/i, '')
                : '') ||
              addr.state_district ||
              immediateCity;

            const rawAreaCandidates = [
              addr.suburb,
              addr.neighbourhood,
              addr.village,
              addr.town,
              addr.residential,
              addr.quarter,
              addr.locality,
              addr.industrial,
              addr.commercial,
              addr.hamlet,
              typeof addr.county === 'string'
                ? addr.county.replace(/\s+mandal$/i, '')
                : '',
              addr.road,
              typeof data.name === 'string' ? data.name : '',
              nearest.localArea,
            ];

            const revArea =
              rawAreaCandidates.find(
                (candidate): candidate is string =>
                  typeof candidate === 'string' &&
                  candidate.trim().length > 0 &&
                  candidate.trim().toLowerCase() !== revCity.toLowerCase() &&
                  candidate.trim().toLowerCase() !== revState.toLowerCase()
              ) ||
              nearest.localArea ||
              '';

            if (revState) setStateInput(revState);
            if (revCity) setCityInput(revCity);
            setLocalAreaInput(revArea);

            const areaTitle = revArea || revCity || 'Placed Candidate';
            const candidateTitle =
              areaTitle === 'Placed Candidate'
                ? 'Placed Candidate'
                : `${areaTitle} — Candidate`;

            setCustomCandidateLabel(candidateTitle);
            setResolvedAddress(
              typeof data.display_name === 'string'
                ? data.display_name
                : [revArea, revCity, revState].filter(Boolean).join(', ')
            );
            lastGeocodedKeyRef.current = `${revState}|${revCity}|${revArea}`.toLowerCase();
            setSearchFeedbackMessage('Location resolved');
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }

      setSearchFeedbackMessage('Location resolved');
    },
    [stateInput, cityInput]
  );

  // Handler for selecting one of the optional Demo Locations
  const handleSelectDemoPreset = useCallback((preset: DemoLocationPreset) => {
    setStateInput(preset.state);
    setCityInput(preset.city);
    setLocalAreaInput(preset.localArea);
    setResolvedAddress(
      `${preset.candidateName}, ${preset.city}, ${preset.state}`
    );
    lastGeocodedKeyRef.current = `${preset.state}|${preset.city}|${preset.localArea}`.toLowerCase();
    setCoordinates({ lat: preset.lat, lng: preset.lng });
    setHasUserSelectedLocation(true);
    setLocationNotFoundError(null);
    setIsLocating(false);
    setSearchFeedbackMessage('Location resolved');
    setCameraLevel('candidate');
    setCustomCandidateLabel(preset.candidateName);
    setGroundRealityHandedOff(false);
  }, []);

  const handleProceedToGroundReality = useCallback(() => {
    if (!profile.budget || !profile.budget.trim()) {
      setBudgetValidationError('Please enter an available budget in ₹ before proceeding');
      return;
    }
    const parsed = parseInrBudget(profile.budget);
    if (!parsed.isValid) {
      setBudgetValidationError(parsed.validationError || 'Please enter a valid numeric budget in ₹');
      return;
    }

    setGroundRealityHandedOff(true);
    onContinueToGroundReality?.({
      profile,
      state: analysis.state,
      city: analysis.city,
      localArea: analysis.localArea,
      candidateName: analysis.candidateName,
      coordinates: analysis.coordinates,
      marketBaseline: analysis.marketBaseline,
    });
  }, [profile, analysis, onContinueToGroundReality]);

  const handleStageNav = useCallback(
    (target: WorkspaceViewKey) => {
      if (target === 'view2') {
        handleProceedToGroundReality();
      } else if (onNavigateToView) {
        onNavigateToView(target);
      }
    },
    [handleProceedToGroundReality, onNavigateToView]
  );

  // Smooth cubic-eased emergence curve as the user transitions from Page 2 into Page 3
  const rawMain = Math.min(1, Math.max(0, (entryProgress - 0.04) / 0.72));
  const emergence = preferFallback ? 1 : 1 - Math.pow(1 - rawMain, 3);

  const rawSide = Math.min(1, Math.max(0, (entryProgress - 0.14) / 0.74));
  const sideEmergence = preferFallback ? 1 : 1 - Math.pow(1 - rawSide, 3);

  const headerOpacity = preferFallback ? 1 : 0.25 + emergence * 0.75;
  const headerTranslateY = preferFallback ? 0 : (1 - emergence) * -12;

  const workspaceTranslateY = preferFallback ? 0 : (1 - emergence) * 26;
  const workspaceScale = preferFallback ? 1 : 0.968 + emergence * 0.032;
  const workspaceOpacity = preferFallback ? 1 : 0.28 + emergence * 0.72;

  const sidePanelTranslateY = preferFallback ? 0 : (1 - sideEmergence) * 18;
  const sidePanelOpacity = preferFallback ? 1 : 0.32 + sideEmergence * 0.68;

  const activeBaseline = analysis.marketBaseline;
  const spatialBands: {
    band: SpatialBandKey;
    label: string;
    title: string;
    count: number;
  }[] = [
    {
      band: '0-300m',
      label: '0–300m',
      title: 'Ground Reality',
      count: activeBaseline?.bands['0-300m'].count ?? 0,
    },
    {
      band: '300m-2km',
      label: '300m–2km',
      title: 'Local Market',
      count: activeBaseline?.bands['300m-2km'].count ?? 0,
    },
    {
      band: '2-5km',
      label: '2–5km',
      title: 'Wider Market',
      count: activeBaseline?.bands['2-5km'].count ?? 0,
    },
  ];

  const formatConciseSignalExplanation = (
    _key: string,
    explanation: string
  ): string => {
    if (!explanation) return 'Signal evaluated from baseline data.';
    let clean = explanation
      .replace(
        /\s*returned across (all )?three catchment bands,?\s*/i,
        ', '
      )
      .replace(
        /\s*Street-level access verification is reserved for Ground Reality scan\.?\s*/i,
        ''
      )
      .trim();
    if (clean.endsWith(',')) clean = clean.slice(0, -1) + '.';
    return clean;
  };

  const factorEntries: {
    key: string;
    label: string;
    item: BaselineFactorItem;
  }[] = activeBaseline
    ? [
        {
          key: 'commercial_activity',
          label: 'Commercial Activity',
          item: activeBaseline.factors.commercial_activity,
        },
        {
          key: 'competition',
          label: 'Competition',
          item: activeBaseline.factors.competition,
        },
        {
          key: 'accessibility',
          label: 'Accessibility',
          item: activeBaseline.factors.accessibility,
        },
        {
          key: 'commercial_density',
          label: 'Commercial Density',
          item: activeBaseline.factors.commercial_density,
        },
        {
          key: 'customer_fit',
          label: 'Customer Fit',
          item: activeBaseline.factors.customer_fit,
        },
      ]
    : [];

  return (
    <section
      aria-label="Page 3 — View 1: Market Discovery Workspace"
      className="relative min-h-screen w-full overflow-x-clip bg-[var(--stage-bg-base,#051410)] text-[#F8FAFC] transition-colors duration-[850ms] ease-in-out"
    >
      {/* PAGE 3 AMBIENT INTELLIGENCE FIELD (60fps Looping Wave Canvas + Spline + Stippled Grain) */}
      <WorkspaceSplineAmbient
        entryProgress={entryProgress}
        preferFallback={preferFallback}
        themeKey="emerald"
      />

      {/* TOP BAR: Restrained Liquid Glass Workspace Header */}
      <header
        className="relative z-30 border-b border-white/[0.10] bg-[var(--stage-header-bg,rgba(5,20,16,0.78))] backdrop-blur-xl transition-colors duration-[850ms]"
        style={{
          opacity: headerOpacity,
          transform: `translate3d(0, ${headerTranslateY.toFixed(1)}px, 0)`,
        }}
      >
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-6 py-2.5 sm:px-10">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#0F8B68] via-[#72D9B0] to-[#E9F7F0] shadow-[0_0_10px_rgba(114,217,176,0.85)]"
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold tracking-[0.12em] text-white">
                LOCUS AI
              </span>
            </div>
            <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
            <span className="bg-gradient-to-r from-[#72D9B0] via-[#0F8B68] to-[#E9F7F0] bg-clip-text text-xs font-semibold text-transparent">
              01 / Market Discovery
            </span>
          </div>

          {/* 4-View Workspace Sequence Stepper */}
          <WorkspaceStageNav
            currentStage="01"
            onNavigate={handleStageNav}
            unlockedViews={unlockedViews}
          />

          <div className="flex items-center gap-2.5">
            {activeBaseline && (
              <span
                data-testid="baseline-mode-header-pill"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  activeBaseline.data_mode === 'LIVE'
                    ? 'border-[#FB923C]/45 bg-[#F97316]/15 text-[#FDBA74]'
                    : 'border-[#C084FC]/40 bg-[#6D28D9]/20 text-[#E9D5FF]'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    activeBaseline.data_mode === 'LIVE'
                      ? 'bg-[#FB923C]'
                      : 'bg-[#E879F9]'
                  }`}
                />
                <span>
                  {activeBaseline.data_mode === 'LIVE'
                    ? 'LIVE · GOOGLE PLACES'
                    : 'DEMO FALLBACK · DETERMINISTIC'}
                </span>
              </span>
            )}

            {onBackToPage2 && (
              <button
                type="button"
                onClick={onBackToPage2}
                className="liquid-glass-control inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-[#C084FC]/50 hover:text-white"
              >
                <ArrowUp className="h-3.5 w-3.5 text-[#E879F9]" />
                <span>Spatial System</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div
        className="relative z-10 mx-auto max-w-[1680px] px-6 py-4 transition-transform duration-150 ease-out sm:px-10 xl:py-5"
        style={{
          opacity: workspaceOpacity,
          transform: `translate3d(0, ${workspaceTranslateY.toFixed(
            1
          )}px, 0) scale(${workspaceScale.toFixed(4)})`,
        }}
      >
        {/* Prominent Stage Identity Strip */}
        <WorkspaceStageHero
          currentStage="01"
          candidateName={analysis.candidateName}
          city={analysis.city}
          state={analysis.state}
          businessType={profile.businessType}
          onNavigate={handleStageNav}
          unlockedViews={unlockedViews}
        />

        <div className="grid grid-cols-1 gap-5 xl:gap-6 lg:grid-cols-[minmax(256px,21%)_minmax(0,55%)_minmax(288px,24%)] lg:items-stretch">
          {/* LEFT PANEL: Market Setup + Hierarchical Location Inputs */}
          <aside
            aria-label="Market Setup"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5 pr-2.5 xl:pr-3.5 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar"
            style={{
              opacity: sidePanelOpacity,
              transform: `translate3d(0, ${sidePanelTranslateY.toFixed(1)}px, 0)`,
            }}
          >
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-base font-semibold text-white xl:text-lg">
                  Market Setup
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Define your business and target location.
                </p>
              </div>

              {/* USER-DEFINED BUSINESS PROFILE & INTERPRETATION */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Business Profile &amp; Budget
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedProfileEdit((prev) => !prev)}
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>{showAdvancedProfileEdit ? 'Hide Details' : 'Edit All Fields'}</span>
                  </button>
                </div>

                {/* 1. Required Multiline Business Description */}
                <div>
                  <label
                    htmlFor="discovery-business-description"
                    className="block text-[11px] font-medium text-slate-300 mb-1"
                  >
                    Business idea <span className="text-[#FB923C]">*</span>
                  </label>
                  <textarea
                    id="discovery-business-description"
                    data-testid="discovery-business-description"
                    rows={2}
                    value={descriptionInput}
                    onChange={(e) => {
                      setDescriptionInput(e.target.value);
                      setProfile((prev) => ({
                        ...prev,
                        businessDescription: e.target.value,
                      }));
                    }}
                    placeholder="e.g. Small tea and snacks stall near a college with ₹30,000, mainly serving students."
                    className="liquid-glass-subtle w-full rounded-xl p-2.5 text-xs text-white placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      data-testid="interpret-description-button"
                      onClick={() => handleInterpretDescription(descriptionInput)}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 hover:text-white"
                    >
                      <Sparkles className="h-2.5 w-2.5 text-[#FB923C]" />
                      <span>Interpret with Rules</span>
                    </button>
                    <span className="font-mono text-[9px] text-slate-500">
                      Rule-based analyzer
                    </span>
                  </div>
                </div>

                {/* Sample Presets in a compact horizontally scrollable row */}
                <div className="space-y-1">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Sample Examples
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {SAMPLE_BUSINESS_PROFILES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => handleLoadSampleProfile(sample)}
                        className="shrink-0 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:border-[#FB923C]/50 hover:bg-[#F97316]/10 hover:text-white"
                      >
                        {sample.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Required Editable Numeric Budget in INR */}
                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="discovery-budget-input"
                      className="block text-[11px] font-medium text-slate-300"
                    >
                      Available Budget (INR) <span className="text-[#FB923C]">*</span>
                    </label>
                    {profile.budget && !budgetValidationError && (
                      <span className="font-mono text-[10.5px] font-semibold text-[#FB923C]">
                        {profile.budget}
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <input
                      id="discovery-budget-input"
                      data-testid="discovery-budget-input"
                      type="text"
                      value={budgetInputStr}
                      onChange={(e) => handleBudgetInputChange(e.target.value)}
                      placeholder="Enter budget (e.g. ₹50,000, 15L)"
                      className={`liquid-glass-subtle w-full rounded-xl py-1.5 pl-3 pr-3 text-xs font-medium text-white transition-colors focus:outline-none ${
                        budgetValidationError
                          ? 'border-amber-400/80 focus:border-amber-400'
                          : 'focus:border-emerald-500/60'
                      }`}
                    />
                  </div>
                  {budgetValidationError ? (
                    <p
                      data-testid="budget-validation-error"
                      className="mt-1 flex items-center gap-1 font-mono text-[10px] text-amber-300"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      <span>{budgetValidationError}</span>
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      Total capital available for setup.
                    </p>
                  )}
                </div>

                {/* 3. Inferred / Confirmed Business Type & Target Customer */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="discovery-business-type"
                      className="block text-[10.5px] font-medium text-slate-300 mb-0.5"
                    >
                      Business Type
                    </label>
                    <div className="relative">
                      <select
                        id="discovery-business-type"
                        data-testid="discovery-business-type"
                        value={profile.businessType}
                        onChange={(e) => handleBusinessTypeChange(e.target.value)}
                        className="liquid-glass-subtle w-full appearance-none rounded-xl py-1.5 pl-2.5 pr-6 text-xs font-medium text-white transition-colors focus:border-emerald-500/60 focus:outline-none"
                      >
                        {BUSINESS_PROFILE_OPTIONS.businessTypes.map((type) => (
                          <option
                            key={type}
                            value={type}
                            className="bg-[#080616] text-white"
                          >
                            {type}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="discovery-format"
                      className="block text-[10.5px] font-medium text-slate-300 mb-0.5"
                    >
                      Format
                    </label>
                    <div className="relative">
                      <select
                        id="discovery-format"
                        data-testid="discovery-format"
                        value={profile.preferredFormat || 'stall'}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            preferredFormat: e.target.value,
                          }))
                        }
                        className="liquid-glass-subtle w-full appearance-none rounded-xl py-1.5 pl-2.5 pr-6 text-xs text-white transition-colors focus:border-emerald-500/60 focus:outline-none"
                      >
                        {AVAILABLE_BUSINESS_FORMATS.map((fmt) => (
                          <option
                            key={fmt.id}
                            value={fmt.id}
                            className="bg-[#080616] text-white"
                          >
                            {fmt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* 4. Target Customers (Editable Text Input) */}
                <div>
                  <label
                    htmlFor="discovery-target-customer-input"
                    className="block text-[10.5px] font-medium text-slate-300 mb-0.5"
                  >
                    Target Customers
                  </label>
                  <input
                    id="discovery-target-customer-input"
                    data-testid="discovery-target-customer-input"
                    type="text"
                    value={profile.targetCustomer}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        targetCustomer: e.target.value,
                      }))
                    }
                    placeholder="e.g. College students, office workers"
                    className="liquid-glass-subtle w-full rounded-xl py-1.5 px-3 text-xs text-white transition-colors focus:border-emerald-500/60 focus:outline-none"
                  />
                </div>

                {/* Optional Strategic Priorities */}
                <div>
                  <span className="block text-[10.5px] font-medium text-slate-300 mb-1">
                    Priorities
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {AVAILABLE_BUSINESS_PRIORITIES.map((pri) => {
                      const isSelected = profile.priorities?.includes(pri.id) ?? false;
                      return (
                        <button
                          key={pri.id}
                          type="button"
                          onClick={() => {
                            setProfile((prev) => {
                              const curr = prev.priorities || [];
                              const next = isSelected
                                ? curr.filter((p) => p !== pri.id)
                                : [...curr, pri.id];
                              return { ...prev, priorities: next };
                            });
                          }}
                          className={`rounded-lg border px-2 py-0.5 font-mono text-[9.5px] font-medium transition-colors ${
                            isSelected
                              ? 'border-[#FB923C]/60 bg-[#F97316]/20 text-[#FED7AA]'
                              : 'border-white/10 bg-white/[0.02] text-slate-400 hover:text-white'
                          }`}
                        >
                          {pri.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rule-Based Interpretation Feedback Box */}
                {interpretationFeedback && (
                  <div
                    data-testid="interpretation-feedback-box"
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300">
                        Rule Analysis Provenance:
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold ${
                          interpretationFeedback.confidence === 'HIGH'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {interpretationFeedback.confidence} CONFIDENCE
                      </span>
                    </div>
                    <ul className="space-y-0.5 text-[10.5px] text-slate-300">
                      {interpretationFeedback.notes.map((note, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">•</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="border-t border-white/[0.08]" />

              {/* HIERARCHICAL LOCATION FLOW: State -> City -> Local Area (optional) + Explicit LOCATE Action */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void resolveHierarchyAndMoveMap(
                    stateInput,
                    cityInput,
                    localAreaInput
                  );
                }}
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                      Location
                    </h3>
                    {searchFeedbackMessage && (
                      <span
                        data-testid="location-search-feedback"
                        className={`font-mono text-[10px] ${
                          locationNotFoundError
                            ? 'text-amber-300'
                            : isLocating
                            ? 'text-emerald-400'
                            : 'text-[#FB923C]'
                        }`}
                      >
                        · {searchFeedbackMessage}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    data-testid="location-locate-button"
                    className="liquid-glass-control inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-white transition-all hover:border-emerald-500/60"
                  >
                    <Search className="h-3 w-3 text-[#FB923C]" />
                    <span>LOCATE</span>
                  </button>
                </div>

                {/* 1. STATE */}
                <div>
                  <label
                    htmlFor="discovery-state-input"
                    className="mb-0.5 block text-[10.5px] font-medium text-slate-400"
                  >
                    State
                  </label>
                  <div className="relative">
                    <input
                      id="discovery-state-input"
                      type="text"
                      list="locus-state-suggestions"
                      value={stateInput}
                      onChange={(e) => handleStateChange(e.target.value)}
                      onBlur={() => {
                        const nextKey = `${stateInput.trim()}|${cityInput.trim()}|${localAreaInput.trim()}`.toLowerCase();
                        if (
                          stateInput.trim() &&
                          nextKey !== lastGeocodedKeyRef.current
                        ) {
                          void resolveHierarchyAndMoveMap(
                            stateInput,
                            cityInput,
                            localAreaInput
                          );
                        }
                      }}
                      placeholder="e.g. Karnataka"
                      className="liquid-glass-subtle w-full rounded-xl py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none"
                    />
                    {stateInput && (
                      <button
                        type="button"
                        aria-label="Clear state"
                        title="Clear state to choose another"
                        onClick={() => {
                          setStateInput('');
                          setCityInput('');
                          setLocalAreaInput('');
                          setLocationNotFoundError(null);
                          setSearchFeedbackMessage(null);
                          document
                            .getElementById('discovery-state-input')
                            ?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <datalist id="locus-state-suggestions">
                    {STATE_CITY_HIERARCHY.map((s) => (
                      <option key={s.state} value={s.state} />
                    ))}
                  </datalist>
                </div>

                {/* 2. CITY */}
                <div>
                  <label
                    htmlFor="discovery-city-input"
                    className="mb-0.5 block text-[10.5px] font-medium text-slate-400"
                  >
                    City
                  </label>
                  <div className="relative">
                    <input
                      id="discovery-city-input"
                      type="text"
                      list="locus-city-suggestions"
                      value={cityInput}
                      onChange={(e) => handleCityChange(e.target.value)}
                      onBlur={() => {
                        const nextKey = `${stateInput.trim()}|${cityInput.trim()}|${localAreaInput.trim()}`.toLowerCase();
                        if (
                          cityInput.trim() &&
                          nextKey !== lastGeocodedKeyRef.current
                        ) {
                          void resolveHierarchyAndMoveMap(
                            stateInput,
                            cityInput,
                            localAreaInput
                          );
                        }
                      }}
                      placeholder="e.g. Bengaluru"
                      className="liquid-glass-subtle w-full rounded-xl py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none"
                    />
                    {cityInput && (
                      <button
                        type="button"
                        aria-label="Clear city"
                        title="Clear city to choose another"
                        onClick={() => {
                          setCityInput('');
                          setLocalAreaInput('');
                          setLocationNotFoundError(null);
                          setSearchFeedbackMessage(null);
                          document
                            .getElementById('discovery-city-input')
                            ?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <datalist id="locus-city-suggestions">
                    {contextualCities.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>

                {/* 3. LOCAL AREA (Optional) */}
                <div>
                  <label
                    htmlFor="discovery-local-area-input"
                    className="mb-0.5 block text-[10.5px] font-medium text-slate-400"
                  >
                    Local area{' '}
                    <span className="text-slate-500">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="discovery-local-area-input"
                      type="text"
                      list="locus-locality-suggestions"
                      value={localAreaInput}
                      onChange={(e) => handleLocalAreaChange(e.target.value)}
                      onBlur={() => {
                        const nextKey = `${stateInput.trim()}|${cityInput.trim()}|${localAreaInput.trim()}`.toLowerCase();
                        if (
                          localAreaInput.trim() &&
                          nextKey !== lastGeocodedKeyRef.current
                        ) {
                          void resolveHierarchyAndMoveMap(
                            stateInput,
                            cityInput,
                            localAreaInput
                          );
                        }
                      }}
                      placeholder="e.g. Koramangala"
                      className="liquid-glass-subtle w-full rounded-xl py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none"
                    />
                    {localAreaInput && (
                      <button
                        type="button"
                        aria-label="Clear local area"
                        title="Clear local area to choose another"
                        onClick={() => {
                          setLocalAreaInput('');
                          setLocationNotFoundError(null);
                          setSearchFeedbackMessage(null);
                          document
                            .getElementById('discovery-local-area-input')
                            ?.focus();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <datalist id="locus-locality-suggestions">
                    {contextualLocalAreas.map((area) => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                </div>

                {locationNotFoundError ? (
                  <p
                    role="alert"
                    className="pt-0.5 text-xs leading-relaxed text-amber-300/90"
                  >
                    {locationNotFoundError}
                  </p>
                ) : (
                  <p className="pt-0.5 text-[11px] leading-relaxed text-slate-400">
                    Click the map or drag the pin to refine candidate coordinates.
                  </p>
                )}
              </form>
            </div>

            {/* Optional Demo Locations (Clearly separated at bottom) */}
            <div className="mt-3.5 border-t border-white/[0.08] pt-3">
              <p className="mb-1.5 text-xs text-slate-400">Demo locations</p>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_LOCATION_PRESETS.map((preset) => {
                  const isCurrentDemo =
                    hasUserSelectedLocation &&
                    Math.abs(preset.lat - coordinates.lat) < 0.0008 &&
                    Math.abs(preset.lng - coordinates.lng) < 0.0008;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectDemoPreset(preset)}
                      className={`rounded-xl border px-2.5 py-1 text-xs transition-all ${
                        isCurrentDemo
                          ? 'border-[#E879F9]/60 bg-gradient-to-r from-[#4F46E5]/40 via-[#9333EA]/35 to-[#F97316]/30 font-medium text-white shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                          : 'border-white/[0.08] bg-white/[0.03] text-slate-300/80 hover:border-[#C084FC]/40 hover:text-white'
                      }`}
                    >
                      {preset.localArea}, {preset.city}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* CENTER PANEL: Dominant Interactive Map with Candidate & Competitor Markers */}
          <div className="flex flex-col">
            <MarketDiscoveryMap
              analysis={analysis}
              onUpdateCoordinates={handleMapCoordinateUpdate}
              preferFallback={preferFallback}
            />
          </div>

          {/* RIGHT PANEL: Location Summary + Market Baseline + Key Market Signals */}
          <aside
            aria-label="Location Summary"
            className="liquid-glass-dark flex flex-col justify-between rounded-3xl p-4 xl:p-5 pr-2.5 xl:pr-3.5 max-h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar"
            style={{
              opacity: sidePanelOpacity,
              transform: `translate3d(0, ${sidePanelTranslateY.toFixed(1)}px, 0)`,
            }}
          >
            <div className="space-y-4">
              {/* SECTION A: LOCATION */}
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                    Location
                  </h2>
                  <span
                    data-testid="location-resolution-status"
                    className={`font-mono text-[10px] font-semibold ${
                      analysis.locationStatus === 'RESOLVED'
                        ? 'text-[#FB923C]'
                        : analysis.locationStatus === 'NOT_FOUND'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {analysis.locationStatusLabel}
                  </span>
                </div>

                {/* Hidden semantic hooks for backwards-compatible title/subtitle checks */}
                <div className="sr-only">
                  <span data-testid="location-summary-title">
                    {analysis.displayTitle}
                  </span>
                  <span data-testid="location-summary-subtitle">
                    {analysis.displaySubtitle}
                  </span>
                </div>

                <div
                  data-testid="preserved-location-hierarchy"
                  className="liquid-glass-subtle mt-2 space-y-1.5 rounded-2xl p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">State</span>
                    <span
                      data-testid="location-field-state"
                      className="font-medium text-white"
                    >
                      {analysis.state || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">City</span>
                    <span
                      data-testid="location-field-city"
                      className="font-medium text-white"
                    >
                      {analysis.city || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">Local Area</span>
                    <span
                      data-testid="location-field-local-area"
                      className="font-medium text-white"
                    >
                      {analysis.localArea || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] pt-1.5">
                    <span className="text-slate-400">Candidate Coords</span>
                    <span
                      data-testid="location-summary-coords"
                      className="font-mono text-[11px] font-medium text-[#FDBA74]"
                    >
                      {analysis.formattedLat} · {analysis.formattedLng}
                    </span>
                  </div>
                  {analysis.resolvedAddress && (
                    <p
                      data-testid="location-supporting-address"
                      className="truncate pt-0.5 text-[10px] text-slate-400/80"
                      title={analysis.resolvedAddress}
                    >
                      {analysis.resolvedAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION B: MARKET BASELINE */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                    Market Baseline
                  </h3>

                  {isAnalyzing ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>QUERYING</span>
                    </span>
                  ) : (
                    <span
                      data-testid="market-intelligence-status"
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold ${
                        activeBaseline?.data_mode === 'LIVE'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-emerald-500/35 bg-emerald-950/40 text-emerald-300'
                      }`}
                    >
                      {activeBaseline?.data_mode === 'LIVE'
                        ? 'LIVE GOOGLE PLACES'
                        : 'DEMO FALLBACK'}
                    </span>
                  )}
                </div>

                {/* Competitor Counts + Source + Coverage */}
                <div
                  data-testid="spatial-band-counts"
                  className="liquid-glass-subtle space-y-1.5 rounded-2xl p-3"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-white/[0.07] text-[11px]">
                    <span className="text-slate-300 font-medium">Returned by Provider</span>
                    <span className="font-mono font-semibold text-white">
                      {activeBaseline?.total_mapped ?? 0} businesses
                    </span>
                  </div>

                  {spatialBands.map((band) => {
                    const ringMeta = LOCUS_SPATIAL_RINGS.find(
                      (r) => r.bandKey === band.band
                    );
                    const dotColor = ringMeta?.strokeColor ?? '#FB923C';
                    return (
                      <div
                        key={band.band}
                        data-testid={`band-count-${band.band}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="font-mono text-[11px] text-slate-200">
                            {band.label}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-medium text-white">
                          {band.count}
                        </span>
                      </div>
                    );
                  })}

                  <div className="mt-2 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[11px]">
                    <span className="text-slate-400">Data source</span>
                    <span
                      data-testid="baseline-source-label"
                      className="inline-flex items-center gap-1 font-mono text-[10.5px] text-slate-200"
                    >
                      <Database className="h-3 w-3 text-emerald-400" />
                      <span>{activeBaseline?.source ?? 'Google Places'}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Data coverage</span>
                    <span
                      data-testid="baseline-coverage-level"
                      className={`font-mono text-[10.5px] font-semibold ${
                        activeBaseline?.data_coverage.level
                          ? CATEGORICAL_TEXT_COLOR[
                              activeBaseline.data_coverage.level
                            ]
                          : 'text-slate-400'
                      }`}
                    >
                      {activeBaseline?.data_coverage.level ?? 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION C: KEY MARKET SIGNALS */}
              <div>
                <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                    Key Market Signals
                  </h3>
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-300">
                    SIGNALS
                  </span>
                </div>

                {factorEntries.length > 0 ? (
                  <div
                    data-testid="baseline-factors-list"
                    className="space-y-1.5"
                  >
                    {factorEntries.map((factor) => {
                      const conciseText = formatConciseSignalExplanation(
                        factor.key,
                        factor.item.explanation
                      );
                      return (
                        <div
                          key={factor.key}
                          data-testid={`baseline-factor-${factor.key}`}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11.5px]">
                            <span className="font-medium text-slate-200">
                              {factor.label}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.2 font-mono text-[9.5px] font-semibold ${
                                CATEGORICAL_BADGE_BG[factor.item.level]
                              }`}
                            >
                              {factor.item.level}
                            </span>
                          </div>
                          <p
                            className="mt-0.5 truncate text-[10.5px] leading-snug text-slate-300/85"
                            title={conciseText}
                          >
                            {conciseText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-slate-300/80">
                    {analysis.contextNote}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Action + Progressive Disclosure for Mapped Competitors & Provenance */}
            <div className="mt-3.5 space-y-2.5 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={handleProceedToGroundReality}
                className="flex w-full items-center justify-between rounded-2xl border border-[#E879F9]/55 bg-[linear-gradient(135deg,rgba(79,70,229,0.68)_0%,rgba(168,85,247,0.56)_52%,rgba(249,115,22,0.58)_100%)] px-4 py-2.5 text-xs font-semibold tracking-wide text-white shadow-[0_12px_32px_-8px_rgba(147,51,234,0.55),inset_0_1px_0_rgba(255,255,255,0.28)] transition-all hover:border-[#FB923C] hover:brightness-110 focus:outline-none"
              >
                <span>CONTINUE TO GROUND REALITY</span>
                <ArrowRight className="h-4 w-4 text-[#FDBA74]" />
              </button>

              {groundRealityHandedOff && (
                <div
                  role="status"
                  className="liquid-glass-subtle rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <div className="flex items-center gap-1.5 font-medium text-[#FB923C]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>0–300m Ground Reality Scope Locked</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-300">
                    {analysis.displayTitle} ({analysis.formattedLat},{' '}
                    {analysis.formattedLng})
                  </p>
                </div>
              )}

              {/* Progressive Disclosure for Mapped Competitors & Evidence Taxonomy */}
              <div>
                <button
                  type="button"
                  onClick={() => setEvidenceExpanded((prev) => !prev)}
                  aria-expanded={evidenceExpanded}
                  className="flex w-full items-center justify-between py-0.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
                >
                  <span>
                    Mapped competitors &amp; provenance (
                    {activeBaseline?.total_mapped ?? 0})
                  </span>
                  {evidenceExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>

                {evidenceExpanded && (
                  <div className="liquid-glass-subtle mt-2 space-y-2 rounded-xl p-3">
                    {activeBaseline && activeBaseline.places.length > 0 && (
                      <div className="max-h-28 space-y-1 overflow-y-auto border-b border-white/[0.08] pb-2 pr-1.5 custom-scrollbar">
                        {activeBaseline.places.slice(0, 12).map((pl) => (
                          <div
                            key={pl.place_id}
                            className="flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="truncate text-slate-200">
                              {pl.business_name}
                            </span>
                            <span className="shrink-0 font-mono text-[10px] text-[#C084FC]">
                              {pl.distance_m}m · {pl.spatial_band}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1">
                      {analysis.baselineSources.map((src) => (
                        <div
                          key={src.id}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="text-slate-300">{src.label}</span>
                          <span className="font-mono text-[10px] text-[#FB923C]">
                            {src.status}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/[0.08] pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {EVIDENCE_TAXONOMY_DEFINITIONS.map((ev) => (
                          <span
                            key={ev.key}
                            title={ev.statusText}
                            className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[9px] ${
                              ev.activeInView1
                                ? 'bg-[#4F46E5]/20 font-semibold text-[#A5B4FC]'
                                : 'text-slate-500'
                            }`}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor: ev.dotColor,
                                opacity: ev.activeInView1 ? 1 : 0.35,
                              }}
                            />
                            <span>{ev.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};
