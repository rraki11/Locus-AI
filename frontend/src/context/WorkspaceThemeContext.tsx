import React, { createContext, useContext, useEffect, useState } from 'react';
import { WorkspaceViewKey } from '../components/common/WorkspaceStageNav';

export type WorkspaceStageThemeKey = 'emerald' | 'teal' | 'midnight' | 'report';

export interface StageThemeSpec {
  key: WorkspaceStageThemeKey;
  stageCode: '01' | '02' | '03' | '04';
  title: string;
  bgBase: string; // solid base background
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  accentPrimary: string;
  accentSecondary: string;
  accentHighlight: string;
  headerBg: string;
  headerBorder: string;
  // Ambient radial illumination colors
  ambientPrimary: string;
  ambientSecondary: string;
  ambientAccent: string;
  isLightMode?: boolean;
}

export const STAGE_THEMES: Record<WorkspaceViewKey, StageThemeSpec> = {
  view1: {
    key: 'emerald',
    stageCode: '01',
    title: 'Market Discovery',
    bgBase: '#051410', // Deep forest-black
    textPrimary: '#F8FAFC',
    textSecondary: '#A7F3D0',
    textMuted: '#6EE7B7',
    cardBg: 'rgba(9, 45, 37, 0.65)', // Forest green glass
    cardBorder: 'rgba(114, 217, 176, 0.22)', // Mint border
    accentPrimary: '#0F8B68', // Emerald
    accentSecondary: '#092D25', // Forest green
    accentHighlight: '#72D9B0', // Mint
    headerBg: 'rgba(5, 20, 16, 0.78)',
    headerBorder: 'rgba(114, 217, 176, 0.18)',
    ambientPrimary: 'rgba(15, 139, 104, 0.45)', // Emerald aura
    ambientSecondary: 'rgba(9, 45, 37, 0.65)', // Deep forest
    ambientAccent: 'rgba(114, 217, 176, 0.28)', // Mint glow
    isLightMode: false,
  },
  view2: {
    key: 'teal',
    stageCode: '02',
    title: 'Ground Reality',
    bgBase: '#041312', // Near-black teal #071D1B
    textPrimary: '#F8FAFC',
    textSecondary: '#A7F3D0',
    textMuted: '#5EEAD4',
    cardBg: 'rgba(10, 57, 53, 0.60)', // Deep teal #0A3935
    cardBorder: 'rgba(22, 160, 133, 0.28)', // Jade #16A085
    accentPrimary: '#16A085', // Jade
    accentSecondary: '#0A3935', // Deep teal
    accentHighlight: '#78E6C0', // Mint highlight
    headerBg: 'rgba(7, 29, 27, 0.80)',
    headerBorder: 'rgba(22, 160, 133, 0.22)',
    ambientPrimary: 'rgba(22, 160, 133, 0.40)', // Jade
    ambientSecondary: 'rgba(10, 57, 53, 0.60)', // Deep teal
    ambientAccent: 'rgba(120, 230, 192, 0.24)', // Mint highlight
    isLightMode: false,
  },
  view3: {
    key: 'midnight',
    stageCode: '03',
    title: 'Location Intelligence',
    bgBase: '#060E1C', // Midnight navy #091427
    textPrimary: '#F8FAFC',
    textSecondary: '#BAE6FD',
    textMuted: '#7DD3FC',
    cardBg: 'rgba(17, 43, 70, 0.65)', // Deep blue #112B46
    cardBorder: 'rgba(84, 214, 232, 0.25)', // Electric cyan #54D6E8
    accentPrimary: '#54D6E8', // Electric cyan
    accentSecondary: '#245A78', // Muted blue
    accentHighlight: '#DDF6FA', // Cool pale blue
    headerBg: 'rgba(9, 20, 39, 0.82)',
    headerBorder: 'rgba(84, 214, 232, 0.20)',
    ambientPrimary: 'rgba(84, 214, 232, 0.32)', // Electric cyan
    ambientSecondary: 'rgba(17, 43, 70, 0.65)', // Deep blue
    ambientAccent: 'rgba(36, 90, 120, 0.38)', // Muted blue
    isLightMode: false,
  },
  view4: {
    key: 'report',
    stageCode: '04',
    title: 'Decision Report',
    bgBase: '#081713', // Deep forest/emerald canvas with refined high-contrast clean cards
    textPrimary: '#F8FAFC',
    textSecondary: '#E9F7F0',
    textMuted: '#A7F3D0',
    cardBg: 'rgba(9, 45, 37, 0.70)', // Forest green #092D25
    cardBorder: 'rgba(114, 217, 176, 0.26)', // Emerald / Pale mint
    accentPrimary: '#0F8B68', // Emerald #0F8B68
    accentSecondary: '#092D25', // Forest green
    accentHighlight: '#E9F7F0', // Pale mint
    headerBg: 'rgba(6, 25, 20, 0.85)',
    headerBorder: 'rgba(15, 139, 104, 0.24)',
    ambientPrimary: 'rgba(15, 139, 104, 0.42)', // Emerald #0F8B68
    ambientSecondary: 'rgba(9, 45, 37, 0.60)', // Forest green
    ambientAccent: 'rgba(114, 217, 176, 0.25)', // Mint #72D9B0
    isLightMode: false,
  },
};

