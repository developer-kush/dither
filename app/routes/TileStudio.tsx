import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useDebouncedLocalStorage, useLocalStorageLoad } from "../hooks/useDebouncedLocalStorage";
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
    { title: "Studio - Dither" },
    { name: "description", content: "Create animated and composite tiles" },
  ];
}

// Tool types in Studio
type StudioTool = 'animated' | 'composite';

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
  const { tiles, getTile, saveTile, deleteTile, renameTile, folders, publishTile, unpublishTile, addLabelToTile, setTileLabels } = useTiles();
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();
  
  // Current tool
  const [currentTool, setCurrentTool] = useState<StudioTool>('animated');
  
  // Filter tiles for studio (all complex tiles, published or unpublished)
  const animatedTiles = tiles.filter(t => 
    t.isComplex && 
    t.labels?.includes('subtype:animated')
  );
  
  const compositeTiles = tiles.filter(t => 
    t.isComplex && 
    t.labels?.includes('subtype:composite')
  );
  
  // Tool state persistence - load once on mount, save with debounce
  const initialToolState = useLocalStorageLoad<ToolState>('tile-studio-tool-state', {
    animated: { currentTileId: null },
    composite: { currentTileId: null }
  });
  const [toolState, setToolState] = useState<ToolState>(initialToolState);
  
  // Debounced save to localStorage (only saves after 300ms of inactivity)
  useDebouncedLocalStorage('tile-studio-tool-state', toolState, 300);
  
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
  
  const getCurrentAnimatedTile = () => {
    const currentId = toolState.animated.currentTileId;
    if (!currentId) return null;
    return getTile(currentId) || null;
  };
  
  const createNewAnimatedTile = () => {
    const tileId = `animated_${Date.now()}`;
    const tileName = `Animated Tile ${animatedTiles.length + 1}`;
    
    // Create a new animated tile in the main tiles system
    saveTile(
      tileName,
      [[]], // Empty grid for complex tiles
      16, // Default size
      null, // No folder
      tileId,
      true, // isComplex
      [], // Empty animationFrames initially
      10 // Default FPS
    );
    
    // Add system labels
    setTileLabels(tileId, ['subtype:animated', 'dims:1x1']);
    
    setToolState(prev => ({
      ...prev,
      animated: { currentTileId: tileId }
    }));
    setEditingName(tileName);
    setNewMenuOpen(false);
  };
  
  const deleteAnimatedTile = (id: string) => {
    if (window.confirm('Delete this animated tile?')) {
      deleteTile(id);
      if (toolState.animated.currentTileId === id) {
        setToolState(prev => ({
          ...prev,
          animated: { currentTileId: null }
        }));
      }
    }
  };
  
  const updateAnimatedTileName = (id: string, name: string) => {
    renameTile(id, name);
  };
  
  const updateAnimatedTileFPS = (id: string, fps: number) => {
    const tile = getTile(id);
    if (!tile) return;
    // Update tile with new FPS
    saveTile(
      tile.name,
      tile.grid,
      tile.size,
      tile.folderId,
      id,
      true,
      tile.animationFrames,
      fps
    );
  };
  
  const addFrameToAnimatedTile = (id: string, newTileId: string) => {
    const animatedTile = getTile(id);
    if (!animatedTile) return;
    
    const newTile = getTile(newTileId);
    if (!newTile) {
      setToastMessage('Tile not found');
      return;
    }
    
    const currentFrames = animatedTile.animationFrames || [];
    
    // Validate dimensions if there are existing frames
    if (currentFrames.length > 0) {
      const firstFrame = getTile(currentFrames[0]);
      if (firstFrame) {
        const getFirstDimsLabel = (labels?: string[]) => {
          if (!labels) return null;
          return labels.find(l => l.startsWith('dims:'));
        };
        
        const firstFrameDims = getFirstDimsLabel(firstFrame.labels);
        const newFrameDims = getFirstDimsLabel(newTile.labels);
        
        if (firstFrameDims !== newFrameDims) {
          setToastMessage(`Frame dimensions must match! First frame is ${firstFrameDims || 'unknown'}, selected frame is ${newFrameDims || 'unknown'}`);
          return;
        }
      }
    }
    
    // Add the new frame
    saveTile(
      animatedTile.name,
      animatedTile.grid,
      animatedTile.size,
      animatedTile.folderId,
      id,
      true,
      [...currentFrames, newTileId],
      animatedTile.animationFps
    );
  };
  
  const removeFrameFromAnimatedTile = (id: string, frameIndex: number) => {
    const animatedTile = getTile(id);
    if (!animatedTile) return;
    
    const currentFrames = animatedTile.animationFrames || [];
    
    // Prevent deleting the last frame - an animated tile needs at least 1 frame
    if (currentFrames.length <= 1) {
      setToastMessage('Cannot remove the last frame! Delete the tile instead.');
      return;
    }
    
    const newFrames = currentFrames.filter((_, i) => i !== frameIndex);
    
    saveTile(
      animatedTile.name,
      animatedTile.grid,
      animatedTile.size,
      animatedTile.folderId,
      id,
      true,
      newFrames,
      animatedTile.animationFps
    );
    
    // Reset selection when removing a frame
    setSelectedFrameIndex(null);
  };
  
  const publishAnimatedTile = (id: string) => {
    // Just publish the tile - it's already in the main tiles system
    publishTile(id);
  };

  // === COMPOSITE TILE FUNCTIONS ===
  
  const getCurrentCompositeTile = () => {
    const currentId = toolState.composite.currentTileId;
    if (!currentId) return null;
    return getTile(currentId) || null;
  };
  
  const createNewCompositeTile = () => {
    const tileId = `composite_${Date.now()}`;
    const tileName = `Composite Tile ${compositeTiles.length + 1}`;
    
    // Create a new composite tile in the main tiles system
    saveTile(
      tileName,
      [[]], // Empty grid for complex tiles
      16, // Default size
      null, // No folder
      tileId,
      true, // isComplex
      [], // Empty animation frames (composite tiles don't animate)
      undefined // No FPS for composite
    );
    
    // Add system labels
    setTileLabels(tileId, ['subtype:composite']);
    
    setToolState(prev => ({
      ...prev,
      composite: { currentTileId: tileId }
    }));
    setEditingName(tileName);
    setNewMenuOpen(false);
  };

  const deleteCompositeTile = (id: string) => {
    if (window.confirm('Delete this composite tile?')) {
      deleteTile(id);
      if (toolState.composite.currentTileId === id) {
        setToolState(prev => ({
          ...prev,
          composite: { currentTileId: null }
        }));
      }
    }
  };

  const updateCompositeTileName = (id: string, name: string) => {
    renameTile(id, name);
  };

  // === SHARED FUNCTIONS ===
  
  const selectDraftTile = (tool: StudioTool, tileId: string) => {
    // Switch to the appropriate tool
    setCurrentTool(tool);
    
    setToolState(prev => ({
      ...prev,
      [tool]: { currentTileId: tileId }
    }));
    
    const tile = getTile(tileId);
    if (tile) setEditingName(tile.name);
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
      <NavBar title="Studio" rightActions={rightActions} />

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
              <div className="grid grid-cols-2 gap-3 pr-2 pb-2">
                {animatedTiles.map(at => (
                    <TileItem
                      key={at.id}
                      tile={at}
                      size="small"
                      showName={true}
                      showTypeIcon={true}
                      showDelete={true}
                      selected={toolState.animated.currentTileId === at.id && currentTool === 'animated'}
                      onClick={() => selectDraftTile('animated', at.id)}
                      onDelete={() => deleteAnimatedTile(at.id)}
                      getTile={getTile}
                    />
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
              <div className="grid grid-cols-2 gap-3 pr-2 pb-2">
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
                          className="absolute w-6 h-6 flex items-center justify-center border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all active:translate-x-[2px] active:translate-y-[2px]"
                          style={{ 
                            backgroundColor: '#ef4444',
                            boxShadow: '2px 2px 0 #000',
                            top: '-3px',
                            right: '-3px'
                          }}
                  title="Delete"
                >
                          <XMarkIcon className="w-4 h-4 text-white" />
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
                          <div className="text-xs opacity-70">Composite</div>
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
                  <Link to="/canvas" className="underline">Create tiles in Canvas</Link>
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
        className="h-screen pt-16 flex flex-col transition-all"
        style={{ 
          width: (currentTool === 'animated' && currentAnimatedTile) ? 'calc(100% - 520px)' : '100%'
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
                  value={currentAnimatedTile.animationFps}
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
                    setToastMessage('Auto-saved to drafts!');
                  }}
                  className="flex-1 px-3 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ 
                    boxShadow: '2px 2px 0 #000',
                    opacity: (!currentAnimatedTile.animationFrames || currentAnimatedTile.animationFrames.length === 0) ? 0.5 : 1
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
                    const newTileId = `animated_${Date.now()}`;
                    const newTileName = `${currentAnimatedTile.name} Copy`;
                    
                    saveTile(
                      newTileName,
                      currentAnimatedTile.grid,
                      currentAnimatedTile.size,
                      null,
                      newTileId,
                      true,
                      currentAnimatedTile.animationFrames || [],
                      currentAnimatedTile.animationFps
                    );
                    
                    // Copy labels
                    if (currentAnimatedTile.labels) {
                      setTileLabels(newTileId, currentAnimatedTile.labels);
                    }
                    
                    setToolState(prev => ({
                      ...prev,
                      animated: { currentTileId: newTileId }
                    }));
                    setEditingName(newTileName);
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
                      setToastMessage('Unpublished from Tiles!');
                    } else {
                      // Publish
                      if (!currentAnimatedTile.animationFrames || currentAnimatedTile.animationFrames.length === 0) {
                        setToastMessage('Cannot publish: Add at least 1 frame!');
                        return;
                      }
                      publishAnimatedTile(currentAnimatedTile.id);
                      setToastMessage('Published to Tiles!');
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs border-2 border-black transition-colors ${
                    currentAnimatedTile.isPublished
                      ? 'bg-red-200 hover:bg-red-300'
                      : 'bg-[var(--theme-bg-light)] hover:bg-green-200'
                  }`}
                  style={{ 
                    boxShadow: '2px 2px 0 #000',
                    opacity: (!currentAnimatedTile.isPublished && (!currentAnimatedTile.animationFrames || currentAnimatedTile.animationFrames.length === 0)) ? 0.5 : 1
                  }}
                  title={currentAnimatedTile.isPublished ? 'Click to unpublish' : 'Publish'}
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    {currentAnimatedTile.isPublished ? 'Unpublish' : 'Publish'}
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
            !currentAnimatedTile.animationFrames || currentAnimatedTile.animationFrames.length === 0 ? (
              <div className="text-center opacity-50">
                <div className="text-xl mb-2">No frames yet</div>
                <div className="text-sm">Add frames from the right tiles menu</div>
              </div>
            ) : (
              <div className="border-2 border-black" style={{ width: '400px', height: '400px', backgroundColor: 'var(--theme-bg-light)', boxShadow: '8px 8px 0 #000' }}>
                <AnimatedTilePreview 
                  frameIds={currentAnimatedTile.animationFrames} 
                  fps={currentAnimatedTile.animationFps || 10}
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
          <div className="px-8 py-5 border-t-2 border-black" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
            <div className="mb-4">
              <span 
                className="inline-block px-3 py-1 text-xs font-bold border-2 border-black"
                style={{ 
                  backgroundColor: 'var(--theme-bg-medium)',
                  boxShadow: '2px 2px 0 #000'
                }}
              >
                FRAMES
              </span>
            </div>
            <div 
              className="flex gap-4 overflow-x-auto overflow-y-visible pb-2 pt-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--theme-bg-medium) transparent',
                height: '160px'
              }}
            >
              {currentAnimatedTile.animationFrames && currentAnimatedTile.animationFrames.length > 0 ? (
                currentAnimatedTile.animationFrames.map((tileId, index) => {
                  const tile = getTile(tileId);
                    if (!tile) return null;

                    return (
                    <div key={`${tileId}-${index}`} className="relative flex-shrink-0 p-1">
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
                        }}
                        disabled={currentAnimatedTile.animationFrames.length <= 1}
                        className="absolute w-6 h-6 flex items-center justify-center border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all active:translate-x-[2px] active:translate-y-[2px] z-10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                        style={{ 
                          backgroundColor: '#ef4444',
                          boxShadow: '2px 2px 0 #000',
                          top: '-2px',
                          right: '-2px'
                        }}
                        title={currentAnimatedTile.animationFrames.length <= 1 ? "Cannot remove the last frame" : "Remove frame"}
                      >
                        <XMarkIcon className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black text-white px-1 text-xs font-bold z-10">
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
