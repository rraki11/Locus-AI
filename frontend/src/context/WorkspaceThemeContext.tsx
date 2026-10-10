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
    bgBase: '#040A08', // Deep obsidian canvas
    textPrimary: '#F8FAFC',
    textSecondary: '#A7F3D0',
    textMuted: '#6EE7B7',
    cardBg: 'rgba(8, 14, 12, 0.74)', // Pure obsidian crystal glass
    cardBorder: 'rgba(52, 211, 153, 0.20)', // Subtle emerald aura
    accentPrimary: '#10B981', // Emerald
    accentSecondary: '#065F46', // Deep emerald
    accentHighlight: '#6EE7B7', // Mint
    headerBg: 'rgba(5, 12, 10, 0.85)',
    headerBorder: 'rgba(52, 211, 153, 0.16)',
    ambientPrimary: 'rgba(16, 185, 129, 0.28)', // Emerald aura
    ambientSecondary: 'rgba(6, 95, 70, 0.30)', // Deep emerald glow
    ambientAccent: 'rgba(110, 231, 183, 0.22)', // Mint sheen
    isLightMode: false,
  },
  view2: {
    key: 'teal',
    stageCode: '02',
    title: 'Ground Reality',
    bgBase: '#03080E', // Deep cyber-obsidian canvas
    textPrimary: '#F8FAFC',
    textSecondary: '#A7F3D0',
    textMuted: '#5EEAD4',
    cardBg: 'rgba(9, 14, 20, 0.74)', // Obsidian crystal glass (no green sludge!)
    cardBorder: 'rgba(45, 212, 191, 0.22)', // Subtle elegant aurora rim
    accentPrimary: '#14B8A6', // Teal
    accentSecondary: '#0D9488', // Cyan-teal
    accentHighlight: '#5EEAD4', // Bright cyan-mint highlight
    headerBg: 'rgba(6, 12, 18, 0.85)',
    headerBorder: 'rgba(45, 212, 191, 0.16)',
    ambientPrimary: 'rgba(20, 184, 166, 0.28)', // Cyber teal
    ambientSecondary: 'rgba(14, 165, 233, 0.24)', // Electric sky
    ambientAccent: 'rgba(94, 234, 212, 0.20)', // Mint sheen
    isLightMode: false,
  },
  view3: {
    key: 'midnight',
    stageCode: '03',
    title: 'Location Intelligence',
    bgBase: '#040814', // Cosmic midnight navy canvas
    textPrimary: '#F8FAFC',
    textSecondary: '#BAE6FD',
    textMuted: '#7DD3FC',
    cardBg: 'rgba(9, 15, 26, 0.74)', // Midnight sapphire obsidian glass
    cardBorder: 'rgba(56, 189, 248, 0.22)', // Electric sky-cyan rim
    accentPrimary: '#38BDF8', // Electric cyan
    accentSecondary: '#1E40AF', // Deep sapphire
    accentHighlight: '#BAE6FD', // Pale ice blue
    headerBg: 'rgba(6, 12, 22, 0.85)',
    headerBorder: 'rgba(56, 189, 248, 0.16)',
    ambientPrimary: 'rgba(56, 189, 248, 0.28)', // Electric cyan
    ambientSecondary: 'rgba(30, 64, 175, 0.28)', // Deep sapphire glow
    ambientAccent: 'rgba(125, 211, 252, 0.22)', // Pale blue sheen
    isLightMode: false,
  },
  view4: {
    key: 'report',
    stageCode: '04',
    title: 'Decision Report',
    bgBase: '#040A08', // Refined executive obsidian canvas
    textPrimary: '#F8FAFC',
    textSecondary: '#E9F7F0',
    textMuted: '#A7F3D0',
    cardBg: 'rgba(8, 14, 12, 0.76)', // Executive obsidian crystal glass
    cardBorder: 'rgba(52, 211, 153, 0.22)', // Subtle emerald / mint rim
    accentPrimary: '#10B981', // Emerald
    accentSecondary: '#065F46', // Deep emerald
    accentHighlight: '#A7F3D0', // Pale mint
    headerBg: 'rgba(5, 12, 10, 0.85)',
    headerBorder: 'rgba(16, 185, 129, 0.18)',
    ambientPrimary: 'rgba(16, 185, 129, 0.30)', // Emerald aura
    ambientSecondary: 'rgba(6, 95, 70, 0.30)', // Deep emerald glow
    ambientAccent: 'rgba(110, 231, 183, 0.20)', // Mint sheen
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
