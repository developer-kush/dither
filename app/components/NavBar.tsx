import React from 'react';
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
    <div className="fixed top-0 left-0 right-0 h-16 bg-[#c2e4c2] border-b-2 border-black z-40 flex items-center px-24">
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
