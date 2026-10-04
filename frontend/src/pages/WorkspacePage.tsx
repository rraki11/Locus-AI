import React from 'react';
import { MarketDiscoveryView } from '../components/discovery/MarketDiscoveryView';

interface WorkspacePageProps {
  onBack?: () => void;
  embeddedInLanding?: boolean;
  externalReducedMotion?: boolean;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  onBack,
  externalReducedMotion = false,
}) => {
  return (
    <MarketDiscoveryView
      preferFallback={externalReducedMotion}
      onBackToPage2={onBack}
    />
  );
};

export default WorkspacePage;
