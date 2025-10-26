import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';

const ROUTES = [
  '/tile-editor',
  '/tile-studio',
  '/tiles',
  '/map-editor'
];

export function useRouteCycling() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + Tab to cycle routes
      if (e.shiftKey && e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        // Don't cycle if user is typing in an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        e.preventDefault();

        const currentIndex = ROUTES.indexOf(location.pathname);
        const nextIndex = (currentIndex + 1) % ROUTES.length;
        navigate(ROUTES[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate]);
}

