import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { GameButton } from "../components/GameButton";
import { GameIcon } from "../components/GameIcon";
import { NavBar } from "../components/NavBar";
import { 
  EyeIcon, 
  EyeSlashIcon, 
  TrashIcon, 
  ArrowUpIcon, 
  ArrowDownIcon, 
  PlusIcon,
  ChevronUpIcon 
} from "@heroicons/react/24/outline";

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

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  mapData: Map<string, { tileId: string; transform: TileTransform }>;
}

const CELL_SIZE = 64; // Size of each cell in pixels
const GRID_SIZE = 100; // Number of cells in each direction

type Tool = 'pen' | 'eraser';

export default function MapEditor() {
  const { tiles, getTile } = useTiles();
  
  // Load layers from localStorage
  const [layersData, setLayersData] = useLocalStorage<any[]>('map-editor-layers', []);
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (layersData.length === 0) {
      // Create default layer
      return [{
        id: `layer_${Date.now()}`,
        name: 'Ground',
        visible: true,
        mapData: new Map()
      }];
    }
    
    // Load layers from storage
    return layersData.map((layerData: any) => ({
      id: layerData.id,
      name: layerData.name,
      visible: layerData.visible,
      mapData: new Map(layerData.mapData.map(([key, value]: [string, string]) => {
        try {
          const parsed = JSON.parse(value);
          return [key, parsed];
        } catch {
          return [key, { tileId: value, transform: { rotation: 0, flipH: false, flipV: false } }];
        }
      }))
    }));
  });
  
  const [activeLayerId, setActiveLayerId] = useState<string>(() => layers[0]?.id || '');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [activeTransform, setActiveTransform] = useState<TileTransform>({ rotation: 0, flipH: false, flipV: false });
  const [mouseDown, setMouseDown] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const layersMenuRef = useRef<HTMLDivElement>(null);
  
  // Cache for tile images to avoid regenerating them
  const tileImageCache = useRef<Map<string, string>>(new Map());

  // Ensure there's always an active layer
  useEffect(() => {
    if (layers.length > 0 && (!activeLayerId || !layers.find(l => l.id === activeLayerId))) {
      setActiveLayerId(layers[0].id);
    }
  }, [layers, activeLayerId]);

  // Set theme based on current tool
  useEffect(() => {
    const theme = currentTool === 'eraser' ? 'cyan' : 'brown';
    document.documentElement.setAttribute('data-theme', theme);
    
    return () => {
      // Reset to default theme when leaving
      document.documentElement.setAttribute('data-theme', 'green');
    };
  }, [currentTool]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Cycle tools with F key: pen -> eraser -> pen
      if (key === 'f') {
        e.preventDefault();
        setCurrentTool(prev => prev === 'pen' ? 'eraser' : 'pen');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Save layers to localStorage whenever they change
  useEffect(() => {
    const serializedLayers = layers.map(layer => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      mapData: Array.from(layer.mapData.entries()).map(([key, value]) => [key, JSON.stringify(value)])
    }));
    setLayersData(serializedLayers);
  }, [layers]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Clear tile image cache when tiles change
  useEffect(() => {
    tileImageCache.current.clear();
  }, [tiles]);

  const handleCellClick = (x: number, y: number) => {
    const key = `${x},${y}`;
    
    // Update only the active layer
    setLayers(prevLayers => {
      return prevLayers.map(layer => {
        if (layer.id !== activeLayerId) return layer;
        
        const newMapData = new Map(layer.mapData);
        
        if (currentTool === 'eraser') {
          // Eraser mode - remove tile from active layer
          newMapData.delete(key);
        } else {
          // Pen mode - draw tile on active layer
          if (!selectedTileId) return layer;
          newMapData.set(key, { tileId: selectedTileId, transform: { ...activeTransform } });
        }
        
        return { ...layer, mapData: newMapData };
      });
    });
  };


  const getTileImage = useCallback((tileId: string, transform?: TileTransform) => {
    const actualTransform = transform || { rotation: 0, flipH: false, flipV: false };
    
    // Create cache key from tileId and transform
    const cacheKey = `${tileId}_${actualTransform.rotation}_${actualTransform.flipH}_${actualTransform.flipV}`;
    
    // Check cache first
    const cached = tileImageCache.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const tile = getTile(tileId);
    if (!tile) return null;

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
    const dataUrl = canvas.toDataURL();
    
    // Store in cache
    tileImageCache.current.set(cacheKey, dataUrl);
    
    return dataUrl;
  }, [getTile]);

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

  // Layer management functions
  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${layers.length + 1}`,
      visible: true,
      mapData: new Map()
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length === 1) return; // Don't delete the last layer
    
    const layerToDelete = layers.find(l => l.id === layerId);
    if (layerToDelete && layerToDelete.mapData.size > 0) {
      // Confirm deletion if layer has tiles
      if (!window.confirm(`Delete layer "${layerToDelete.name}" with ${layerToDelete.mapData.size} tiles?`)) {
        return;
      }
    }
    
    // Always ensure a layer is active after deletion
    if (activeLayerId === layerId) {
      const remainingLayers = layers.filter(l => l.id !== layerId);
      setActiveLayerId(remainingLayers[0]?.id || '');
    }
    
    setLayers(prev => prev.filter(l => l.id !== layerId));
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, visible: !l.visible } : l
    ));
  };

  const renameLayer = (layerId: string, newName: string) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, name: newName } : l
    ));
  };

  const moveLayerUp = (layerId: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index >= prev.length - 1) return prev;
      const newLayers = [...prev];
      [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
      return newLayers;
    });
  };

  const moveLayerDown = (layerId: string) => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === layerId);
      if (index <= 0) return prev;
      const newLayers = [...prev];
      [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
      return newLayers;
    });
  };

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerId(layerId);
  };

  const handleDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    
    if (!draggedLayerId || draggedLayerId === targetLayerId) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    setLayers(prev => {
      const draggedIndex = prev.findIndex(l => l.id === draggedLayerId);
      const targetIndex = prev.findIndex(l => l.id === targetLayerId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      const newLayers = [...prev];
      const [removed] = newLayers.splice(draggedIndex, 1);
      newLayers.splice(targetIndex, 0, removed);
      
      return newLayers;
    });

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  // Render a single cell in the grid - stacking all visible layers
  const renderCell = (x: number, y: number) => {
    const key = `${x},${y}`;
    
    // Check if any visible layer has a tile at this position
    const hasAnyTile = layers.some(layer => layer.visible && layer.mapData.has(key));

    return (
      <div
        key={key}
        className="cursor-pointer relative"
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          gridColumn: x + 1,
          gridRow: y + 1,
          border: hasAnyTile ? 'none' : '1px solid rgba(0,0,0,0.1)',
          userSelect: 'none',
        }}
        onMouseDown={() => handleMouseDown(x, y)}
        onMouseEnter={() => handleMouseEnter(x, y)}
        onMouseUp={handleMouseUp}
      >
        {/* Render all visible layers from bottom to top */}
        {layers.map((layer, index) => {
          if (!layer.visible) return null;
          
          const cellData = layer.mapData.get(key);
          if (!cellData) return null;
          
          const tileImage = getTileImage(cellData.tileId, cellData.transform);
          if (!tileImage) return null;
          
          return (
            <img
              key={layer.id}
              src={tileImage}
              alt="tile"
              className="w-full h-full absolute top-0 left-0"
              style={{ 
                imageRendering: 'pixelated', 
                pointerEvents: 'none',
                zIndex: index,
                opacity: layer.id === activeLayerId ? 1 : 0.85
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      {/* Navbar */}
      <NavBar 
        title="Map Editor"
      />

      {/* Right Menu - Tools */}
      <div 
        className="game-menu right open"
        style={{
          width: '200px',
          transform: 'translateX(calc(100% - 16px))',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(calc(100% - 16px))';
        }}
      >
        <div className="game-menu-content overflow-y-auto">
          <div className="text-sm font-bold mb-3 uppercase tracking-wide opacity-60">
            Tools
          </div>
          
          {/* Pen Tool */}
          <GameButton
            onClick={() => setCurrentTool('pen')}
            style={{
              backgroundColor: currentTool === 'pen' ? 'var(--theme-accent)' : 'var(--theme-bg-light)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">✏️</span>
              <span>Pen</span>
            </div>
          </GameButton>

          {/* Eraser Tool */}
          <GameButton
            onClick={() => setCurrentTool('eraser')}
            style={{
              backgroundColor: currentTool === 'eraser' ? 'var(--theme-accent)' : 'var(--theme-bg-light)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🧹</span>
              <span>Eraser</span>
            </div>
          </GameButton>

          {/* Tool Info */}
          <div className="mt-4 p-3 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
            <div className="text-[10px] opacity-60 uppercase tracking-wide mb-1">
              Current Tool
            </div>
            <div className="text-sm font-bold capitalize">
              {currentTool}
            </div>
            {currentTool === 'pen' && (
              <div className="text-[9px] opacity-60 mt-1">
                Click to place tiles
              </div>
            )}
            {currentTool === 'eraser' && (
              <div className="text-[9px] opacity-60 mt-1">
                Click to remove tiles
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tile Palette - Left Sidebar */}
      <div 
        className="fixed left-0 top-16 bottom-0 w-64 border-r-2 border-black overflow-y-auto z-30 p-4"
        style={{ backgroundColor: 'var(--theme-bg-panel)' }}
      >
        <h2 className="text-lg font-bold mb-2">Tiles</h2>
        <p className="text-[10px] opacity-60 mb-4">Press F to toggle tools</p>
        
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

        {/* Layers Menu - Bottom Right */}
        <div 
          ref={layersMenuRef}
          className="fixed right-8 bottom-0 transition-all duration-300 ease-out flex flex-col"
          style={{
            width: '280px',
            zIndex: 10,
            transform: layersMenuOpen ? 'translateY(0)' : `translateY(calc(100% - 50px))`,
            height: selectedTileId ? 'calc(100vh - 340px)' : 'calc(100vh - 100px)',
          }}
          onMouseEnter={() => setLayersMenuOpen(true)}
          onMouseLeave={() => setLayersMenuOpen(false)}
        >
          {/* Nudge/Tab - at the top */}
          <div 
            className="w-full p-2 border-2 border-black text-center cursor-pointer flex-shrink-0"
            style={{ 
              backgroundColor: 'var(--theme-bg-medium)',
              boxShadow: '4px 0px 0 #000, -4px 0px 0 #000, 0px -4px 0 #000',
              borderBottom: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
            }}
          >
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm font-bold uppercase tracking-wide">Layers</span>
              <ChevronUpIcon className="w-5 h-5" />
            </div>
          </div>
          
          {/* Layers Panel */}
          <div 
            className="p-4 border-2 border-black overflow-y-auto flex-1"
            style={{ 
              backgroundColor: 'var(--theme-bg-medium)',
              boxShadow: '4px 4px 0 #000',
              borderTop: 'none',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold uppercase tracking-wide opacity-80">
                Layer List
              </div>
            <GameButton
              icon
              onClick={addLayer}
              title="Add Layer"
            >
              <PlusIcon className="w-5 h-5" />
            </GameButton>
            </div>
            
            {/* Layers List - Render from top to bottom (reversed) */}
            <div className="flex flex-col gap-2">
              {[...layers].reverse().map((layer, reversedIndex) => {
                const actualIndex = layers.length - 1 - reversedIndex;
                const isDragging = draggedLayerId === layer.id;
                const isDragOver = dragOverLayerId === layer.id;
                
                return (
                  <div
                    key={layer.id}
                    className="border-2 border-black p-2"
                    draggable
                    onDragStart={(e) => handleDragStart(e, layer.id)}
                    onDragOver={(e) => handleDragOver(e, layer.id)}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, layer.id)}
                    style={{
                      backgroundColor: layer.id === activeLayerId ? 'var(--theme-accent)' : 'var(--theme-bg-panel)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      opacity: isDragging ? 0.5 : 1,
                      borderColor: isDragOver && !isDragging ? 'var(--theme-accent)' : '#000',
                      borderWidth: isDragOver && !isDragging ? '3px' : '2px',
                      transition: 'opacity 0.2s, border-color 0.2s',
                    }}
                    onClick={() => setActiveLayerId(layer.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={layer.name}
                        onChange={(e) => renameLayer(layer.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-transparent text-sm font-bold outline-none"
                        style={{ minWidth: 0 }}
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <GameButton
                          icon
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(layer.id);
                          }}
                          title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                          style={{ padding: '5px' }}
                        >
                          {layer.visible ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                        </GameButton>
                        <GameButton
                          icon
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLayer(layer.id);
                          }}
                          disabled={layers.length === 1}
                          title="Delete Layer"
                          style={{ padding: '5px' }}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </GameButton>
                      </div>
                    </div>
                    
                    <div className="text-[10px] opacity-70 mt-1">
                      {layer.mapData.size} tiles • Drag to reorder
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className="inline-grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            minWidth: GRID_SIZE * CELL_SIZE,
            minHeight: GRID_SIZE * CELL_SIZE,
            userSelect: 'none',
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

