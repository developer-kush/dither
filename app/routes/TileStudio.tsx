import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useRouteCycling } from "../hooks/useRouteCycling";
import { GameButton } from "../components/GameButton";
import { NavBar } from "../components/NavBar";
import GameMenu from "../components/GameMenu";
import GameSection from "../components/GameSection";
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  Squares2X2Icon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export function meta() {
  return [
    { title: "Tile Studio - Dither" },
    { name: "description", content: "Create complex animated tiles from multiple frames" },
  ];
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
}

// Legacy animation support (will be moved to a separate tool later)
interface AnimatedTile {
  id: string;
  name: string;
  frames: string[]; // Array of tile IDs
  fps: number; // Frames per second
}

export default function TileStudio() {
  const { tiles, getTile, saveTile, folders, publishTile, unpublishTile } = useTiles();
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();
  
  // Load composite tiles from localStorage
  const [compositeTilesData, setCompositeTilesData] = useLocalStorage<CompositeTile[]>('composite-tiles', []);
  const [compositeTiles, setCompositeTiles] = useState<CompositeTile[]>(compositeTilesData);
  const [selectedCompositeTile, setSelectedCompositeTile] = useState<CompositeTile | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showTileSelector, setShowTileSelector] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{x: number, y: number} | null>(null);
  const [tilesMenuOpen, setTilesMenuOpen] = useState(false);
  
  // Legacy animation tiles (kept for backward compatibility)
  const [animatedTilesData, setAnimatedTilesData] = useLocalStorage<AnimatedTile[]>('animated-tiles', []);
  const [animatedTiles, setAnimatedTiles] = useState<AnimatedTile[]>(animatedTilesData);

  // Set theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'yellow');
    return () => {
      document.documentElement.setAttribute('data-theme', 'green');
    };
  }, []);

  // Save composite tiles to localStorage
  useEffect(() => {
    setCompositeTilesData(compositeTiles);
  }, [compositeTiles, setCompositeTilesData]);

  // Save animated tiles to localStorage
  useEffect(() => {
    setAnimatedTilesData(animatedTiles);
  }, [animatedTiles, setAnimatedTilesData]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !selectedAnimatedTile || selectedAnimatedTile.frames.length === 0) {
      return;
    }

    const animate = (timestamp: number) => {
      const frameDuration = 1000 / (selectedAnimatedTile.fps || 8);
      
      if (timestamp - lastFrameTimeRef.current >= frameDuration) {
        setCurrentFrameIndex(prev => (prev + 1) % selectedAnimatedTile.frames.length);
        lastFrameTimeRef.current = timestamp;
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, selectedAnimatedTile]);

  // Draw current frame to canvas
  useEffect(() => {
    if (!selectedAnimatedTile || !previewCanvasRef.current) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameId = selectedAnimatedTile.frames[currentFrameIndex];
    if (!frameId) return;

    const tile = getTile(frameId);
    if (!tile) return;

    canvas.width = tile.size;
    canvas.height = tile.size;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw tile
    for (let y = 0; y < tile.size; y++) {
      for (let x = 0; x < tile.size; x++) {
        const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [selectedAnimatedTile, currentFrameIndex, getTile]);

  // === COMPOSITE TILE FUNCTIONS ===
  
  const createNewCompositeTile = () => {
    const newTile: CompositeTile = {
      id: `composite_${Date.now()}`,
      name: `Composite Tile ${compositeTiles.length + 1}`,
      tiles: []
    };
    setCompositeTiles(prev => [...prev, newTile]);
    setSelectedCompositeTile(newTile);
    setEditingName(newTile.name);
  };

  const deleteCompositeTile = (id: string) => {
    if (window.confirm('Delete this composite tile?')) {
      setCompositeTiles(prev => prev.filter(t => t.id !== id));
      if (selectedCompositeTile?.id === id) {
        setSelectedCompositeTile(null);
      }
    }
  };

  const updateCompositeTileName = (id: string, name: string) => {
    setCompositeTiles(prev => prev.map(ct => 
      ct.id === id ? { ...ct, name } : ct
    ));
    if (selectedCompositeTile?.id === id) {
      setSelectedCompositeTile(prev => prev ? { ...prev, name } : null);
    }
  };

  const addTileToComposite = (tileId: string, offsetX: number, offsetY: number, isPivot: boolean = false) => {
    if (!selectedCompositeTile) return;

    const newTileEntry = { tileId, offsetX, offsetY, isPivot };
    
    setCompositeTiles(prev => prev.map(ct => 
      ct.id === selectedCompositeTile.id 
        ? { ...ct, tiles: [...ct.tiles, newTileEntry] }
        : ct
    ));
    
    setSelectedCompositeTile(prev => 
      prev ? { ...prev, tiles: [...prev.tiles, newTileEntry] } : null
    );
  };

  const removeTileFromComposite = (offsetX: number, offsetY: number) => {
    if (!selectedCompositeTile) return;

    const newTiles = selectedCompositeTile.tiles.filter(
      t => !(t.offsetX === offsetX && t.offsetY === offsetY)
    );
    
    setCompositeTiles(prev => prev.map(ct => 
      ct.id === selectedCompositeTile.id 
        ? { ...ct, tiles: newTiles }
        : ct
    ));
    
    setSelectedCompositeTile(prev => 
      prev ? { ...prev, tiles: newTiles } : null
    );
  };

  const handleAddTileClick = (x: number, y: number) => {
    setPendingPosition({ x, y });
    setShowTileSelector(true);
  };

  const handleTileSelected = (tileId: string) => {
    if (pendingPosition && selectedCompositeTile) {
      const isPivot = selectedCompositeTile.tiles.length === 0; // First tile is pivot
      addTileToComposite(tileId, pendingPosition.x, pendingPosition.y, isPivot);
    }
    setShowTileSelector(false);
    setPendingPosition(null);
  };

  // Get all occupied positions in the composite
  const getOccupiedPositions = (): Set<string> => {
    if (!selectedCompositeTile) return new Set();
    return new Set(
      selectedCompositeTile.tiles.map(t => `${t.offsetX},${t.offsetY}`)
    );
  };

  // Get adjacent positions that should show + buttons
  const getAdjacentPositions = (): { x: number, y: number }[] => {
    if (!selectedCompositeTile || selectedCompositeTile.tiles.length === 0) {
      return [{ x: 0, y: 0 }]; // Show center position if no tiles yet
    }

    const occupied = getOccupiedPositions();
    const adjacent = new Set<string>();

    selectedCompositeTile.tiles.forEach(tile => {
      // Check all 4 adjacent positions
      const neighbors = [
        { x: tile.offsetX - 1, y: tile.offsetY },     // Left
        { x: tile.offsetX + 1, y: tile.offsetY },     // Right
        { x: tile.offsetX, y: tile.offsetY - 1 },     // Top
        { x: tile.offsetX, y: tile.offsetY + 1 },     // Bottom
      ];

      neighbors.forEach(pos => {
        const key = `${pos.x},${pos.y}`;
        if (!occupied.has(key)) {
          adjacent.add(key);
        }
      });
    });

    return Array.from(adjacent).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  };

  // === LEGACY ANIMATED TILE FUNCTIONS ===

  const createNewAnimatedTile = () => {
    const newTile: AnimatedTile = {
      id: `anim_${Date.now()}`,
      name: `Animated Tile ${animatedTiles.length + 1}`,
      frames: [],
      fps: 8
    };
    setAnimatedTiles(prev => [...prev, newTile]);
    setSelectedAnimatedTile(newTile);
    setEditingName(newTile.name);
    setFps(newTile.fps);
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  };

  const deleteAnimatedTile = (id: string) => {
    if (window.confirm('Delete this animated tile?')) {
      setAnimatedTiles(prev => prev.filter(t => t.id !== id));
      if (selectedAnimatedTile?.id === id) {
        setSelectedAnimatedTile(null);
      }
    }
  };

  const addFrameToAnimation = (tileId: string) => {
    if (!selectedAnimatedTile) return;

    setAnimatedTiles(prev => prev.map(at => 
      at.id === selectedAnimatedTile.id 
        ? { ...at, frames: [...at.frames, tileId] }
        : at
    ));
    
    setSelectedAnimatedTile(prev => 
      prev ? { ...prev, frames: [...prev.frames, tileId] } : null
    );
  };

  const removeFrame = (index: number) => {
    if (!selectedAnimatedTile) return;

    const newFrames = selectedAnimatedTile.frames.filter((_, i) => i !== index);
    
    setAnimatedTiles(prev => prev.map(at => 
      at.id === selectedAnimatedTile.id 
        ? { ...at, frames: newFrames }
        : at
    ));
    
    setSelectedAnimatedTile(prev => 
      prev ? { ...prev, frames: newFrames } : null
    );

    if (currentFrameIndex >= newFrames.length && newFrames.length > 0) {
      setCurrentFrameIndex(newFrames.length - 1);
    }
  };

  const moveFrame = (fromIndex: number, toIndex: number) => {
    if (!selectedAnimatedTile) return;
    
    const newFrames = [...selectedAnimatedTile.frames];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);

    setAnimatedTiles(prev => prev.map(at => 
      at.id === selectedAnimatedTile.id 
        ? { ...at, frames: newFrames }
        : at
    ));
    
    setSelectedAnimatedTile(prev => 
      prev ? { ...prev, frames: newFrames } : null
    );
  };

  const updateName = () => {
    if (!selectedAnimatedTile || !editingName.trim()) return;

    setAnimatedTiles(prev => prev.map(at => 
      at.id === selectedAnimatedTile.id 
        ? { ...at, name: editingName }
        : at
    ));
    
    setSelectedAnimatedTile(prev => 
      prev ? { ...prev, name: editingName } : null
    );
  };

  const updateFps = (newFps: number) => {
    if (!selectedAnimatedTile) return;

    setFps(newFps);
    
    setAnimatedTiles(prev => prev.map(at => 
      at.id === selectedAnimatedTile.id 
        ? { ...at, fps: newFps }
        : at
    ));
    
    setSelectedAnimatedTile(prev => 
      prev ? { ...prev, fps: newFps } : null
    );
  };

  const saveComplexTile = () => {
    if (!selectedAnimatedTile || selectedAnimatedTile.frames.length === 0) {
      alert('Please add at least one frame to save the complex tile');
      return;
    }

    // Get the first frame as the base grid
    const firstFrameTile = getTile(selectedAnimatedTile.frames[0]);
    if (!firstFrameTile) {
      alert('Error: Could not find first frame tile');
      return;
    }

    // Save as a complex tile
    const tileId = saveTile(
      selectedAnimatedTile.name,
      firstFrameTile.grid,
      firstFrameTile.size,
      null,
      undefined,
      true, // isComplex
      selectedAnimatedTile.frames, // animationFrames
      selectedAnimatedTile.fps // animationFps
    );

    // Auto-publish if enabled
    if (shouldPublish) {
      publishTile(tileId, null);
      alert(`Complex tile "${selectedAnimatedTile.name}" saved and published to map editor!`);
    } else {
      alert(`Complex tile "${selectedAnimatedTile.name}" saved! You can publish it from the tile editor.`);
    }
  };

  // Get the basic tiles (non-complex, non-animated) for the tile selector
  const basicTiles = tiles.filter(t => !t.isComplex);

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Tile Studio" />

      {/* Left Sliding Menu - Composite Tiles Only */}
      <GameMenu 
        side="left" 
        triggerIcon={<Squares2X2Icon className="w-6 h-6" />}
        onOpenChange={setTilesMenuOpen}
      >
        <GameSection title="Composite Tiles">
          {compositeTiles.length === 0 ? (
            <div className="text-sm opacity-60 text-center py-4">
              <p>No composite tiles yet</p>
              <p className="text-xs mt-2">Create one below</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {compositeTiles.map(ct => (
                <div
                  key={ct.id}
                  className={`border-2 border-black p-3 cursor-pointer transition-all ${
                    selectedCompositeTile?.id === ct.id ? 'ring-4 ring-blue-500' : ''
                  }`}
                  style={{ 
                    backgroundColor: 'var(--theme-bg-light)',
                    boxShadow: '2px 2px 0 #000'
                  }}
                  onClick={() => {
                    setSelectedCompositeTile(ct);
                    setEditingName(ct.name);
                  }}
                >
                  <div className="font-bold text-sm mb-1">{ct.name}</div>
                  <div className="text-xs opacity-70">{ct.tiles.length} tiles</div>
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
        </GameSection>
      </GameMenu>

      {/* Main Content */}
      <div className="flex-1 mt-16 flex flex-col overflow-hidden">
        {/* Top Bar - Project Selection */}
        <div className="px-8 py-4 border-b-2 border-black flex items-center gap-4" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
          <label className="font-bold">Composite Tile:</label>
          <select
            value={selectedCompositeTile?.id || ''}
            onChange={(e) => {
              const ct = compositeTiles.find(t => t.id === e.target.value);
              setSelectedCompositeTile(ct || null);
              if (ct) setEditingName(ct.name);
            }}
            className="flex-1 max-w-md p-2 border-2 border-black"
            style={{ backgroundColor: 'var(--theme-bg-light)' }}
          >
            <option value="">Select a composite tile...</option>
            {compositeTiles.map(ct => (
              <option key={ct.id} value={ct.id}>{ct.name}</option>
            ))}
          </select>
          <GameButton onClick={createNewCompositeTile}>
            <PlusIcon className="w-5 h-5" />
            <span className="ml-2">New Composite Tile</span>
          </GameButton>
        </div>

        {!selectedCompositeTile ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <div className="text-2xl opacity-60 mb-4">Create or select a composite tile to begin</div>
              <p className="text-sm opacity-50 max-w-md mx-auto">
                Composite tiles let you combine multiple tiles into larger structures. 
                Click the "+" buttons around tiles to build your composite.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col p-6 overflow-auto">
            {/* Name Editor */}
            <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-panel)', boxShadow: '4px 4px 0 #000' }}>
              <div className="flex items-center gap-4">
                <label className="font-bold">Name:</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => updateCompositeTileName(selectedCompositeTile.id, editingName)}
                  className="flex-1 p-2 border-2 border-black"
                  style={{ backgroundColor: 'var(--theme-bg-light)' }}
                />
              </div>
            </div>

            {/* Canvas Grid - Show tiles and + buttons */}
            <div className="flex-1 p-8 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
              <div className="font-bold mb-6 text-lg flex items-center justify-between">
                <span>Canvas</span>
                <div className="text-sm opacity-70 font-normal">
                  {selectedCompositeTile.tiles.length === 0 
                    ? 'Click + to add your first tile' 
                    : `${selectedCompositeTile.tiles.length} tile(s)`}
                </div>
              </div>
              
              {selectedCompositeTile.tiles.length === 0 && getAdjacentPositions().length === 0 ? (
                <div className="text-center p-8 opacity-60">Error: No positions available</div>
              ) : (
                <div className="flex items-center justify-center">
                  {/* Grid Container - Dynamically sized based on tile positions */}
                  <div className="inline-grid gap-0" style={{ 
                    gridTemplateColumns: 'repeat(auto-fit, 128px)',
                    gridAutoRows: '128px'
                  }}>
                    {/* Render existing tiles */}
                    {selectedCompositeTile.tiles.map(tileEntry => {
                      const tile = getTile(tileEntry.tileId);
                      if (!tile) return null;

                      return (
                        <div
                          key={`${tileEntry.offsetX},${tileEntry.offsetY}`}
                          className="relative border-2 border-black"
                          style={{ 
                            gridColumn: `${tileEntry.offsetX + 10} / span 1`,
                            gridRow: `${tileEntry.offsetY + 10} / span 1`,
                            backgroundColor: 'var(--theme-bg-panel)',
                          }}
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
                          {tileEntry.isPivot && (
                            <div 
                              className="absolute top-1 right-1 bg-yellow-400 text-black text-xs px-1 rounded border border-black"
                              title="Pivot tile - origin point for placement"
                            >
                              PIVOT
                            </div>
                          )}
                          <GameButton
                            icon
                            onClick={() => removeTileFromComposite(tileEntry.offsetX, tileEntry.offsetY)}
                            className="absolute bottom-1 right-1"
                            style={{ padding: '4px' }}
                            title="Remove tile"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </GameButton>
                        </div>
                      );
                    })}

                    {/* Render + buttons for adjacent empty positions */}
                    {getAdjacentPositions().map(pos => (
                      <div
                        key={`add-${pos.x},${pos.y}`}
                        className="border-2 border-dashed border-black flex items-center justify-center cursor-pointer hover:bg-[var(--theme-bg-panel)] transition-colors"
                        style={{ 
                          gridColumn: `${pos.x + 10} / span 1`,
                          gridRow: `${pos.y + 10} / span 1`,
                          backgroundColor: 'transparent'
                        }}
                        onClick={() => handleAddTileClick(pos.x, pos.y)}
                        title="Add tile here"
                      >
                        <PlusIcon className="w-12 h-12 opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tile Selector Modal */}
      {showTileSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div 
            className="border-4 border-black p-6 max-w-4xl max-h-[80vh] overflow-auto"
            style={{ backgroundColor: 'var(--theme-bg-light)', boxShadow: '8px 8px 0 #000' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Select a Tile</h2>
              <GameButton
                icon
                onClick={() => {
                  setShowTileSelector(false);
                  setPendingPosition(null);
                }}
              >
                <XMarkIcon className="w-6 h-6" />
              </GameButton>
            </div>

            {basicTiles.length === 0 ? (
              <div className="text-center p-8 opacity-60">
                <p>No basic tiles available</p>
                <Link to="/tile-editor" className="underline">Create tiles first in Tile Editor</Link>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-4">
                {basicTiles.map(tile => (
                  <div
                    key={tile.id}
                    className="border-2 border-black cursor-pointer p-3 transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: 'var(--theme-bg-panel)',
                      boxShadow: '2px 2px 0 #000'
                    }}
                    onClick={() => handleTileSelected(tile.id)}
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
                    <div className="text-xs mt-2 text-center font-bold truncate">{tile.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

