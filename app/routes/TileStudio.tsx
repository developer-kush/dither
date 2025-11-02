import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useRouteCycling } from "../hooks/useRouteCycling";
import { GameButton } from "../components/GameButton";
import { NavBar } from "../components/NavBar";
import { GameMenu } from "../components/GameMenu";
import { GameSection } from "../components/GameSection";
import { 
  PlusIcon, 
  TrashIcon, 
  Squares2X2Icon,
  XMarkIcon,
  RectangleStackIcon,
  FilmIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

export function meta() {
  return [
    { title: "Tile Studio - Dither" },
    { name: "description", content: "Create animated and composite tiles" },
  ];
}

// Tool types in Tile Studio
type StudioTool = 'animated' | 'composite';

// Animated tile structure
interface AnimatedTile {
  id: string;
  name: string;
  frameIds: string[]; // IDs of tiles to use as frames
  fps: number; // Animation speed
  isPublished?: boolean;
}

// Composite tile structure - tiles positioned relative to a pivot
interface CompositeTile {
  id: string;
  name: string;
  tiles: {
    tileId: string;
    offsetX: number; // Grid position relative to pivot (0,0)
    offsetY: number; // Grid position relative to pivot (0,0)
    isPivot: boolean; // The central/origin tile
  }[];
  isPublished?: boolean;
}

// Tool state - remembers which tile was being worked on for each tool
interface ToolState {
  animated: {
    currentTileId: string | null;
  };
  composite: {
    currentTileId: string | null;
  };
}

export default function TileStudio() {
  const { tiles, getTile, saveTile, folders, publishTile, unpublishTile } = useTiles();
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();
  
  // Current tool
  const [currentTool, setCurrentTool] = useState<StudioTool>('animated');
  
  // Load animated tiles from localStorage
  const [animatedTilesData, setAnimatedTilesData] = useLocalStorage<AnimatedTile[]>('animated-tiles', []);
  const [animatedTiles, setAnimatedTiles] = useState<AnimatedTile[]>(animatedTilesData || []);
  
  // Load composite tiles from localStorage
  const [compositeTilesData, setCompositeTilesData] = useLocalStorage<CompositeTile[]>('composite-tiles', []);
  const [compositeTiles, setCompositeTiles] = useState<CompositeTile[]>(compositeTilesData || []);
  
  // Tool state persistence
  const [toolStateData, setToolStateData] = useLocalStorage<ToolState>('tile-studio-tool-state', {
    animated: { currentTileId: null },
    composite: { currentTileId: null }
  });
  const [toolState, setToolState] = useState<ToolState>(toolStateData);
  
  const [editingName, setEditingName] = useState("");
  const [tilesMenuOpen, setTilesMenuOpen] = useState(false);
  const [availableTilesMenuOpen, setAvailableTilesMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  
  // Animated tile specific state
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);

  // Set theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'yellow');
    return () => {
      document.documentElement.setAttribute('data-theme', 'green');
    };
  }, []);

  // Save animated tiles to localStorage
  useEffect(() => {
    setAnimatedTilesData(animatedTiles);
  }, [animatedTiles, setAnimatedTilesData]);

  // Save composite tiles to localStorage
  useEffect(() => {
    setCompositeTilesData(compositeTiles);
  }, [compositeTiles, setCompositeTilesData]);
  
  // Save tool state to localStorage
  useEffect(() => {
    setToolStateData(toolState);
  }, [toolState, setToolStateData]);
  
  // Keyboard shortcuts - F key to toggle tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Toggle tools with F key
      if (key === 'f') {
        e.preventDefault();
        setCurrentTool(prev => prev === 'animated' ? 'composite' : 'animated');
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // === ANIMATED TILE FUNCTIONS ===
  
  const getCurrentAnimatedTile = (): AnimatedTile | null => {
    const currentId = toolState.animated.currentTileId;
    if (!currentId || !animatedTiles) return null;
    return animatedTiles.find(t => t.id === currentId) || null;
  };
  
  const createNewAnimatedTile = () => {
    const newTile: AnimatedTile = {
      id: `animated_${Date.now()}`,
      name: `Animated Tile ${(animatedTiles?.length || 0) + 1}`,
      frameIds: [],
      fps: 10,
      isPublished: false
    };
    setAnimatedTiles(prev => [...(prev || []), newTile]);
    setToolState(prev => ({
      ...prev,
      animated: { currentTileId: newTile.id }
    }));
    setEditingName(newTile.name);
    setNewMenuOpen(false);
  };
  
  const deleteAnimatedTile = (id: string) => {
    if (window.confirm('Delete this animated tile?')) {
      setAnimatedTiles(prev => (prev || []).filter(t => t.id !== id));
      if (toolState.animated.currentTileId === id) {
        setToolState(prev => ({
          ...prev,
          animated: { currentTileId: null }
        }));
      }
    }
  };
  
  const updateAnimatedTileName = (id: string, name: string) => {
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, name } : at
    ));
  };
  
  const updateAnimatedTileFPS = (id: string, fps: number) => {
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, fps } : at
    ));
  };
  
  const addFrameToAnimatedTile = (id: string, tileId: string) => {
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, frameIds: [...(at.frameIds || []), tileId] } : at
    ));
  };
  
  const removeFrameFromAnimatedTile = (id: string, frameIndex: number) => {
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id 
        ? { ...at, frameIds: (at.frameIds || []).filter((_, i) => i !== frameIndex) }
        : at
    ));
  };
  
  const publishAnimatedTile = (id: string) => {
    const animatedTile = animatedTiles?.find(at => at.id === id);
    if (!animatedTile) return;
    
    // Save as complex tile in the tiles system
    saveTile(
      animatedTile.name,
      [[]], // Empty grid, not used for animated tiles
      16, // Default size
      null, // No folder
      id, // Use animated tile ID
      true, // isComplex
      animatedTile.frameIds || [],
      animatedTile.fps || 10
    );
    
    // Mark as published
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, isPublished: true } : at
    ));
  };

  // === COMPOSITE TILE FUNCTIONS ===
  
  const getCurrentCompositeTile = (): CompositeTile | null => {
    const currentId = toolState.composite.currentTileId;
    if (!currentId || !compositeTiles) return null;
    return compositeTiles.find(t => t.id === currentId) || null;
  };
  
  const createNewCompositeTile = () => {
    const newTile: CompositeTile = {
      id: `composite_${Date.now()}`,
      name: `Composite Tile ${(compositeTiles?.length || 0) + 1}`,
      tiles: [],
      isPublished: false
    };
    setCompositeTiles(prev => [...(prev || []), newTile]);
    setToolState(prev => ({
      ...prev,
      composite: { currentTileId: newTile.id }
    }));
    setEditingName(newTile.name);
    setNewMenuOpen(false);
  };

  const deleteCompositeTile = (id: string) => {
    if (window.confirm('Delete this composite tile?')) {
      setCompositeTiles(prev => (prev || []).filter(t => t.id !== id));
      if (toolState.composite.currentTileId === id) {
        setToolState(prev => ({
          ...prev,
          composite: { currentTileId: null }
        }));
      }
    }
  };

  const updateCompositeTileName = (id: string, name: string) => {
    setCompositeTiles(prev => (prev || []).map(ct => 
      ct.id === id ? { ...ct, name } : ct
    ));
  };


  // Get the basic tiles (non-complex) for the frame selector
  const basicTiles = tiles.filter(t => !t.isComplex);
  
  // Get current tile based on active tool
  const currentAnimatedTile = getCurrentAnimatedTile();
  const currentCompositeTile = getCurrentCompositeTile();
  
  // Select a draft tile from the menu
  const selectDraftTile = (type: 'animated' | 'composite', id: string) => {
    if (type === 'animated') {
      setToolState(prev => ({
        ...prev,
        animated: { currentTileId: id }
      }));
      const tile = animatedTiles?.find(t => t.id === id);
      if (tile) setEditingName(tile.name);
    } else {
      setToolState(prev => ({
        ...prev,
        composite: { currentTileId: id }
      }));
      const tile = compositeTiles?.find(t => t.id === id);
      if (tile) setEditingName(tile.name);
    }
    setTilesMenuOpen(false);
  };

  // Render function for animated tile tool
  const renderAnimatedTool = () => {
    const currentTile = currentAnimatedTile;
    
    if (!currentTile) {
      return (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="text-2xl opacity-60 mb-4">Create a new animated tile to begin</div>
            <p className="text-sm opacity-50 max-w-md mx-auto">
              Animated tiles let you create frame-by-frame animations from existing tiles. 
              Click the "+" button in the top right to get started.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Icon and Properties */}
        <div className="w-80 border-r-2 border-black flex flex-col" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
          <div className="p-4 border-b-2 border-black">
            <div className="font-bold text-lg mb-4">ICON AND NAME</div>
            
            {/* Icon Preview */}
            <div className="border-2 border-black mb-4 p-4" style={{ backgroundColor: 'var(--theme-bg-medium)' }}>
              <div className="w-32 h-32 border-2 border-black mx-auto" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
                {currentTile.frameIds && currentTile.frameIds.length > 0 && getTile(currentTile.frameIds[0]) && (
                  <canvas
                    ref={(canvas) => {
                      if (!canvas) return;
                      const tile = getTile(currentTile.frameIds[0]);
                      if (!tile) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;

                      canvas.width = tile.size;
                      canvas.height = tile.size;

                      for (let y = 0; y < tile.size; y++) {
                        for (let x = 0; x < tile.size; x++) {
                          const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
                          ctx.fillStyle = color;
                          ctx.fillRect(x, y, 1, 1);
                        }
                      }
                    }}
                    className="w-full h-full"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>
            </div>
            
            {/* Properties */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold mb-1 block">NAME</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => updateAnimatedTileName(currentTile.id, editingName)}
                  className="w-full p-2 border-2 border-black text-sm"
                  style={{ backgroundColor: 'var(--theme-bg-light)' }}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold mb-1 block">ID</label>
                <input
                  type="text"
                  value={currentTile.id}
                  disabled
                  className="w-full p-2 border-2 border-black text-sm opacity-50"
                  style={{ backgroundColor: 'var(--theme-bg-medium)' }}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold mb-1 block">FPS</label>
                <input
                  type="number"
                  value={currentTile.fps}
                  onChange={(e) => updateAnimatedTileFPS(currentTile.id, parseInt(e.target.value) || 1)}
                  min="1"
                  max="60"
                  className="w-full p-2 border-2 border-black text-sm"
                  style={{ backgroundColor: 'var(--theme-bg-light)' }}
                />
              </div>
              
              <GameButton 
                onClick={() => publishAnimatedTile(currentTile.id)}
                className="w-full"
              >
                {currentTile.isPublished ? 'UPDATE' : 'PUBLISH'}
              </GameButton>
              
              {currentTile.isPublished && (
                <div className="text-xs text-center p-2 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)' }}>
                  Published to Tiles
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Center Panel - Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: 'var(--theme-bg-medium)' }}>
            <div className="border-4 border-black p-8" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
              {!currentTile.frameIds || currentTile.frameIds.length === 0 ? (
                <div className="w-64 h-64 flex items-center justify-center text-center opacity-50">
                  Add frames below to see preview
                </div>
              ) : (
                <div className="w-64 h-64 border-2 border-black">
                  <AnimatedTilePreview 
                    frameIds={currentTile.frameIds} 
                    fps={currentTile.fps || 10}
                    getTile={getTile}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom Panel - Frames */}
          <div className="h-48 border-t-2 border-black p-4" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
            <div className="font-bold mb-2">FRAMES ({currentTile.frameIds?.length || 0})</div>
            <div className="flex gap-2 overflow-x-auto">
              {(currentTile.frameIds || []).map((frameId, index) => {
                const tile = getTile(frameId);
                if (!tile) return null;
                
                return (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 border-2 border-black cursor-pointer ${
                      selectedFrameIndex === index ? 'ring-4 ring-blue-500' : ''
                    }`}
                    style={{ 
                      width: '100px',
                      height: '100px',
                      backgroundColor: 'var(--theme-bg-light)'
                    }}
                    onClick={() => setSelectedFrameIndex(index)}
                  >
                    <canvas
                      ref={(canvas) => {
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        canvas.width = tile.size;
                        canvas.height = tile.size;

                        for (let y = 0; y < tile.size; y++) {
                          for (let x = 0; x < tile.size; x++) {
                            const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
                            ctx.fillStyle = color;
                            ctx.fillRect(x, y, 1, 1);
                          }
                        }
                      }}
                      className="w-full h-full"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <GameButton
                      icon
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFrameFromAnimatedTile(currentTile.id, index);
                        if (selectedFrameIndex === index) setSelectedFrameIndex(null);
                      }}
                      className="absolute top-1 right-1"
                      style={{ padding: '4px' }}
                      title="Remove frame"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </GameButton>
                    <div className="absolute bottom-0 left-0 right-0 text-center text-xs bg-black text-white opacity-75">
                      Frame {index + 1}
                    </div>
                  </div>
                );
              })}
              
              {/* Add Frame Button */}
              <div
                className="flex-shrink-0 border-2 border-dashed border-black flex items-center justify-center cursor-pointer hover:bg-[var(--theme-bg-medium)] transition-colors"
                style={{ 
                  width: '100px',
                  height: '100px',
                  backgroundColor: 'transparent'
                }}
                onClick={() => setAvailableTilesMenuOpen(true)}
                title="Add frame"
              >
                <PlusIcon className="w-8 h-8 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render function for composite tile tool (placeholder)
  const renderCompositeTool = () => {
    return (
      <div className="flex-1 flex items-center justify-center text-center">
        <div>
          <div className="text-2xl opacity-60 mb-4">Composite Tool</div>
          <p className="text-sm opacity-50 max-w-md mx-auto">
            Coming soon! This tool will let you create multi-tile structures.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Tile Studio" />

      {/* Left Sliding Menu - Draft Tiles */}
      <GameMenu 
        side="left" 
        triggerIcon={<Squares2X2Icon className="w-6 h-6" />}
        onOpenChange={setTilesMenuOpen}
      >
        <GameSection title="Draft Tiles">
          <div className="mb-4">
            <div className="text-xs font-bold mb-2 opacity-70">ANIMATED TILES</div>
            {(!animatedTiles || animatedTiles.length === 0) ? (
              <div className="text-sm opacity-60 text-center py-2">
                No animated tiles yet
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {animatedTiles.map(at => (
                  <div
                    key={at.id}
                    className={`border-2 border-black p-2 cursor-pointer transition-all ${
                      toolState.animated.currentTileId === at.id && currentTool === 'animated' 
                        ? 'ring-4 ring-blue-500' 
                        : ''
                    }`}
                    style={{ 
                      backgroundColor: 'var(--theme-bg-light)',
                      boxShadow: '2px 2px 0 #000'
                    }}
                    onClick={() => selectDraftTile('animated', at.id)}
                  >
                    <div className="font-bold text-sm mb-1 truncate">{at.name}</div>
                    <div className="text-xs opacity-70">{at.frameIds?.length || 0} frames</div>
                    <GameButton
                      icon
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnimatedTile(at.id);
                      }}
                      style={{ padding: '4px', marginTop: '8px' }}
                      title="Delete"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </GameButton>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <div className="text-xs font-bold mb-2 opacity-70">COMPOSITE TILES</div>
            {(!compositeTiles || compositeTiles.length === 0) ? (
              <div className="text-sm opacity-60 text-center py-2">
                No composite tiles yet
          </div>
        ) : (
          <div className="flex flex-col gap-2">
              {compositeTiles.map(ct => (
                <div
                  key={ct.id}
                    className={`border-2 border-black p-2 cursor-pointer transition-all ${
                      toolState.composite.currentTileId === ct.id && currentTool === 'composite' 
                        ? 'ring-4 ring-blue-500' 
                        : ''
                }`}
                style={{ 
                    backgroundColor: 'var(--theme-bg-light)',
                  boxShadow: '2px 2px 0 #000'
                }}
                    onClick={() => selectDraftTile('composite', ct.id)}
                >
                    <div className="font-bold text-sm mb-1 truncate">{ct.name}</div>
                  <div className="text-xs opacity-70">{ct.tiles?.length || 0} tiles</div>
                <GameButton
                  icon
                  onClick={(e) => {
                    e.stopPropagation();
                      deleteCompositeTile(ct.id);
                  }}
                  style={{ padding: '4px', marginTop: '8px' }}
                  title="Delete"
                >
                  <TrashIcon className="w-3 h-3" />
                </GameButton>
              </div>
            ))}
          </div>
        )}
          </div>
        </GameSection>
      </GameMenu>

      {/* Right Sliding Menu - Available Tiles for Frame Selection */}
      <GameMenu 
        side="right" 
        triggerIcon={<RectangleStackIcon className="w-6 h-6" />}
        onOpenChange={setAvailableTilesMenuOpen}
      >
        <GameSection title="Available Tiles">
          {basicTiles.length === 0 ? (
            <div className="text-sm opacity-60 text-center py-4">
              <p>No basic tiles available</p>
              <Link to="/tile-editor" className="underline">Create tiles in Tile Editor</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {basicTiles.map(tile => (
                <div
                  key={tile.id}
                  className="border-2 border-black cursor-pointer p-2 transition-all hover:scale-105"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-light)',
                    boxShadow: '2px 2px 0 #000'
                  }}
                  onClick={() => {
                    if (currentAnimatedTile) {
                      addFrameToAnimatedTile(currentAnimatedTile.id, tile.id);
                      setAvailableTilesMenuOpen(false);
                    }
                  }}
                  title={tile.name}
                >
                  <canvas
                    ref={(canvas) => {
                      if (!canvas) return;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) return;

                      canvas.width = tile.size;
                      canvas.height = tile.size;

                      for (let y = 0; y < tile.size; y++) {
                        for (let x = 0; x < tile.size; x++) {
                          const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
                          ctx.fillStyle = color;
                          ctx.fillRect(x, y, 1, 1);
                        }
                      }
                    }}
                    style={{ 
                      imageRendering: 'pixelated',
                      width: '100%',
                      height: 'auto'
                    }}
                  />
                  <div className="text-xs mt-1 text-center font-bold truncate">{tile.name}</div>
                </div>
              ))}
            </div>
          )}
        </GameSection>
      </GameMenu>

      {/* Main Content */}
      <div className="flex-1 mt-16 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="px-8 py-3 border-b-2 border-black flex items-center justify-between" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm opacity-70">TOOL:</span>
            <div className="flex gap-2">
              <GameButton
                onClick={() => setCurrentTool('animated')}
                className={currentTool === 'animated' ? 'ring-2 ring-blue-500' : ''}
              >
                <FilmIcon className="w-4 h-4" />
                <span className="ml-1">Animated</span>
              </GameButton>
              <GameButton
                onClick={() => setCurrentTool('composite')}
                className={currentTool === 'composite' ? 'ring-2 ring-blue-500' : ''}
              >
                <Squares2X2Icon className="w-4 h-4" />
                <span className="ml-1">Composite</span>
          </GameButton>
            </div>
            <span className="text-xs opacity-50">(Press F to toggle)</span>
          </div>
          
          <div className="relative">
            <GameButton onClick={() => setNewMenuOpen(!newMenuOpen)}>
              <PlusIcon className="w-5 h-5" />
              <span className="ml-2">New</span>
              <ChevronDownIcon className="w-4 h-4 ml-1" />
            </GameButton>
            
            {newMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 border-2 border-black min-w-48 z-50"
                style={{ backgroundColor: 'var(--theme-bg-panel)', boxShadow: '4px 4px 0 #000' }}
              >
                <div
                  className="p-3 cursor-pointer hover:bg-[var(--theme-bg-medium)] border-b border-black"
                  onClick={createNewAnimatedTile}
                >
                  <div className="font-bold">Animated</div>
                  <div className="text-xs opacity-70">Frame-by-frame animation</div>
              </div>
                <div
                  className="p-3 cursor-pointer hover:bg-[var(--theme-bg-medium)]"
                  onClick={createNewCompositeTile}
                >
                  <div className="font-bold">Composite</div>
                  <div className="text-xs opacity-70">Multi-tile structure</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tool Content */}
        {currentTool === 'animated' ? renderAnimatedTool() : renderCompositeTool()}
      </div>
    </div>
  );
}

// Animated tile preview component
function AnimatedTilePreview({ 
  frameIds, 
  fps, 
  getTile 
}: { 
  frameIds: string[]; 
  fps: number; 
  getTile: (id: string) => any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  
  useEffect(() => {
    if (!frameIds || frameIds.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % frameIds.length);
    }, 1000 / fps);
    
    return () => clearInterval(interval);
  }, [frameIds, fps]);
  
  useEffect(() => {
    if (!canvasRef.current || !frameIds || frameIds.length === 0) return;
    
    const canvas = canvasRef.current;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
    
    const tile = getTile(frameIds[currentFrameIndex]);
    if (!tile) return;

                            canvas.width = tile.size;
                            canvas.height = tile.size;

                            for (let y = 0; y < tile.size; y++) {
                              for (let x = 0; x < tile.size; x++) {
                                const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
                                ctx.fillStyle = color;
                                ctx.fillRect(x, y, 1, 1);
                              }
                            }
  }, [currentFrameIndex, frameIds, getTile]);
  
  return (
    <canvas
      ref={canvasRef}
                            className="w-full h-full"
                            style={{ imageRendering: 'pixelated' }}
                          />
  );
}

