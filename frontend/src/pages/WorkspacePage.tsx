import React, { useState } from 'react';
import { MarketDiscoveryView } from '../components/discovery/MarketDiscoveryView';
import { StreetScanView } from '../components/groundReality/StreetScanView';
import { LocationIntelligenceView } from '../components/intelligence/LocationIntelligenceView';
import { DecisionReportView } from '../components/decision/DecisionReportView';
import { WorkspaceErrorBoundary } from '../components/common/WorkspaceErrorBoundary';
import {
  GroundRealityHandoffPayload,
  StreetScanFusionResponse,
} from '../types/streetScan';
import {
  LocationIntelligenceComparisonResponse,
  ScenarioAssumptions,
} from '../types/locationIntelligence';
import { BASELINE_SCENARIO_ASSUMPTIONS } from '../utils/locationIntelligenceEngine';

import {
  WorkspaceViewKey,
  getPathForViewKey,
  getViewKeyForPath,
} from '../components/common/WorkspaceStageNav';
import {
  DEFAULT_DISCOVERY_BUSINESS_PROFILE,
  DEMO_LOCATION_PRESETS,
} from '../data/marketDiscoveryData';

interface WorkspacePageProps {
  onBack?: () => void;
  embeddedInLanding?: boolean;
  externalReducedMotion?: boolean;
  initialView?: WorkspaceViewKey;
  onViewChange?: (viewKey: WorkspaceViewKey) => void;
  sharedHandoff?: GroundRealityHandoffPayload | null;
  onHandoffChange?: (payload: GroundRealityHandoffPayload | null) => void;
  sharedFusionResult?: StreetScanFusionResponse | null;
  onFusionResultChange?: (result: StreetScanFusionResponse | null) => void;
  sharedScenarioAssumptions?: ScenarioAssumptions;
  onScenarioAssumptionsChange?: (assumptions: ScenarioAssumptions) => void;
  sharedIntelligenceComparison?: LocationIntelligenceComparisonResponse;
  onIntelligenceComparisonChange?: (
    comparison: LocationIntelligenceComparisonResponse
  ) => void;
  sharedUnlockedViews?: Set<WorkspaceViewKey>;
  onUnlockedViewsChange?: (views: Set<WorkspaceViewKey>) => void;
}

