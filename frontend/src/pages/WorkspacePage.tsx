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

interface WorkspacePageProps {
  onBack?: () => void;
  embeddedInLanding?: boolean;
  externalReducedMotion?: boolean;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onBack,
  externalReducedMotion = false,
}) => {
  const [activeView, setActiveView] = useState<
    'view1' | 'view2' | 'view3' | 'view4'
  >('view1');
  const [handoff, setHandoff] = useState<GroundRealityHandoffPayload | null>(
    null
  );
  const [fusionResult, setFusionResult] =
    useState<StreetScanFusionResponse | null>(null);
  const [scenarioAssumptions, setScenarioAssumptions] =
    useState<ScenarioAssumptions>(BASELINE_SCENARIO_ASSUMPTIONS);
  const [intelligenceComparison, setIntelligenceComparison] =
    useState<LocationIntelligenceComparisonResponse | undefined>(undefined);

  const handleSwitchView = (nextView: 'view1' | 'view2' | 'view3' | 'view4') => {
    setActiveView(nextView);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#03020A]">
      <div className={activeView !== 'view1' && handoff ? 'hidden' : 'block'}>
        <MarketDiscoveryView
          preferFallback={externalReducedMotion}
          onBackToPage2={onBack}
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
              }
              return payload;
            });
            handleSwitchView('view2');
          }}
        />
      </div>

      {handoff && (
        <div className={activeView === 'view2' ? 'block' : 'hidden'}>
          <WorkspaceErrorBoundary
            viewName="Ground Reality (02 / Street Scan)"
            onReset={() => handleSwitchView('view1')}
          >
            <StreetScanView
              handoff={handoff}
              preferFallback={externalReducedMotion}
              onBackToMarketDiscovery={() => handleSwitchView('view1')}
              onContinueToIntelligence={(fusion) => {
                setFusionResult(fusion);
                handleSwitchView('view3');
              }}
            />
          </WorkspaceErrorBoundary>
        </div>
      )}

      {handoff && (
        <div className={activeView === 'view3' ? 'block' : 'hidden'}>
          <WorkspaceErrorBoundary
            viewName="Location Intelligence (03)"
            onReset={() => handleSwitchView('view1')}
          >
            <LocationIntelligenceView
              handoff={{
                ...handoff,
                streetScanFusion: fusionResult,
              }}
              preferFallback={externalReducedMotion}
              onBackToMarketDiscovery={() => handleSwitchView('view1')}
              onBackToGroundReality={() => handleSwitchView('view2')}
              onContinueToDecision={(payload) => {
                setScenarioAssumptions(payload.scenarioAssumptions);
                setIntelligenceComparison(payload.comparison);
                handleSwitchView('view4');
              }}
            />
          </WorkspaceErrorBoundary>
        </div>
      )}

      {handoff && activeView === 'view4' && (
        <WorkspaceErrorBoundary
          viewName="Market Entry Decision Report (04)"
          onReset={() => handleSwitchView('view1')}
        >
          <DecisionReportView
            handoff={{
              ...handoff,
              streetScanFusion: fusionResult,
              scenarioAssumptions,
              intelligenceComparison,
            }}
            preferFallback={externalReducedMotion}
            onBackToMarketDiscovery={() => handleSwitchView('view1')}
            onBackToGroundReality={() => handleSwitchView('view2')}
            onBackToIntelligence={() => handleSwitchView('view3')}
          />
        </WorkspaceErrorBoundary>
      )}
    </div>
  );
};

export default WorkspacePage;
