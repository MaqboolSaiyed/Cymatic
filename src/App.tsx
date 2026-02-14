import { useState } from 'react';
import { Hero } from './features/landing/Hero';
import { Canvas } from './features/canvas/Canvas';

import { TransitionOverlay } from './features/landing/TransitionOverlay';

function App() {
  const [view, setView] = useState<'landing' | 'app'>('landing'); // 'view' is now the *current stable view*
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [targetView, setTargetView] = useState<'landing' | 'app'>('app'); // Where we are going

  const triggerTransition = (to: 'landing' | 'app') => {
    setTargetView(to);
    setIsTransitioning(true);
  };

  const handleSwap = () => {
    setView(targetView);
  };

  const handleComplete = () => {
    setIsTransitioning(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary selection:text-primary-foreground font-sans">
      {isTransitioning && <TransitionOverlay onSwap={handleSwap} onComplete={handleComplete} />}

      {/* Hero: Visible when view is landing OR transitioning FROM/TO landing */}
      <div
        className={`relative z-10 transition-opacity duration-100 ${view === 'app' ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}
      >
        <Hero onStart={() => triggerTransition('app')} />
      </div>

      {/* Canvas: Visible when view is app OR transitioning FROM/TO app */}
      {/* Note: We keep it mounted but change opacity/pointer-events based on view state */}
      <div
        className={`absolute inset-0 z-0 transition-opacity duration-100 ${view === 'app' ? 'opacity-100 relative' : 'opacity-0 pointer-events-none'}`}
        style={{
          visibility: (view === 'landing' && !isTransitioning) ? 'hidden' : 'visible'
        }}
      >
        <Canvas onBack={() => triggerTransition('landing')} />
      </div>
    </div>
  );
}

export default App;
