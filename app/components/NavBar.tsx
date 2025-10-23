import React, { useState } from 'react';
import { Link } from 'react-router';

interface NavBarProps {
  title?: string;
  rightActions?: React.ReactNode;
}

export const NavBar: React.FC<NavBarProps> = ({
  title,
  rightActions
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 h-16 border-b-2 border-black z-50 flex items-center justify-between px-8 pointer-events-auto" style={{ backgroundColor: 'var(--theme-bg-medium)', pointerEvents: 'auto' }}>
      <div 
        className="relative"
        onMouseEnter={() => setShowDropdown(true)}
        onMouseLeave={() => setShowDropdown(false)}
      >
        <Link to="/" className="hover:opacity-80 text-3xl font-extrabold px-5 transition-opacity block">
          Dither
        </Link>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <div 
            className="absolute top-full left-0 mt-2 min-w-[200px] border-2 border-black"
            style={{ 
              backgroundColor: 'var(--theme-bg-medium)',
              boxShadow: '4px 4px 0 #000'
            }}
          >
            <Link 
              to="/tile-editor"
              className="block px-4 py-3 border-b-2 border-black hover:bg-[var(--theme-accent)] transition-colors"
            >
              <div className="font-bold">Tile Editor</div>
              <div className="text-xs opacity-60">Create pixel art tiles</div>
            </Link>
            <Link 
              to="/map-editor"
              className="block px-4 py-3 hover:bg-[var(--theme-accent)] transition-colors"
            >
              <div className="font-bold">Map Editor</div>
              <div className="text-xs opacity-60">Build maps with tiles</div>
            </Link>
          </div>
        )}
      </div>
      
      {title && (
        <div className="text-xl font-bold">{title}</div>
      )}
      
      <div className="flex gap-4">
        {rightActions}
      </div>
    </div>
  );
};
