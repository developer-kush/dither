import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useRouteCycling } from "../hooks/useRouteCycling";
import { GameButton } from "../components/GameButton";
import { NavBar } from "../components/NavBar";
import { GameMenu } from "../components/GameMenu";
import { GameSection } from "../components/GameSection";
import { Toast } from "../components/Toast";
import { TileItem } from "../components/TileItem";
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
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const newMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    if (animatedTiles) {
      setAnimatedTilesData(animatedTiles);
    }
  }, [animatedTiles]);

  // Save composite tiles to localStorage
  useEffect(() => {
    if (compositeTiles) {
    setCompositeTilesData(compositeTiles);
    }
  }, [compositeTiles]);

  // Save tool state to localStorage
  useEffect(() => {
    setToolStateData(toolState);
  }, [toolState]);

  // F key to toggle tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        setCurrentTool(prev => prev === 'animated' ? 'composite' : 'animated');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (newMenuTimeoutRef.current) {
        clearTimeout(newMenuTimeoutRef.current);
      }
    };
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
    const animatedTile = animatedTiles?.find(at => at.id === id);
    if (!animatedTile) return;
    
    const newTile = getTile(tileId);
    if (!newTile) {
      setToastMessage('Tile not found');
      return;
    }
    
    // Check if this is the first frame
    if (!animatedTile.frameIds || animatedTile.frameIds.length === 0) {
      // First frame - just add it
      setAnimatedTiles(prev => (prev || []).map(at => 
        at.id === id ? { ...at, frameIds: [tileId] } : at
      ));
      return;
    }
    
    // Get the first frame to check dimensions
    const firstFrame = getTile(animatedTile.frameIds[0]);
    if (!firstFrame) {
      setToastMessage('First frame not found');
      return;
    }
    
    // Extract dimensions from labels
    const getFirstDimsLabel = (labels?: string[]) => {
      if (!labels) return null;
      return labels.find(l => l.startsWith('dims:'));
    };
    
    const firstFrameDims = getFirstDimsLabel(firstFrame.labels);
    const newFrameDims = getFirstDimsLabel(newTile.labels);
    
    // Validate dimensions match
    if (firstFrameDims !== newFrameDims) {
      setToastMessage(`Frame dimensions must match! First frame is ${firstFrameDims || 'unknown'}, selected frame is ${newFrameDims || 'unknown'}`);
      return;
    }
    
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, frameIds: [...(at.frameIds || []), tileId] } : at
    ));
  };
  
  const removeFrameFromAnimatedTile = (id: string, index: number) => {
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id 
        ? { ...at, frameIds: (at.frameIds || []).filter((_, i) => i !== index) } 
        : at
    ));
  };
  
  const publishAnimatedTile = (id: string) => {
    const animatedTile = animatedTiles?.find(at => at.id === id);
    if (!animatedTile) return;
    
    // Create the published complex tile in the main tiles system
    saveTile(
      animatedTile.name,
      [[]], // Empty grid for complex tiles
      16,
      null,
      id,
      true, // isComplex
      animatedTile.frameIds,
      animatedTile.fps
    );
    
    // Mark as published in animated tiles list
    setAnimatedTiles(prev => (prev || []).map(at => 
      at.id === id ? { ...at, isPublished: true } : at
    ));
    
    // Publish the tile
    publishTile(id);
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

  // === SHARED FUNCTIONS ===
  
  const selectDraftTile = (tool: StudioTool, tileId: string) => {
    setToolState(prev => ({
      ...prev,
      [tool]: { currentTileId: tileId }
    }));
    
    if (tool === 'animated') {
      const tile = animatedTiles?.find(at => at.id === tileId);
      if (tile) setEditingName(tile.name);
    } else if (tool === 'composite') {
      const tile = compositeTiles?.find(ct => ct.id === tileId);
      if (tile) setEditingName(tile.name);
    }
  };

  // Helper function to convert AnimatedTile to Tile format for rendering
  const getAnimatedTileAsTile = (animatedTile: AnimatedTile): any => {
    if (!animatedTile.frameIds || animatedTile.frameIds.length === 0) {
      // Return empty tile if no frames
      return {
        id: animatedTile.id,
        name: animatedTile.name,
        grid: [[]],
        size: 16,
        isComplex: true,
        animationFrames: [],
        animationFps: animatedTile.fps,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        folderId: null
      };
    }
    
    return {
      id: animatedTile.id,
      name: animatedTile.name,
      grid: [[]], // Not used for animated tiles
      size: 16,
      isComplex: true,
      animationFrames: animatedTile.frameIds,
      animationFps: animatedTile.fps,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      folderId: null
    };
  };
  
  // Get current tile based on active tool
  const currentAnimatedTile = getCurrentAnimatedTile();
  const currentCompositeTile = getCurrentCompositeTile();

  // Available tiles for frame selection
  const allAvailableTiles = tiles.filter(t => !t.isComplex);
  const basicTiles = tiles.filter(t => !t.isComplex && !t.isPublished);
  const publishedAnimatedTiles = tiles.filter(t => t.isComplex && t.animationFrames && t.isPublished);
  
  // Handlers for New menu with delay
  const handleNewMenuEnter = () => {
    if (newMenuTimeoutRef.current) {
      clearTimeout(newMenuTimeoutRef.current);
      newMenuTimeoutRef.current = null;
    }
    setNewMenuOpen(true);
  };
  
  const handleNewMenuLeave = () => {
    newMenuTimeoutRef.current = setTimeout(() => {
      setNewMenuOpen(false);
    }, 200); // 200ms delay
  };

  // New button and dropdown menu for NavBar
  const rightActions = (
    <div 
      className="relative"
      onMouseEnter={handleNewMenuEnter}
      onMouseLeave={handleNewMenuLeave}
    >
      <GameButton>
        <PlusIcon className="w-5 h-5" />
        <span className="ml-2">New</span>
      </GameButton>
      
      {newMenuOpen && (
        <div 
          className="absolute right-0 top-full mt-2 border-2 border-black min-w-48 z-50"
          style={{ backgroundColor: 'var(--theme-bg-panel)', boxShadow: '4px 4px 0 #000' }}
          onMouseEnter={handleNewMenuEnter}
          onMouseLeave={handleNewMenuLeave}
        >
          <div
            className="p-3 cursor-pointer hover:bg-[var(--theme-bg-medium)] border-b border-black"
            onClick={() => {
              createNewAnimatedTile();
              setCurrentTool('animated');
              setNewMenuOpen(false);
            }}
          >
            <div className="font-bold">Animated</div>
            <div className="text-xs opacity-70">Frame-by-frame animation</div>
          </div>
          <div
            className="p-3 cursor-pointer hover:bg-[var(--theme-bg-medium)]"
            onClick={() => {
              createNewCompositeTile();
              setCurrentTool('composite');
              setNewMenuOpen(false);
            }}
          >
            <div className="font-bold">Composite</div>
            <div className="text-xs opacity-70">Multi-tile structure</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Tile Studio" rightActions={rightActions} />

      {/* Left Sliding Menu - Draft Tiles */}
      <GameMenu 
        side="left" 
        triggerIcon={<Squares2X2Icon className="w-6 h-6" />}
        onOpenChange={setTilesMenuOpen}
      >
        <GameSection title="Draft Tiles">
          <div className="mb-4">
            <div className="text-xs font-bold mb-2 opacity-70">ANIMATED TILES</div>
            {(!animatedTiles || animatedTiles.length === 0 || animatedTiles.filter(at => at.frameIds && at.frameIds.length > 0).length === 0) ? (
              <div className="text-sm opacity-60 text-center py-2">
                No animated tiles yet
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {animatedTiles.filter(at => at.frameIds && at.frameIds.length > 0).map(at => {
                  const tileData = getAnimatedTileAsTile(at);
                  return (
                    <TileItem
                      key={at.id}
                      tile={tileData}
                      size="small"
                      showName={true}
                      showTypeIcon={true}
                      showDelete={true}
                      selected={toolState.animated.currentTileId === at.id && currentTool === 'animated'}
                      onClick={() => selectDraftTile('animated', at.id)}
                      onDelete={() => deleteAnimatedTile(at.id)}
                      getTile={getTile}
                    />
                  );
                })}
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
              <div className="flex flex-col gap-3">
                {compositeTiles.map(ct => {
                  return (
                <div
                  key={ct.id}
                      className={`relative border-2 border-black cursor-pointer transition-all overflow-hidden ${
                        toolState.composite.currentTileId === ct.id && currentTool === 'composite' 
                          ? 'ring-4 ring-blue-500' 
                          : ''
                }`}
                style={{ 
                        width: '140px',
                        backgroundColor: '#c0c0c0',
                        boxShadow: '4px 4px 0 #000'
                      }}
                      onClick={() => selectDraftTile('composite', ct.id)}
                    >
                      <div className="border-b-2 border-black relative" style={{ height: '120px', backgroundColor: 'var(--theme-bg-medium)' }}>
                        <div className="w-full h-full flex items-center justify-center">
                          <Squares2X2Icon className="w-12 h-12 text-gray-400" />
                        </div>
                        
                        {/* Delete Button */}
                        <button
                  onClick={(e) => {
                    e.stopPropagation();
                      deleteCompositeTile(ct.id);
                  }}
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center border border-black hover:scale-110 transition-transform"
                          style={{ backgroundColor: '#ef4444' }}
                  title="Delete"
                >
                          <XMarkIcon className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <div className="grid grid-cols-2 gap-0.5 w-4 h-4 flex-shrink-0">
                          <div className="rounded-full bg-black"></div>
                          <div className="rounded-full bg-black"></div>
                          <div className="rounded-full bg-black"></div>
                          <div className="rounded-full bg-black"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{ct.name}</div>
                          <div className="text-xs opacity-70">{ct.tiles?.length || 0} tiles</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GameSection>
      </GameMenu>

      {/* Right Fixed Panel - Available Tiles (always open for animated tool) */}
      {currentTool === 'animated' && currentAnimatedTile && (
        <div 
          className="fixed top-16 right-0 bottom-0 border-l-2 border-black overflow-y-auto z-40"
          style={{ width: '520px', backgroundColor: 'var(--theme-bg-medium)', boxShadow: '-4px 0 0 #000' }}
        >
          <div className="p-4">
            <div className="border-2 border-black p-3" style={{ backgroundColor: 'var(--theme-bg-panel)', boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.2), inset -2px -2px 0 rgba(0,0,0,0.2)' }}>
              <div className="text-sm mb-2 px-1 font-bold">Available Tiles</div>
              
              {allAvailableTiles.length === 0 ? (
            <div className="text-sm opacity-60 text-center py-4">
                  <p>No tiles available</p>
                  <Link to="/tile-editor" className="underline">Create tiles in Tile Editor</Link>
            </div>
          ) : (
                <div className="space-y-4">
                  {basicTiles.length > 0 && (
                    <div>
                      <div className="text-xs font-bold mb-2 opacity-70">BASIC TILES</div>
            <div className="grid grid-cols-3 gap-3">
              {basicTiles.map(tile => (
                          <TileItem
                  key={tile.id}
                            tile={tile}
                            size="small"
                            showName={true}
                            showTypeIcon={false}
                            onClick={() => {
                              if (currentAnimatedTile) {
                                addFrameToAnimatedTile(currentAnimatedTile.id, tile.id);
                              }
                            }}
                            getTile={getTile}
                          />
                        ))}
                </div>
            </div>
          )}
                  
                  {publishedAnimatedTiles.length > 0 && (
                    <div>
                      <div className="text-xs font-bold mb-2 opacity-70">ANIMATED TILES</div>
                      <div className="grid grid-cols-3 gap-3">
                        {publishedAnimatedTiles.map(tile => (
                          <TileItem
                            key={tile.id}
                            tile={tile}
                            size="small"
                            showName={true}
                            showTypeIcon={true}
                            onClick={() => {
                              if (currentAnimatedTile) {
                                addFrameToAnimatedTile(currentAnimatedTile.id, tile.id);
                              }
                            }}
                            getTile={getTile}
                          />
                        ))}
                      </div>
                    </div>
                  )}
        </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Main Canvas Area with Properties Panel */}
      <div 
        className="w-full h-screen pt-16 flex flex-col transition-all"
        style={{ 
          marginRight: (currentTool === 'animated' && currentAnimatedTile) ? '520px' : '0'
        }}
      >
        {/* Center Content Area */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Left Properties Panel */}
          {currentAnimatedTile && currentTool === 'animated' && (
            <div className="absolute top-8 left-8 z-10 p-3 space-y-3 min-w-[240px] bg-[var(--theme-bg-medium)] border-2 border-black" style={{ boxShadow: '4px 4px 0 #000' }}>
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Tile Name</div>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => updateAnimatedTileName(currentAnimatedTile.id, editingName)}
                  className="w-full px-2 py-1 text-sm border-2 border-black bg-[var(--theme-bg-panel)] outline-none focus:outline-none"
                  style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)' }}
                  placeholder="Enter tile name"
                />
              </div>
              
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">FPS</div>
                <input
                  type="number"
                  value={currentAnimatedTile.fps}
                  onChange={(e) => updateAnimatedTileFPS(currentAnimatedTile.id, parseInt(e.target.value) || 1)}
                  min="1"
                  max="60"
                  className="w-full px-2 py-1 text-sm border-2 border-black bg-[var(--theme-bg-panel)] outline-none"
                  style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)' }}
                />
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-black/20">
                <button
                  onClick={() => {
                    if (!currentAnimatedTile.frameIds || currentAnimatedTile.frameIds.length === 0) {
                      setToastMessage('Cannot save: Add at least 1 frame!');
                      return;
                    }
                    setToastMessage('Saved to drafts!');
                  }}
                  className="flex-1 px-3 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ 
                    boxShadow: '2px 2px 0 #000',
                    opacity: (!currentAnimatedTile.frameIds || currentAnimatedTile.frameIds.length === 0) ? 0.5 : 1
                  }}
                  title="Save (Ctrl+S)"
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    Save
                  </div>
                </button>
                <button
                  onClick={() => {
                    // Create a duplicate animated tile
                    const newTile: AnimatedTile = {
                      id: `animated_${Date.now()}`,
                      name: `${currentAnimatedTile.name} Copy`,
                      frameIds: [...(currentAnimatedTile.frameIds || [])],
                      fps: currentAnimatedTile.fps,
                      isPublished: false
                    };
                    setAnimatedTiles(prev => [...(prev || []), newTile]);
                    setToolState(prev => ({
                      ...prev,
                      animated: { currentTileId: newTile.id }
                    }));
                    setEditingName(newTile.name);
                    setToastMessage('Created new tile from current!');
                  }}
                  className="flex-1 px-3 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                  title="New from current"
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    New
                  </div>
                </button>
              </div>
              
              <div className="pt-2 border-t border-black/20">
                <div className="text-[10px] opacity-60 uppercase tracking-wide mb-2">Publish to Tiles</div>
                
                <button
                  onClick={() => {
                    if (currentAnimatedTile.isPublished) {
                      // Unpublish
                      unpublishTile(currentAnimatedTile.id);
                      setAnimatedTiles(prev => (prev || []).map(at => 
                        at.id === currentAnimatedTile.id ? { ...at, isPublished: false } : at
                      ));
                      setToastMessage('Unpublished from Tiles!');
                    } else {
                      // Publish
                      if (!currentAnimatedTile.frameIds || currentAnimatedTile.frameIds.length === 0) {
                        setToastMessage('Cannot publish: Add at least 1 frame!');
                        return;
                      }
                      publishAnimatedTile(currentAnimatedTile.id);
                      setToastMessage('Published to Tiles!');
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs border-2 border-black transition-colors ${
                    currentAnimatedTile.isPublished
                      ? 'bg-green-200 hover:bg-red-200'
                      : 'bg-[var(--theme-bg-light)] hover:bg-green-200'
                  }`}
                  style={{ 
                    boxShadow: '2px 2px 0 #000',
                    opacity: (!currentAnimatedTile.isPublished && (!currentAnimatedTile.frameIds || currentAnimatedTile.frameIds.length === 0)) ? 0.5 : 1
                  }}
                  title={currentAnimatedTile.isPublished ? 'Click to unpublish' : 'Publish'}
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    {currentAnimatedTile.isPublished ? 'Published' : 'Publish'}
                </div>
                </button>
              </div>
              
              <div className="text-[10px] opacity-60 font-mono truncate pt-1 border-t border-black/20" title={currentAnimatedTile.id}>
                ID: {currentAnimatedTile.id.substring(currentAnimatedTile.id.lastIndexOf('_') + 1)}
              </div>
            </div>
          )}
          
          {/* Centered Preview */}
          {!currentAnimatedTile && !currentCompositeTile ? (
            <div className="text-center opacity-50">
              <div className="text-2xl mb-2">No tile selected</div>
              <div className="text-sm">Create or select a tile to begin</div>
            </div>
          ) : currentTool === 'animated' && currentAnimatedTile ? (
            !currentAnimatedTile.frameIds || currentAnimatedTile.frameIds.length === 0 ? (
              <div className="text-center opacity-50">
                <div className="text-xl mb-2">No frames yet</div>
                <div className="text-sm">Add frames from the right tiles menu</div>
              </div>
            ) : (
              <div className="border-2 border-black" style={{ width: '400px', height: '400px', backgroundColor: 'var(--theme-bg-light)', boxShadow: '8px 8px 0 #000' }}>
                <AnimatedTilePreview 
                  frameIds={currentAnimatedTile.frameIds} 
                  fps={currentAnimatedTile.fps || 10}
                  getTile={getTile}
                />
              </div>
            )
          ) : (
            <div className="text-center opacity-50">
              <div className="text-xl mb-2">Composite Tool</div>
              <div className="text-sm">Coming soon!</div>
            </div>
          )}
        </div>
        
        {/* Bottom Frames Strip */}
        {currentAnimatedTile && currentTool === 'animated' && (
          <div className="border-t-2 border-black px-6 py-3" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
            <div className="text-xs font-bold mb-2 opacity-60">FRAMES</div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {currentAnimatedTile.frameIds && currentAnimatedTile.frameIds.length > 0 ? (
                currentAnimatedTile.frameIds.map((frameId, index) => {
                  const tile = getTile(frameId);
                  if (!tile) return null;
                  
                  return (
                    <div key={index} className="relative flex-shrink-0">
                      <TileItem
                        tile={tile}
                        size="small"
                        showName={false}
                        showTypeIcon={true}
                        selected={selectedFrameIndex === index}
                        onClick={() => setSelectedFrameIndex(index)}
                        getTile={getTile}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFrameFromAnimatedTile(currentAnimatedTile.id, index);
                          if (selectedFrameIndex === index) setSelectedFrameIndex(null);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center border border-black hover:scale-110 transition-transform"
                        style={{ backgroundColor: '#ef4444' }}
                        title="Remove frame"
                      >
                        <XMarkIcon className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black text-white px-1 text-xs font-bold">
                        {index + 1}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm opacity-60 py-2">
                  No frames yet - add frames from the tiles menu on the right
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}
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