import { WorkspaceThemeProvider } from '../context/WorkspaceThemeContext';

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onBack,
  externalReducedMotion = false,
  initialView,
  onViewChange,
  sharedHandoff,
  onHandoffChange,
  sharedFusionResult,
  onFusionResultChange,
  sharedScenarioAssumptions,
  onScenarioAssumptionsChange,
  sharedIntelligenceComparison,
  onIntelligenceComparisonChange,
  sharedUnlockedViews,
  onUnlockedViewsChange,
}) => {
  const [activeView, setActiveView] = useState<WorkspaceViewKey>(() => {
    if (initialView) return initialView;
    if (typeof window !== 'undefined') {
      const fromUrl = getViewKeyForPath(window.location.pathname);
      if (fromUrl) return fromUrl;
    }
    return 'view1';
  });

  const [unlockedViews, setUnlockedViews] = useState<Set<WorkspaceViewKey>>(() => {
    if (sharedUnlockedViews && sharedUnlockedViews.size > 0) {
      return new Set(sharedUnlockedViews);
    }
    const init = initialView ?? (typeof window !== 'undefined' ? getViewKeyForPath(window.location.pathname) : null) ?? 'view1';
    const unlocked = new Set<WorkspaceViewKey>(['view1']);
    if (init === 'view2') unlocked.add('view2');
    if (init === 'view3') {
      unlocked.add('view2');
      unlocked.add('view3');
    }
    if (init === 'view4') {
      unlocked.add('view2');
      unlocked.add('view3');
      unlocked.add('view4');
    }
    return unlocked;
  });

  const [handoff, setHandoff] = useState<GroundRealityHandoffPayload | null>(
    () => sharedHandoff ?? null
  );
  const [fusionResult, setFusionResult] =
    useState<StreetScanFusionResponse | null>(() => sharedFusionResult ?? null);
  const [scenarioAssumptions, setScenarioAssumptions] =
    useState<ScenarioAssumptions>(
      () => sharedScenarioAssumptions ?? BASELINE_SCENARIO_ASSUMPTIONS
    );
  const [intelligenceComparison, setIntelligenceComparison] =
    useState<LocationIntelligenceComparisonResponse | undefined>(
      () => sharedIntelligenceComparison
    );

  // Sync scroll restoration
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Sync state if initialView changes externally from URL popstate
  React.useEffect(() => {
    if (initialView && initialView !== activeView) {
      setActiveView(initialView);
      setUnlockedViews((prev) => new Set([...prev, initialView]));
    }
  }, [initialView]);

  // Scroll to top cleanly whenever activeView changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeView]);

  // Listen to browser Back/Forward (popstate)
  React.useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const viewKey = getViewKeyForPath(window.location.pathname);
      if (viewKey) {
        setActiveView(viewKey);
        setUnlockedViews((prev) => new Set([...prev, viewKey]));
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        onViewChange?.(viewKey);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onViewChange]);

  const handleSwitchView = (nextView: WorkspaceViewKey) => {
    setActiveView(nextView);
    setUnlockedViews((prev) => {
      const updated = new Set([...prev, nextView]);
      onUnlockedViewsChange?.(updated);
      return updated;
    });
    const nextPath = getPathForViewKey(nextView);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    }
    onViewChange?.(nextView);
  };

  const effectiveHandoff = handoff || {
    profile: DEFAULT_DISCOVERY_BUSINESS_PROFILE,
    state: DEMO_LOCATION_PRESETS[0].state,
    city: DEMO_LOCATION_PRESETS[0].city,
    localArea: DEMO_LOCATION_PRESETS[0].localArea,
    candidateName: DEMO_LOCATION_PRESETS[0].candidateName,
    coordinates: {
      lat: DEMO_LOCATION_PRESETS[0].lat,
      lng: DEMO_LOCATION_PRESETS[0].lng,
    },
    marketBaseline: null,
  };

  return (
    <WorkspaceThemeProvider currentView={activeView}>
      <div className="min-h-screen w-full transition-colors duration-[850ms] ease-in-out print:min-h-0 print:!bg-[#F8FBF9]">
        {activeView === 'view1' && (
          <MarketDiscoveryView
            preferFallback={externalReducedMotion}
            onBackToPage2={onBack}
            onBackToHome={onBack}
            onContinueToGroundReality={(payload) => {
              setHandoff((prev) => {
                if (
                  prev &&
                  payload?.coordinates &&
                  (Math.abs(prev.coordinates.lat - payload.coordinates.lat) >
                    0.0005 ||
                    Math.abs(prev.coordinates.lng - payload.coordinates.lng) >
                      0.0005)
                ) {
                  setFusionResult(null);
                  onFusionResultChange?.(null);
                }
                return payload;
              });
              onHandoffChange?.(payload);
              setUnlockedViews((prev) => new Set([...prev, 'view1', 'view2']));
              handleSwitchView('view2');
            }}
            unlockedViews={unlockedViews}
            onNavigateToView={handleSwitchView}
          />
        )}

        {activeView === 'view2' && (
          <WorkspaceErrorBoundary
            viewName="Ground Reality (02 / Street Scan)"
            onReset={() => handleSwitchView('view1')}
          >
            <StreetScanView
              handoff={effectiveHandoff}
              preferFallback={externalReducedMotion}
              onBackToMarketDiscovery={() => handleSwitchView('view1')}
              onBackToHome={onBack}
              onContinueToIntelligence={(fusion) => {
                setFusionResult(fusion);
                onFusionResultChange?.(fusion);
                setUnlockedViews((prev) => new Set([...prev, 'view1', 'view2', 'view3']));
                handleSwitchView('view3');
              }}
              unlockedViews={unlockedViews}
              onNavigateToView={handleSwitchView}
            />
          </WorkspaceErrorBoundary>
        )}

        {activeView === 'view3' && (
          <WorkspaceErrorBoundary
            viewName="Location Intelligence (03)"
            onReset={() => handleSwitchView('view1')}
          >
            <LocationIntelligenceView
              handoff={{
                ...effectiveHandoff,
                streetScanFusion: fusionResult,
              }}
              preferFallback={externalReducedMotion}
              onBackToMarketDiscovery={() => handleSwitchView('view1')}
              onBackToGroundReality={() => handleSwitchView('view2')}
              onBackToHome={onBack}
              onContinueToDecision={(payload) => {
                setScenarioAssumptions(payload.scenarioAssumptions);
                onScenarioAssumptionsChange?.(payload.scenarioAssumptions);
                setIntelligenceComparison(payload.comparison);
                onIntelligenceComparisonChange?.(payload.comparison);
                setUnlockedViews(
                  (prev) => new Set([...prev, 'view1', 'view2', 'view3', 'view4'])
                );
                handleSwitchView('view4');
              }}
              unlockedViews={unlockedViews}
              onNavigateToView={handleSwitchView}
            />
          </WorkspaceErrorBoundary>
        )}

        {activeView === 'view4' && (
          <WorkspaceErrorBoundary
            viewName="Market Entry Decision Report (04)"
            onReset={() => handleSwitchView('view1')}
          >
            <DecisionReportView
              handoff={{
                ...effectiveHandoff,
                streetScanFusion: fusionResult,
                scenarioAssumptions,
                intelligenceComparison,
              }}
              preferFallback={externalReducedMotion}
              onBackToMarketDiscovery={() => handleSwitchView('view1')}
              onBackToGroundReality={() => handleSwitchView('view2')}
              onBackToIntelligence={() => handleSwitchView('view3')}
              onBackToHome={onBack}
              unlockedViews={unlockedViews}
              onNavigateToView={handleSwitchView}
            />
          </WorkspaceErrorBoundary>
        )}
      </div>
    </WorkspaceThemeProvider>
  );
};

export default WorkspacePage;
