import React, { useEffect, useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';

type RoutePath = '/' | '/workspace';

export const App: React.FC = () => {
  const [route, setRoute] = useState<RoutePath>(() =>
    typeof window !== 'undefined' && window.location.pathname === '/workspace'
      ? '/workspace'
      : '/'
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoute(window.location.pathname === '/workspace' ? '/workspace' : '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (nextRoute: RoutePath) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextRoute);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    setRoute(nextRoute);
  };

  if (route === '/workspace') {
    return <WorkspacePage onBack={() => navigate('/')} />;
  }

  return <LandingPage onEnterWorkspace={() => navigate('/workspace')} />;
};

export default App;
