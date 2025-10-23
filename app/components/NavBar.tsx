import React, { useState, useRef } from 'react';
import { Link } from 'react-router';
import { exportSystemState, importSystemState } from '../utils/exportImport';
import { useTiles } from '../hooks/useTiles';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface NavBarProps {
  title?: string;
  rightActions?: React.ReactNode;
}

export const NavBar: React.FC<NavBarProps> = ({
  title,
  rightActions
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { tiles, loadAllTiles } = useTiles();
  const [mapData] = useLocalStorage<Array<[string, string]>>('map-editor-data', []);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportSystemState(tiles, mapData);
    setShowDropdown(false);
  };

  const handleImportClick = () => {
    importFileRef.current?.click();
    setShowDropdown(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const state = await importSystemState(file);
      
      // Load tiles
      if (state.tiles && state.tiles.length > 0) {
        loadAllTiles(state.tiles);
      }
      
      // Load map data
      if (state.mapData) {
        localStorage.setItem('map-editor-data', JSON.stringify(state.mapData));
      }
      
      alert('Successfully imported data! Refreshing page...');
      window.location.reload();
    } catch (error) {
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Reset input
    e.target.value = '';
  };

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
            className="absolute top-full left-0 pt-2"
          >
            <div
              className="min-w-[200px] border-2 border-black"
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
              className="block px-4 py-3 border-b-2 border-black hover:bg-[var(--theme-accent)] transition-colors"
            >
              <div className="font-bold">Map Editor</div>
              <div className="text-xs opacity-60">Build maps with tiles</div>
            </Link>
            
            <div className="border-t-2 border-black">
              <button 
                onClick={handleExport}
                className="block w-full text-left px-4 py-3 border-b-2 border-black hover:bg-[var(--theme-accent)] transition-colors"
              >
                <div className="font-bold">Export Data</div>
                <div className="text-xs opacity-60">Save all tiles & maps</div>
              </button>
              <button 
                onClick={handleImportClick}
                className="block w-full text-left px-4 py-3 hover:bg-[var(--theme-accent)] transition-colors"
              >
                <div className="font-bold">Import Data</div>
                <div className="text-xs opacity-60">Load saved project</div>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
      
      {title && (
        <div className="text-xl font-bold">{title}</div>
      )}
      
      <div className="flex gap-4">
        {rightActions}
      </div>
      
      {/* Hidden file input for import */}
      <input
        ref={importFileRef}
        type="file"
        accept=".json"
        onChange={handleImportFile}
        className="hidden"
      />
    </div>
  );
};
