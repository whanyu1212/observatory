import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $windows, $activeWindow } from '@/stores/osStore';
import { WindowFrame } from './WindowFrame';
import { DossierApp } from '@/components/apps/DossierApp';
import { DeploymentsApp } from '@/components/apps/DeploymentsApp';
import { TerminalApp } from '@/components/apps/TerminalApp';
import { CommsApp } from '@/components/apps/CommsApp';
import { TransmissionsApp } from '@/components/apps/TransmissionsApp';

function useMobileWorkspace() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobile;
}

export const Desktop: React.FC = () => {
  const windows = useStore($windows);
  const activeId = useStore($activeWindow);
  const isMobile = useMobileWorkspace();
  const openWindows = Object.values(windows)
    .filter((win) => win.isOpen)
    .sort((a, b) => a.zIndex - b.zIndex);

  if (openWindows.length === 0) return null;

  const visibleWindows = openWindows.filter((win) => !win.isMinimized);
  const mobileWindow = visibleWindows.find((win) => win.id === activeId) ?? visibleWindows.at(-1);

  const renderApp = (id: keyof typeof windows) => {
    switch (id) {
      case 'dossier':
        return <DossierApp />;
      case 'deployments':
        return <DeploymentsApp />;
      case 'terminal':
        return <TerminalApp />;
      case 'transmissions':
        return <TransmissionsApp />;
      case 'comms':
        return <CommsApp />;
    }
  };

  return (
    <section
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      style={{ height: '100dvh' }}
      aria-label="Application workspace"
    >
      {openWindows.map((win) => {
        const isVisible = !win.isMinimized && (!isMobile || mobileWindow?.id === win.id);
        return (
          <WindowFrame
            key={win.id}
            window={win}
            isActive={activeId === win.id && isVisible}
            isMobile={isMobile}
            isVisible={isVisible}
          >
            {renderApp(win.id)}
          </WindowFrame>
        );
      })}
    </section>
  );
};