interface WorkspaceThemeContextType {
  activeView: WorkspaceViewKey;
  activeTheme: StageThemeSpec;
  isTransitioning: boolean;
}

const WorkspaceThemeContext = createContext<WorkspaceThemeContextType>({
  activeView: 'view1',
  activeTheme: STAGE_THEMES.view1,
  isTransitioning: false,
});

export const useWorkspaceTheme = () => useContext(WorkspaceThemeContext);

export interface WorkspaceThemeProviderProps {
  currentView: WorkspaceViewKey;
  children: React.ReactNode;
}

export const WorkspaceThemeProvider: React.FC<WorkspaceThemeProviderProps> = ({
  currentView,
  children,
}) => {
  const [activeView, setActiveView] = useState<WorkspaceViewKey>(currentView);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  useEffect(() => {
    if (currentView !== activeView) {
      setIsTransitioning(true);
      setActiveView(currentView);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [currentView, activeView]);

  const activeTheme = STAGE_THEMES[activeView] || STAGE_THEMES.view1;

  // Set CSS Custom Properties on document root or theme wrapper for seamless 850ms crossfade
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.style.setProperty('--stage-bg-base', activeTheme.bgBase);
    root.style.setProperty('--stage-accent-primary', activeTheme.accentPrimary);
    root.style.setProperty('--stage-accent-secondary', activeTheme.accentSecondary);
    root.style.setProperty('--stage-accent-highlight', activeTheme.accentHighlight);
    root.style.setProperty('--stage-card-bg', activeTheme.cardBg);
    root.style.setProperty('--stage-card-border', activeTheme.cardBorder);
    root.style.setProperty('--stage-ambient-primary', activeTheme.ambientPrimary);
    root.style.setProperty('--stage-ambient-secondary', activeTheme.ambientSecondary);
    root.style.setProperty('--stage-ambient-accent', activeTheme.ambientAccent);
    root.style.setProperty('--stage-header-bg', activeTheme.headerBg);
    root.style.setProperty('--stage-header-border', activeTheme.headerBorder);
  }, [activeTheme]);

  return (
    <WorkspaceThemeContext.Provider
      value={{
        activeView,
        activeTheme,
        isTransitioning,
      }}
    >
      <div
        data-stage-theme={activeTheme.key}
        data-stage-code={activeTheme.stageCode}
        className="w-full min-h-screen transition-colors duration-[850ms] ease-in-out print:min-h-0 print:!bg-[#F8FBF9] print:!text-[#14231E]"
        style={{
          backgroundColor: activeTheme.bgBase,
          color: activeTheme.textPrimary,
        }}
      >
        {children}
      </div>
    </WorkspaceThemeContext.Provider>
  );
};
