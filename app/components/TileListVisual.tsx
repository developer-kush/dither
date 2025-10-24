import React, { useCallback, useRef } from 'react';
import type { Tile } from '../hooks/useTiles';

interface TileListVisualProps {
  tiles: Tile[];
  onLoadTile: (tile: Tile) => void;
  onDeleteTile: (id: string) => void;
  currentTileId?: string;
}

export const TileListVisual: React.FC<TileListVisualProps> = ({
  tiles,
  onLoadTile,
  onDeleteTile,
  currentTileId,
}) => {
  // Cache for tile images to avoid regenerating them
  const tileImageCache = useRef<Map<string, string>>(new Map());

  const getTileImage = useCallback((tile: Tile) => {
    // Check cache first
    const cached = tileImageCache.current.get(tile.id);
    if (cached) {
      return cached;
    }

    // Create a canvas to render the tile
    const canvas = document.createElement('canvas');
    canvas.width = tile.size;
    canvas.height = tile.size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw the tile
    for (let y = 0; y < tile.size; y++) {
      for (let x = 0; x < tile.size; x++) {
        const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    const dataUrl = canvas.toDataURL();
    
    // Store in cache
    tileImageCache.current.set(tile.id, dataUrl);
    
    return dataUrl;
  }, []);

  if (tiles.length === 0) {
    return (
      <div className="text-sm text-center p-4 opacity-60">
        No tiles saved yet.
        <br />
        Create and save your first tile!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map(tile => {
        const tileImage = getTileImage(tile);
        return (
          <div
            key={tile.id}
            className="relative"
          >
            <div
              className={`border-2 border-black cursor-pointer p-1 transition-all ${
                currentTileId === tile.id ? 'ring-4 ring-blue-500' : ''
              }`}
              style={{ 
                backgroundColor: 'var(--theme-bg-light)',
                boxShadow: '2px 2px 0 #000'
              }}
              onClick={() => onLoadTile(tile)}
            >
              {tileImage && (
                <img
                  src={tileImage}
                  alt={tile.name}
                  className="w-full h-auto"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
              <div className="text-xs mt-1 truncate text-center">{tile.name}</div>
              <div className="text-[10px] opacity-60 text-center font-mono">
                {tile.size}×{tile.size}
              </div>
            </div>
            {/* Delete button - positioned in top right corner */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${tile.name}"?`)) {
                  onDeleteTile(tile.id);
                  // Clear from cache
                  tileImageCache.current.delete(tile.id);
                }
              }}
              className="absolute -top-2 -right-2 w-6 h-6 border-2 border-black bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors z-10"
              style={{ boxShadow: '2px 2px 0 #000' }}
              title="Delete tile"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

