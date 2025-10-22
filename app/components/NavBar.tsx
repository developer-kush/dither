import React from 'react';
import { Link } from 'react-router';
import { GameButton } from './GameButton';

interface NavBarProps {
  onExport: (format: 'png' | 'jpeg' | 'webp' | 'svg') => void;
  onReset: () => void;
  onLoadClick: () => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  onExport,
  onReset,
  onLoadClick
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b-2 border-black z-40 flex items-center justify-between px-8" style={{ backgroundColor: 'var(--theme-bg-medium)' }}>
      <Link to="/" className="hover:opacity-80 text-3xl font-extrabold px-5 transition-opacity">
        Dither
      </Link>
      
      <div className="flex gap-4">
        <GameButton onClick={onLoadClick}>
          Load Image
        </GameButton>
        <GameButton onClick={() => onExport('png')}>
          Export PNG
        </GameButton>
        <GameButton onClick={() => onExport('svg')}>
          Export SVG
        </GameButton>
        <GameButton onClick={onReset}>
          Reset
        </GameButton>
      </div>
    </div>
  );
};
