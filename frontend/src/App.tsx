import { useState, useEffect } from 'react';
import { ReadmeDashboard } from './pages/ReadmeDashboard';
import { ReadmeBuilderPage } from './pages/ReadmeBuilderPage';

export function App() {
  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/draft/')) {
      return hash.replace('#/draft/', '');
    }
    return null;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/draft/')) {
        setActiveDraftId(hash.replace('#/draft/', ''));
      } else {
        setActiveDraftId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenDraft = (draftId: string) => {
    window.location.hash = `#/draft/${draftId}`;
    setActiveDraftId(draftId);
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
    setActiveDraftId(null);
  };

  if (activeDraftId) {
    return (
      <ReadmeBuilderPage
        draftId={activeDraftId}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return <ReadmeDashboard onOpenDraft={handleOpenDraft} />;
}

export default App;
