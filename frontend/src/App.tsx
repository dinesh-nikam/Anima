import { useState, useEffect } from 'react';
import { ReadmeDashboard } from './pages/ReadmeDashboard';
import { ReadmeBuilderPage } from './pages/ReadmeBuilderPage';
import { GifStudioPage } from './pages/GifStudioPage';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<{ type: 'readme-dashboard' | 'readme-builder' | 'gif-studio'; id?: string }>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/draft/')) {
      return { type: 'readme-builder', id: hash.replace('#/draft/', '') };
    }
    if (hash.startsWith('#/gif')) {
      const id = hash.startsWith('#/gif/') ? hash.replace('#/gif/', '') : undefined;
      return { type: 'gif-studio', id };
    }
    return { type: 'readme-dashboard' };
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/draft/')) {
        setCurrentRoute({ type: 'readme-builder', id: hash.replace('#/draft/', '') });
      } else if (hash.startsWith('#/gif')) {
        const id = hash.startsWith('#/gif/') ? hash.replace('#/gif/', '') : undefined;
        setCurrentRoute({ type: 'gif-studio', id });
      } else {
        setCurrentRoute({ type: 'readme-dashboard' });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenDraft = (draftId: string) => {
    window.location.hash = `#/draft/${draftId}`;
  };

  const handleBackToDashboard = () => {
    window.location.hash = '';
  };

  if (currentRoute.type === 'gif-studio') {
    return <GifStudioPage onBackToApp={handleBackToDashboard} />;
  }

  if (currentRoute.type === 'readme-builder' && currentRoute.id) {
    return (
      <ReadmeBuilderPage
        draftId={currentRoute.id}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <ReadmeDashboard
      onOpenDraft={handleOpenDraft}
      onOpenGifStudio={() => {
        window.location.hash = '#/gif';
      }}
    />
  );
}

export default App;
