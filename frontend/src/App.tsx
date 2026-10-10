import React, { useEffect, useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import {
  WorkspaceViewKey,
  getPathForViewKey,
  getViewKeyForPath,
} from './components/common/WorkspaceStageNav';
import {
  GroundRealityHandoffPayload,
  StreetScanFusionResponse,
} from './types/streetScan';
import {
  LocationIntelligenceComparisonResponse,
  ScenarioAssumptions,
} from './types/locationIntelligence';
import { BASELINE_SCENARIO_ASSUMPTIONS } from './utils/locationIntelligenceEngine';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [handoff, setHandoff] = useState<GroundRealityHandoffPayload | null>(
    null
  );
  const [fusionResult, setFusionResult] =
    useState<StreetScanFusionResponse | null>(null);
  const [scenarioAssumptions, setScenarioAssumptions] =
    useState<ScenarioAssumptions>(BASELINE_SCENARIO_ASSUMPTIONS);
  const [intelligenceComparison, setIntelligenceComparison] =
    useState<LocationIntelligenceComparisonResponse | undefined>(undefined);
  const [unlockedViews, setUnlockedViews] = useState<Set<WorkspaceViewKey>>(
    new Set(['view1'])
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (nextPath: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextPath);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    }
    setCurrentPath(nextPath);
  };

  const activeWorkspaceView: WorkspaceViewKey | null =
    getViewKeyForPath(currentPath);

  if (activeWorkspaceView !== null) {
    return (
      <WorkspacePage
        initialView={activeWorkspaceView}
        onBack={() => navigateTo('/')}
        onViewChange={(newView) => {
          const path = getPathForViewKey(newView);
          if (currentPath !== path) {
            setCurrentPath(path);
          }
        }}
        sharedHandoff={handoff}
        onHandoffChange={setHandoff}
        sharedFusionResult={fusionResult}
        onFusionResultChange={setFusionResult}
        sharedScenarioAssumptions={scenarioAssumptions}
        onScenarioAssumptionsChange={setScenarioAssumptions}
        sharedIntelligenceComparison={intelligenceComparison}
        onIntelligenceComparisonChange={setIntelligenceComparison}
        sharedUnlockedViews={unlockedViews}
        onUnlockedViewsChange={setUnlockedViews}
      />
    );
  }

  return (
    <LandingPage
      onEnterWorkspace={() => navigateTo('/market-discovery')}
      onNavigateToPath={(path) => navigateTo(path)}
      onContinueToGroundReality={(payload) => {
        setHandoff(payload);
        setUnlockedViews((prev) => new Set([...prev, 'view1', 'view2']));
        navigateTo('/ground-reality');
      }}
      unlockedViews={unlockedViews}
    />
  );
};

export default App;
