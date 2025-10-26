import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { useTiles } from "../hooks/useTiles";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useRouteCycling } from "../hooks/useRouteCycling";
import { GameButton } from "../components/GameButton";
import { NavBar } from "../components/NavBar";
import { 
  PlusIcon, 
  TrashIcon, 
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

export function meta() {
  return [
    { title: "Tile Studio - Dither" },
    { name: "description", content: "Create complex animated tiles from multiple frames" },
  ];
}

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
  
  // Load animated tiles from localStorage
  const [animatedTilesData, setAnimatedTilesData] = useLocalStorage<AnimatedTile[]>('animated-tiles', []);
  const [animatedTiles, setAnimatedTiles] = useState<AnimatedTile[]>(animatedTilesData);
  
  const [selectedAnimatedTile, setSelectedAnimatedTile] = useState<AnimatedTile | null>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [fps, setFps] = useState(8);
  const [publishFolderId, setPublishFolderId] = useState<string | null>(null);
  const [shouldPublish, setShouldPublish] = useState(true); // Auto-publish by default
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

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
      publishTile(tileId, publishFolderId);
      alert(`Complex tile "${selectedAnimatedTile.name}" saved and published to map editor!`);
    } else {
      alert(`Complex tile "${selectedAnimatedTile.name}" saved! You can publish it from the tile editor.`);
    }
  };

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Tile Studio" />

      {/* Left Sidebar - Animated Tiles List */}
      <div 
        className="fixed left-0 top-16 bottom-0 w-64 border-r-2 border-black overflow-y-auto z-30 p-4"
        style={{ backgroundColor: 'var(--theme-bg-panel)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Animated Tiles</h2>
          <GameButton icon onClick={createNewAnimatedTile} title="New Animated Tile">
            <PlusIcon className="w-5 h-5" />
          </GameButton>
        </div>

        {animatedTiles.length === 0 ? (
          <div className="text-sm opacity-60 text-center">
            <p>No animated tiles yet</p>
            <p className="text-xs mt-2">Click + to create one</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {animatedTiles.map(at => (
              <div
                key={at.id}
                className={`border-2 border-black p-2 cursor-pointer ${
                  selectedAnimatedTile?.id === at.id ? 'ring-4 ring-blue-500' : ''
                }`}
                style={{ 
                  backgroundColor: 'var(--theme-bg-medium)',
                  boxShadow: '2px 2px 0 #000'
                }}
                onClick={() => {
                  setSelectedAnimatedTile(at);
                  setEditingName(at.name);
                  setFps(at.fps);
                  setCurrentFrameIndex(0);
                  setIsPlaying(false);
                }}
              >
                <div className="font-bold text-sm">{at.name}</div>
                <div className="text-xs opacity-70">{at.frames.length} frames @ {at.fps} fps</div>
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

      {/* Main Content */}
      <div className="flex-1 ml-64 mt-16 p-8 overflow-auto">
        {!selectedAnimatedTile ? (
          <div className="text-center text-2xl opacity-60 mt-20">
            Select or create an animated tile to begin
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Tile Info */}
            <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
              <div className="flex items-center gap-4 mb-4">
                <label className="font-bold">Name:</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={updateName}
                  className="flex-1 p-2 border-2 border-black"
                  style={{ backgroundColor: 'var(--theme-bg-panel)' }}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="font-bold">FPS:</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={fps}
                  onChange={(e) => updateFps(parseInt(e.target.value) || 8)}
                  className="w-20 p-2 border-2 border-black"
                  style={{ backgroundColor: 'var(--theme-bg-panel)' }}
                />
                <div className="text-sm opacity-70">
                  Duration: {((selectedAnimatedTile.frames.length / fps) * 1000).toFixed(0)}ms per loop
                </div>
              </div>
            </div>

            {/* Preview and Controls */}
            <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
              <div className="font-bold mb-4 text-lg">Preview</div>
              
              {selectedAnimatedTile.frames.length === 0 ? (
                <div className="text-center p-8 opacity-60">Add frames to see preview</div>
              ) : (
                <div className="flex items-center gap-4">
                  <canvas
                    ref={previewCanvasRef}
                    className="border-2 border-black"
                    style={{ 
                      imageRendering: 'pixelated',
                      width: '128px',
                      height: '128px'
                    }}
                  />
                  
                  <div className="flex flex-col gap-2">
                    <GameButton onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                      <span className="ml-2">{isPlaying ? 'Pause' : 'Play'}</span>
                    </GameButton>
                    
                    {/* Publish Settings */}
                    <div className="p-3 border-2 border-black bg-[var(--theme-bg-panel)]" style={{ boxShadow: '2px 2px 0 #000' }}>
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shouldPublish}
                          onChange={(e) => setShouldPublish(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs font-bold">Publish to Map Editor</span>
                      </label>
                      
                      {shouldPublish && (
                        <select
                          value={publishFolderId || ''}
                          onChange={(e) => setPublishFolderId(e.target.value || null)}
                          className="w-full px-2 py-1 text-xs border-2 border-black bg-white"
                          style={{ boxShadow: '1px 1px 0 #000' }}
                        >
                          <option value="">Root Folder</option>
                          {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <GameButton 
                      onClick={saveComplexTile}
                      style={{ 
                        backgroundColor: '#FFD700',
                        borderColor: '#000',
                        fontWeight: 'bold'
                      }}
                    >
                      Save {shouldPublish ? '& Publish' : 'to Tiles'}
                    </GameButton>
                    
                    <div className="text-sm">
                      Frame {currentFrameIndex + 1} of {selectedAnimatedTile.frames.length}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Frames Timeline */}
            <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
              <div className="font-bold mb-4 text-lg">Animation Frames</div>
              
              {selectedAnimatedTile.frames.length === 0 ? (
                <div className="text-center p-4 opacity-60">No frames added yet. Select tiles below to add them.</div>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {selectedAnimatedTile.frames.map((frameId, index) => {
                    const tile = getTile(frameId);
                    if (!tile) return null;

                    return (
                      <div 
                        key={`${frameId}-${index}`}
                        className="flex-shrink-0 border-2 border-black p-2 relative"
                        style={{ 
                          backgroundColor: 'var(--theme-bg-panel)',
                          boxShadow: index === currentFrameIndex ? '0 0 0 3px blue' : '2px 2px 0 #000'
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
                          style={{ 
                            imageRendering: 'pixelated',
                            width: '64px',
                            height: '64px'
                          }}
                        />
                        
                        <div className="text-xs text-center mt-1">Frame {index + 1}</div>
                        
                        <div className="flex gap-1 mt-2">
                          {index > 0 && (
                            <GameButton
                              icon
                              onClick={() => moveFrame(index, index - 1)}
                              style={{ padding: '2px' }}
                              title="Move Left"
                            >
                              <ArrowLeftIcon className="w-3 h-3" />
                            </GameButton>
                          )}
                          
                          {index < selectedAnimatedTile.frames.length - 1 && (
                            <GameButton
                              icon
                              onClick={() => moveFrame(index, index + 1)}
                              style={{ padding: '2px' }}
                              title="Move Right"
                            >
                              <ArrowRightIcon className="w-3 h-3" />
                            </GameButton>
                          )}
                          
                          <GameButton
                            icon
                            onClick={() => removeFrame(index)}
                            style={{ padding: '2px' }}
                            title="Remove Frame"
                          >
                            <TrashIcon className="w-3 h-3" />
                          </GameButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Available Tiles */}
            <div className="p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
              <div className="font-bold mb-4 text-lg">Available Tiles</div>
              
              {tiles.length === 0 ? (
                <div className="text-center p-4 opacity-60">
                  <p>No tiles available</p>
                  <Link to="/tile-editor" className="underline">Create tiles first</Link>
                </div>
              ) : (
                <div className="grid grid-cols-6 gap-2">
                  {tiles.map(tile => {
                    return (
                      <div
                        key={tile.id}
                        className="border-2 border-black cursor-pointer p-2 transition-all hover:scale-105"
                        style={{ 
                          backgroundColor: 'var(--theme-bg-panel)',
                          boxShadow: '2px 2px 0 #000'
                        }}
                        onClick={() => addFrameToAnimation(tile.id)}
                        title={`Add ${tile.name} to animation`}
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
                        <div className="text-xs mt-1 truncate text-center">{tile.name}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

