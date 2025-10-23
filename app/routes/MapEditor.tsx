import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { GameButton } from "../components/GameButton";
import { GameIcon } from "../components/GameIcon";
import { NavBar } from "../components/NavBar";

export function meta() {
  return [
    { title: "Map Editor - Dither" },
    { name: "description", content: "Create maps using your pixel art tiles" },
  ];
}

interface MapCell {
  tileId: string | null;
  x: number;
  y: number;
}

type TileTransform = {
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
};

const CELL_SIZE = 64; // Size of each cell in pixels
const GRID_SIZE = 100; // Number of cells in each direction

export default function MapEditor() {
  const { tiles, getTile } = useTiles();
  
  // Load map from localStorage - now stores both tileId and transform
  const [mapData, setMapData] = useLocalStorage<Array<[string, string]>>('map-editor-data', []);
  const [map, setMap] = useState<Map<string, { tileId: string; transform: TileTransform }>>(() => {
    // Migrate old data format if needed
    const newMap = new Map<string, { tileId: string; transform: TileTransform }>();
    mapData.forEach(([key, value]) => {
      try {
        const parsed = JSON.parse(value);
        if (parsed.tileId) {
          newMap.set(key, parsed);
        } else {
          // Old format - just a tileId string
          newMap.set(key, { tileId: value, transform: { rotation: 0, flipH: false, flipV: false } });
        }
      } catch {
        // Old format - just a tileId string
        newMap.set(key, { tileId: value, transform: { rotation: 0, flipH: false, flipV: false } });
      }
    });
    return newMap;
  });
  
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [activeTransform, setActiveTransform] = useState<TileTransform>({ rotation: 0, flipH: false, flipV: false });
  const [mouseDown, setMouseDown] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Set brown theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'brown');
    
    return () => {
      // Reset to default theme when leaving
      document.documentElement.setAttribute('data-theme', 'green');
    };
  }, []);

  // Save map to localStorage whenever it changes
  useEffect(() => {
    const entries = Array.from(map.entries()).map(([key, value]) => [key, JSON.stringify(value)]);
    setMapData(entries as Array<[string, string]>);
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Center the viewport on mount
  useEffect(() => {
    if (mapContainerRef.current) {
      const container = mapContainerRef.current;
      const centerX = (container.scrollWidth - container.clientWidth) / 2;
      const centerY = (container.scrollHeight - container.clientHeight) / 2;
      container.scrollLeft = centerX;
      container.scrollTop = centerY;
    }
  }, []);

  // Global mouse up handler to ensure mouseDown is reset even when mouse is released outside grid
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setMouseDown(false);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleCellClick = (x: number, y: number) => {
    if (!selectedTileId) return;
    
    const key = `${x},${y}`;
    
    // Draw with current active tile and transform
    setMap(prev => {
      const newMap = new Map(prev);
      newMap.set(key, { tileId: selectedTileId, transform: { ...activeTransform } });
      return newMap;
    });
  };

  const handleCellRightClick = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    const key = `${x},${y}`;
    setMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const getTileImage = (tileId: string, transform?: TileTransform) => {
    const tile = getTile(tileId);
    if (!tile) return null;

    const actualTransform = transform || { rotation: 0, flipH: false, flipV: false };

    // Create a canvas to render the tile
    const canvas = document.createElement('canvas');
    canvas.width = tile.size;
    canvas.height = tile.size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Apply transformations: scale (flip) first, then rotate
    // This ensures flips always work relative to the original tile, not the rotated version
    ctx.save();
    ctx.translate(tile.size / 2, tile.size / 2);
    
    // Apply flips first (these will be applied to the original image)
    ctx.scale(
      actualTransform.flipH ? -1 : 1,
      actualTransform.flipV ? -1 : 1
    );
    
    // Then apply rotation (this rotates the already-flipped image)
    ctx.rotate((actualTransform.rotation * Math.PI) / 180);
    
    ctx.translate(-tile.size / 2, -tile.size / 2);

    // Draw the tile
    for (let y = 0; y < tile.size; y++) {
      for (let x = 0; x < tile.size; x++) {
        const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.restore();
    return canvas.toDataURL();
  };

  const handleMouseDown = (x: number, y: number) => {
    setMouseDown(true);
    handleCellClick(x, y);
  };

  const handleMouseEnter = (x: number, y: number) => {
    if (mouseDown) {
      handleCellClick(x, y);
    }
  };

  const handleMouseUp = () => {
    setMouseDown(false);
  };

  // Render a single cell in the grid
  const renderCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    const cellData = map.get(key);
    const tileImage = cellData ? getTileImage(cellData.tileId, cellData.transform) : null;

    return (
      <div
        key={key}
        className="cursor-pointer relative"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          gridColumn: x + 1,
          gridRow: y + 1,
          border: cellData ? 'none' : '1px solid rgba(0,0,0,0.1)',
        }}
        onMouseDown={() => handleMouseDown(x, y)}
        onMouseEnter={() => handleMouseEnter(x, y)}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => handleCellRightClick(e, x, y)}
      >
        {tileImage && (
          <img
            src={tileImage}
            alt="tile"
            className="w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      {/* Navbar */}
      <NavBar 
        title="Map Editor"
        rightActions={
          <Link 
            to="/tile-editor" 
            className="px-4 py-2 border-2 border-black hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            style={{ 
              backgroundColor: 'var(--theme-accent)',
              boxShadow: '3px 3px 0 #000'
            }}
          >
            Tile Editor
          </Link>
        }
      />

      {/* Tile Palette - Left Sidebar */}
      <div 
        className="fixed left-0 top-16 bottom-0 w-64 border-r-2 border-black overflow-y-auto z-30 p-4"
        style={{ backgroundColor: 'var(--theme-bg-panel)' }}
      >
        <h2 className="text-lg font-bold mb-2">Tiles</h2>
        <p className="text-[10px] opacity-60 mb-4">Right-click to remove tiles</p>
        
        {tiles.length === 0 ? (
          <div className="text-sm opacity-60 text-center">
            <p>No tiles yet</p>
            <Link to="/tile-editor" className="underline">Create some tiles</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tiles.map(tile => {
              const tileImage = getTileImage(tile.id);
              return (
                <div
                  key={tile.id}
                  className={`border-2 border-black cursor-pointer p-1 transition-all ${
                    selectedTileId === tile.id ? 'ring-4 ring-blue-500' : ''
                  }`}
                  style={{ 
                    backgroundColor: 'var(--theme-bg-medium)',
                    boxShadow: '2px 2px 0 #000'
                  }}
                  onClick={() => {
                    setSelectedTileId(tile.id);
                    setActiveTransform({ rotation: 0, flipH: false, flipV: false });
                  }}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Map Grid */}
      <div 
        ref={mapContainerRef}
        className="flex-1 ml-64 mt-16 overflow-auto relative z-0"
        style={{ 
          backgroundColor: 'var(--theme-bg-light)',
        }}
        onMouseLeave={handleMouseUp}
      >
        {/* Active Tile Display & Modifiers - Top Right */}
        {selectedTileId && (
          <div 
            className="fixed top-20 right-8 z-20 flex gap-3"
          >
            {/* Modifiers Panel */}
            <div 
              className="p-3 border-2 border-black"
              style={{ 
                backgroundColor: 'var(--theme-bg-medium)',
                boxShadow: '4px 4px 0 #000'
              }}
            >
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 text-center">
                Modifiers
              </div>
              <div className="flex flex-col gap-2">
                <GameButton
                  icon
                  onClick={() => {
                    // Rotate the active transform by 90 degrees (cycle through 0, 90, 180, 270)
                    setActiveTransform(prev => ({
                      ...prev,
                      rotation: (prev.rotation + 90) % 360
                    }));
                  }}
                  title="Rotate Active Tile (90°)"
                >
                  <span className="text-lg font-bold">↻</span>
                </GameButton>
                <GameButton
                  icon
                  onClick={() => {
                    // Flip horizontally
                    setActiveTransform(prev => ({
                      ...prev,
                      flipH: !prev.flipH
                    }));
                  }}
                  title="Flip Horizontal"
                >
                  <span className="text-lg font-bold">⇄</span>
                </GameButton>
                <GameButton
                  icon
                  onClick={() => {
                    // Reset transform
                    setActiveTransform({ rotation: 0, flipH: false, flipV: false });
                  }}
                  title="Reset Transform"
                >
                  <span className="text-lg font-bold">⟲</span>
                </GameButton>
              </div>
            </div>

            {/* Active Tile Display */}
            <div 
              className="p-3 border-2 border-black"
              style={{ 
                backgroundColor: 'var(--theme-bg-medium)',
                boxShadow: '4px 4px 0 #000'
              }}
            >
              <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2 text-center">
                Active Tile
              </div>
              <div 
                className="border-2 border-black p-2"
                style={{ 
                  backgroundColor: 'var(--theme-bg-panel)',
                  width: '96px',
                  height: '96px'
                }}
              >
                {getTileImage(selectedTileId, activeTransform) && (
                  <img
                    src={getTileImage(selectedTileId, activeTransform)!}
                    alt="active tile"
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
              <div className="text-xs mt-2 text-center truncate max-w-[96px]">
                {tiles.find(t => t.id === selectedTileId)?.name || 'Unknown'}
              </div>
              <div className="text-[9px] mt-1 text-center opacity-60 font-mono">
                {activeTransform.rotation}° {activeTransform.flipH ? 'Flipped' : ''}
              </div>
            </div>
          </div>
        )}

        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            minWidth: GRID_SIZE * CELL_SIZE,
            minHeight: GRID_SIZE * CELL_SIZE,
          }}
        >
          {Array.from({ length: GRID_SIZE }, (_, y) =>
            Array.from({ length: GRID_SIZE }, (_, x) => renderCell(x, y))
          )}
        </div>
      </div>
    </div>
  );
}

