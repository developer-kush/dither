import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { PixelArtPreview } from "./PixelArtPreview";
import { Board } from "./Board";
import { KeyboardTrigger } from "../utils/KeyboardTrigger";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { usePersistentBoard } from "../hooks/usePersistentBoard";
import { useRouteCycling } from "../hooks/useRouteCycling";
import { GameMenu } from "../components/GameMenu";
import { GameSection } from "../components/GameSection";
import { GameButton } from "../components/GameButton";
import { GameIcon } from "../components/GameIcon";
import { NavBar } from "../components/NavBar";
import { TileListVisual } from "../components/TileListVisual";
import { Toast } from "../components/Toast";
import { useTiles } from "../hooks/useTiles";
import { floodFill } from "../utils/floodFill";

const GRID_SIZES = [8, 16, 32, 64];

export function meta() {
  return [
    { title: "Tile Editor - Dither" },
    { name: "description", content: "Edit and create pixel art tiles with Dither" },
  ];
}

export default function PixelArtGenerator() {
  const { tileId } = useParams();
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();
  
  // Persistent storage for main state
  const [gridSize, setGridSize] = useLocalStorage('pixelart-gridSize', 16);
  const [board, setBoard] = usePersistentBoard('pixelart-board', gridSize);
  const [color, setColor] = useLocalStorage('pixelart-color', "#000000");
  const [recentColors, setRecentColors] = useLocalStorage<string[]>('pixelart-recentColors', []);
  const [pinnedColors, setPinnedColors] = useLocalStorage<string[]>('pixelart-pinnedColors', []);
  
  // Gradient state (persistent)
  const [gradientStart, setGradientStart] = useLocalStorage('pixelart-gradientStart', "#000000");
  const [gradientEnd, setGradientEnd] = useLocalStorage('pixelart-gradientEnd', "#ffffff");
  const [gradientSteps, setGradientSteps] = useLocalStorage('pixelart-gradientSteps', 5);
  
  // Non-persistent state (session-only)
  const [grid, setGrid] = useState(() => board.getWindow());
  const [mouseDown, setMouseDown] = useState(false);
  const [undoStack, setUndoStack] = useState<Board[]>([]);
  const [redoStack, setRedoStack] = useState<Board[]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number, color: string} | null>(null);
  const [lastUploads, setLastUploads] = useState<string[]>([]);
  const [floodFillMode, setFloodFillMode] = useState(false);
  const [boxMode, setBoxMode] = useState(false);
  const [brushMode, setBrushMode] = useState(false);
  const [brushStrength, setBrushStrength] = useLocalStorage('pixelart-brushStrength', 2/12); // Default to 1/6
  const [boxStart, setBoxStart] = useState<{x: number, y: number} | null>(null);
  const [leftMenuOpen, setLeftMenuOpen] = useState(false);
  const [hexInput, setHexInput] = useState(color.toUpperCase());
  
  // Helper function to generate new tile ID and name
  const generateNewTileIdAndName = () => {
    const id = `tile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const name = `Untitled-${id.substring(id.lastIndexOf('_') + 1)}`;
    return { id, name };
  };
  
  // Generate initial values (only computed once on first render)
  const initialTileData = generateNewTileIdAndName();
  
  // Persistent tile identity - remember which tile is being edited across reloads
  const [currentTileId, setCurrentTileId] = useLocalStorage<string>('pixelart-currentTileId', initialTileData.id);
  const [currentTileName, setCurrentTileName] = useLocalStorage<string>('pixelart-currentTileName', initialTileData.name);
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  
  // Tile management
  const { tiles, folders, saveTile, deleteTile, renameTile, getTile, createFolder, renameFolder, deleteFolder, publishTile, unpublishTile, addLabelToTile } = useTiles();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollAccumulatorRef = useRef<number>(0);

  const BIN_COLOR = "rgba(0,0,0,0)";

  // Sync grid with board whenever board changes
  useEffect(() => {
    setGrid(board.getWindow());
  }, [board]);

  // Update theme based on tool mode and menu state
  useEffect(() => {
    let theme = 'green';
    if (leftMenuOpen) {
      theme = 'gray';
    } else if (brushMode) {
      theme = 'dark-green';
    } else if (boxMode) {
      theme = 'red';
    } else if (floodFillMode) {
      theme = 'blue';
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [floodFillMode, boxMode, brushMode, leftMenuOpen]);

  // Sync hex input with color changes
  useEffect(() => {
    setHexInput(color.toUpperCase());
  }, [color]);

  // Helper to show toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  // Shift logic: move the window, not the pixels
  const shiftWindow = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    if (direction === 'up') newBoard.shift(0, -1);
    if (direction === 'down') newBoard.shift(0, 1);
    if (direction === 'left') newBoard.shift(-1, 0);
    if (direction === 'right') newBoard.shift(1, 0);
    setBoard(newBoard);
  }, [board]);

  // Rotate 90 degrees clockwise
  const rotateClockwise = useCallback(() => {
    setUndoStack(stack => [...stack, board]);
    setRedoStack([]);
    
    const currentGrid = board.getWindow();
    const size = currentGrid.length;
    const rotated: string[][] = Array.from({ length: size }, () => Array(size).fill("rgba(0,0,0,0)"));
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        rotated[x][size - 1 - y] = currentGrid[y][x];
      }
    }
    
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    newBoard.setWindow(rotated);
    setBoard(newBoard);
    showToast('Rotated clockwise', 'success');
  }, [board, showToast]);

  // Rotate 90 degrees counter-clockwise
  const rotateCounterClockwise = useCallback(() => {
    setUndoStack(stack => [...stack, board]);
    setRedoStack([]);
    
    const currentGrid = board.getWindow();
    const size = currentGrid.length;
    const rotated: string[][] = Array.from({ length: size }, () => Array(size).fill("rgba(0,0,0,0)"));
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        rotated[size - 1 - x][y] = currentGrid[y][x];
      }
    }
    
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    newBoard.setWindow(rotated);
    setBoard(newBoard);
    showToast('Rotated counter-clockwise', 'success');
  }, [board, showToast]);

  // Flip horizontally
  const flipHorizontal = useCallback(() => {
    setUndoStack(stack => [...stack, board]);
    setRedoStack([]);
    
    const currentGrid = board.getWindow();
    const size = currentGrid.length;
    const flipped: string[][] = Array.from({ length: size }, () => Array(size).fill("rgba(0,0,0,0)"));
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        flipped[y][size - 1 - x] = currentGrid[y][x];
      }
    }
    
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    newBoard.setWindow(flipped);
    setBoard(newBoard);
    showToast('Flipped horizontally', 'success');
  }, [board, showToast]);

  // Flip vertically
  const flipVertical = useCallback(() => {
    setUndoStack(stack => [...stack, board]);
    setRedoStack([]);
    
    const currentGrid = board.getWindow();
    const size = currentGrid.length;
    const flipped: string[][] = Array.from({ length: size }, () => Array(size).fill("rgba(0,0,0,0)"));
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        flipped[size - 1 - y][x] = currentGrid[y][x];
      }
    }
    
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    newBoard.setWindow(flipped);
    setBoard(newBoard);
    showToast('Flipped vertically', 'success');
  }, [board, showToast]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prevBoard = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, board]);
    setBoard(prevBoard);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, board]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextBoard = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, board]);
    setBoard(nextBoard);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, board]);

  // Set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Ctrl+S even in input fields
        if (e.key.toLowerCase() === 's' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSaveTile();
        }
        return;
      }
      
      const key = e.key.toLowerCase();
      
      // Save with Ctrl/Cmd + S
      if (key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveTile();
        return;
      }
      
      // New tile with Ctrl/Cmd + N
      if (key === 'n' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleReset();
        return;
      }
      
      // Tool cycling with F: pencil -> brush -> flood fill -> box -> pencil
      if (key === 'f') {
        e.preventDefault();
        
        if (!floodFillMode && !boxMode && !brushMode) {
          // From pencil to brush
          setBrushMode(true);
        } else if (brushMode) {
          // From brush to flood fill
          setBrushMode(false);
          setFloodFillMode(true);
        } else if (floodFillMode) {
          // From flood fill to box
          setFloodFillMode(false);
          setBoxMode(true);
        } else {
          // From box back to pencil
          setBoxMode(false);
        }
        setBoxStart(null);
        return;
      }
      
      // Color picker with C
      if (key === 'c' && hoveredPixel) {
        e.preventDefault();
        setColor(hoveredPixel.color);
        addRecentColor(hoveredPixel.color);
        return;
      }
      
      // Movement keys
      if (['arrowup', 'w'].includes(key)) {
        e.preventDefault();
        shiftWindow('up');
      } else if (['arrowdown', 's'].includes(key)) {
        e.preventDefault();
        shiftWindow('down');
      } else if (['arrowleft', 'a'].includes(key)) {
        e.preventDefault();
        shiftWindow('left');
      } else if (['arrowright', 'd'].includes(key)) {
        e.preventDefault();
        shiftWindow('right');
      }
      
      // Undo/Redo
      if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shiftWindow, handleUndo, handleRedo, hoveredPixel, boxMode, floodFillMode, brushMode, currentTileId, currentTileName, tiles, grid, gridSize, currentFolderId]); // Re-register when dependencies change

  // Handle grid size change
  function handleGridSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newSize = parseInt(e.target.value);
    const oldSize = gridSize;
    
    // Create a new board with the new size
    const newBoard = new Board(newSize);
    newBoard.centerWindow();
    
    // Copy existing pixels from the old board to the new board
    const oldGrid = grid;
    for (let y = 0; y < Math.min(oldSize, newSize); y++) {
      for (let x = 0; x < Math.min(oldSize, newSize); x++) {
        const color = oldGrid[y]?.[x];
        if (color && color !== "rgba(0,0,0,0)") {
          newBoard.setPixel(y, x, color);
        }
      }
    }
    
    setGridSize(newSize);
    setBoard(newBoard);
    setUndoStack([]);
    setRedoStack([]);
  }

  // Add color to recent colors (if not already present)
  function addRecentColor(newColor: string) {
    if (newColor === "#ffffff") return;
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== newColor);
      return [newColor, ...filtered].slice(0, 20);
    });
  }

  // Handle pixel coloring (add color to recents)
  function handlePixelAction(row: number, col: number) {
    if (boxMode) {
      // Box mode is handled in mouse down/up, not here
      return;
    }
    
    setUndoStack(stack => [...stack, board]);
    setRedoStack([]); // Clear redo stack when new action is performed
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    
    if (floodFillMode) {
      // Perform flood fill on the current window
      const currentWindow = newBoard.getWindow();
      const filledWindow = floodFill(currentWindow, col, row, color);
      newBoard.setWindow(filledWindow);
    } else if (brushMode) {
      // Brush mode - blend colors
      const currentColor = grid[row][col];
      const blendedColor = blendColors(currentColor, color, brushStrength);
      newBoard.setPixel(row, col, blendedColor);
      addRecentColor(blendedColor);
    } else {
      // Normal pixel coloring
      newBoard.setPixel(row, col, color);
    }
    
    setBoard(newBoard);
    if (!brushMode) {
      addRecentColor(color);
    }
  }

  // Mouse events for drawing
  function handleMouseDown(row: number, col: number) {
    setMouseDown(true);
    if (boxMode) {
      setBoxStart({x: col, y: row});
    } else {
      handlePixelAction(row, col);
    }
  }
  function handleMouseEnter(row: number, col: number) {
    // Allow dragging in normal mode and brush mode, not flood fill or box mode
    if (mouseDown && !floodFillMode && !boxMode) handlePixelAction(row, col);
  }
  function handleMouseUp(row: number, col: number) {
    if (boxMode && boxStart && mouseDown) {
      // Complete the box fill
      setUndoStack(stack => [...stack, board]);
      setRedoStack([]); // Clear redo stack when new action is performed
      const newBoard = new Board(board.size);
      newBoard.data = board.getVirtualGrid();
      newBoard.window = { ...board.window };
      
      // Fill the rectangular area
      const minX = Math.min(boxStart.x, col);
      const maxX = Math.max(boxStart.x, col);
      const minY = Math.min(boxStart.y, row);
      const maxY = Math.max(boxStart.y, row);
      
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          newBoard.setPixel(y, x, color);
        }
      }
      
      setBoard(newBoard);
      addRecentColor(color);
      setBoxStart(null);
    }
    setMouseDown(false);
  }

  // Pin/unpin color
  function handlePinColor(pinColor: string) {
    setPinnedColors(prev => prev.includes(pinColor) ? prev.filter(c => c !== pinColor) : [pinColor, ...prev]);
  }

  // Load image
  function handleLoadTexture(e: React.ChangeEvent<HTMLInputElement> | string) {
    let file: File | undefined;
    let url: string | undefined;
    if (typeof e === 'string') {
      url = e;
    } else {
      file = e.target.files?.[0];
      if (!file) return;
      url = URL.createObjectURL(file);
      setLastUploads(prev => [url!, ...prev.filter(u => u !== url)].slice(0, 2));
    }
    const img = new window.Image();
    img.onload = () => {
      const { width, height } = img;
      let bestSize = GRID_SIZES.find(s => s === width && s === height);
      if (!bestSize) {
        const minDim = Math.min(width, height);
        bestSize = GRID_SIZES.reduce((prev, curr) => Math.abs(curr - minDim) < Math.abs(prev - minDim) ? curr : prev, GRID_SIZES[0]);
      }
      setGridSize(bestSize);
      const size = bestSize;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size).data;
      const newBoard = new Board(size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = imageData[idx + 3];
          newBoard.data[newBoard.size + y][newBoard.size + x] = a === 0 ? "rgba(0,0,0,0)" : `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
      }
      newBoard.centerWindow();
      setBoard(newBoard);
    };
    img.src = url!;
  }

  // Create new tile: keep the current board, but change the ID and name
  function handleReset() {
    // Don't create a new board - keep the current one
    // Just generate a new ID and name
    const { id, name } = generateNewTileIdAndName();
    setCurrentTileId(id);
    setCurrentTileName(name);
    showToast('New tile created - board preserved', 'info');
  }

  // Clear the board completely
  function handleClearBoard() {
    const newBoard = new Board(gridSize);
    newBoard.centerWindow();
    setBoard(newBoard);
    setUndoStack([]);
    setRedoStack([]);
    showToast('Board cleared', 'info');
  }

  // Save current tile
  function handleSaveTile() {
    if (!currentTileId) {
      showToast('No tile to save', 'error');
      return;
    }
    
    if (!currentTileName.trim()) {
      showToast('Please enter a tile name', 'error');
      return;
    }
    
    // Check if tile exists in the saved tiles
    const existingTile = tiles.find(t => t.id === currentTileId);
    
    saveTile(currentTileName.trim(), grid, gridSize, currentFolderId, currentTileId);
    
    // Add system label for dimensions (for use in animations)
    // All basic tiles are 1x1 tile units regardless of pixel size
    addLabelToTile(currentTileId, 'dims:1x1');
    
    if (!existingTile) {
      showToast(`Tile "${currentTileName.trim()}" saved successfully!`, 'success');
    } else {
      showToast(`Tile "${currentTileName}" updated!`, 'success');
    }
  }

  // Publish/unpublish current tile
  function handleTogglePublish() {
    if (!currentTileId) {
      showToast('No tile to publish', 'error');
      return;
    }
    
    const currentTile = tiles.find(t => t.id === currentTileId);
    if (!currentTile) {
      showToast('Please save the tile first', 'error');
      return;
    }
    
    if (currentTile.isPublished) {
      unpublishTile(currentTileId);
      showToast(`Tile "${currentTileName}" unpublished from map editor`, 'info');
    } else {
      publishTile(currentTileId, null);
      showToast(`Tile "${currentTileName}" published to map editor!`, 'success');
    }
  }

  // Load a tile
  function handleLoadTile(tile: typeof tiles[0]) {
    // Set the grid size if different
    if (tile.size !== gridSize) {
      setGridSize(tile.size);
    }
    
    // Create a new board with the tile data
    const newBoard = new Board(tile.size);
    newBoard.centerWindow();
    
    // Load the tile grid into the board
    const window = newBoard.getWindow();
    for (let y = 0; y < tile.size; y++) {
      for (let x = 0; x < tile.size; x++) {
        if (tile.grid[y] && tile.grid[y][x]) {
          newBoard.setPixel(y, x, tile.grid[y][x]);
        }
      }
    }
    
    setBoard(newBoard);
    setCurrentTileName(tile.name);
    setCurrentTileId(tile.id);
    setUndoStack([]);
    setRedoStack([]);
    showToast(`Loaded tile "${tile.name}"`, 'info');
  }

  // Export as image (supports multiple formats)
  function handleExport(format: 'png' | 'jpeg' | 'webp' | 'svg' = 'png') {
    console.log('Exporting as:', format);
    const size = gridSize;
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error('Canvas context not found');
      return;
    }
    
    // For JPEG, fill with white background first (JPEG doesn't support transparency)
    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
    }
    
    // Draw pixels to canvas
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelColor = grid[y][x];
        if (pixelColor !== "rgba(0,0,0,0)" || format === 'jpeg') {
          ctx.fillStyle = pixelColor === "rgba(0,0,0,0)" ? '#FFFFFF' : pixelColor;
        ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    
    if (format === 'svg') {
      // Generate SVG
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const color = grid[y][x];
          if (color !== "rgba(0,0,0,0)") {
            svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
          }
        }
      }
      svg += '</svg>';
      
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-art-${size}x${size}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      console.log('SVG exported successfully');
    } else {
      // Export as raster format
      const mimeType = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('Failed to create blob');
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `pixel-art-${size}x${size}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        console.log(`${format.toUpperCase()} exported successfully`);
      }, mimeType, format === 'jpeg' ? 0.95 : undefined);
    }
  }

  // Destructive scroll toggle
  const [destructiveScroll, setDestructiveScroll] = useState(false);
  // Red glow state for blocked scroll
  const [redGlow, setRedGlow] = useState(false);

  // Helper to trigger red glow
  function triggerRedGlow() {
    setRedGlow(true);
    setTimeout(() => setRedGlow(false), 300);
  }

  // Handle color change
  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value);
  }

  // Helper to blend two colors (mix newColor into baseColor with 20% strength)
  function blendColors(baseColor: string, newColor: string, strength: number = 0.2): string {
    // Handle transparent base color
    if (baseColor === "rgba(0,0,0,0)") {
      // Blend transparent with the new color at lower opacity
      const rgb = hexToRgb(newColor);
      return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${strength})`;
    }
    
    // Parse colors
    const base = baseColor.startsWith('rgba') ? parseRgba(baseColor) : hexToRgb(baseColor);
    const blend = newColor === "rgba(0,0,0,0)" ? [0, 0, 0] : hexToRgb(newColor);
    
    // Mix colors
    const mixed: [number, number, number] = [
      Math.round(base[0] * (1 - strength) + blend[0] * strength),
      Math.round(base[1] * (1 - strength) + blend[1] * strength),
      Math.round(base[2] * (1 - strength) + blend[2] * strength)
    ];
    
    return rgbToHex(mixed);
  }
  
  // Helper to parse rgba string
  function parseRgba(rgba: string): [number, number, number] {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
  }

  // Helper to interpolate between two hex colors
  function hexToRgb(hex: string): [number, number, number] {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
    const num = parseInt(hex, 16);
    return [num >> 16 & 255, num >> 8 & 255, num & 255];
  }
  function rgbToHex([r, g, b]: [number, number, number]): string {
    return (
      "#" +
      [r, g, b]
        .map(x => x.toString(16).padStart(2, "0"))
        .join("")
    );
  }
  function getGradientPalette(start: string, end: string, steps: number): string[] {
    const rgbA = hexToRgb(start);
    const rgbB = hexToRgb(end);
    const palette: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = steps === 1 ? 0 : i / (steps - 1);
      const rgb = rgbA.map((a, idx) => Math.round(a + (rgbB[idx] - a) * t)) as [number, number, number];
      palette.push(rgbToHex(rgb));
    }
    return palette;
  }

  return (
    <div className="w-full min-h-screen relative">
      {/* Left Menu - Tiles */}
      <GameMenu side="left" triggerIcon={<GameIcon type="menu" />} onOpenChange={setLeftMenuOpen}>
        <div className="h-full flex flex-col">
          <GameSection title="Saved Tiles">
            <TileListVisual
              tiles={tiles.filter(t => !t.isComplex)}
              onLoadTile={handleLoadTile}
              onDeleteTile={deleteTile}
              currentTileId={currentTileId}
            />
          </GameSection>
        </div>
      </GameMenu>

      {/* Right Menu - Tools & Colors */}
      <GameMenu side="right" triggerIcon={<GameIcon type="palette" />} keyboardShortcut="b">
        {/* Tools Section */}
        <GameSection title="Tools">
          <div className="flex flex-row gap-2">
            <GameButton
              icon
              style={!floodFillMode && !boxMode && !brushMode ? { backgroundColor: 'var(--theme-accent)' } : {}}
              onClick={() => { setFloodFillMode(false); setBoxMode(false); setBrushMode(false); setBoxStart(null); }}
              title="Pencil (Draw)"
            >
              <GameIcon type="pencil" />
            </GameButton>
            <GameButton
              icon
              style={brushMode ? { backgroundColor: 'var(--theme-accent)' } : {}}
              onClick={() => { setBrushMode(true); setFloodFillMode(false); setBoxMode(false); setBoxStart(null); }}
              title="Brush (Blend)"
            >
              <GameIcon type="brush" />
            </GameButton>
            <GameButton
              icon
              style={floodFillMode ? { backgroundColor: 'var(--theme-accent)' } : {}}
              onClick={() => { setFloodFillMode(true); setBoxMode(false); setBrushMode(false); setBoxStart(null); }}
              title="Flood Fill (F)"
            >
              <GameIcon type="bucket" />
            </GameButton>
            <GameButton
              icon
              style={boxMode ? { backgroundColor: 'var(--theme-accent)' } : {}}
              onClick={() => { setBoxMode(true); setFloodFillMode(false); setBrushMode(false); setBoxStart(null); }}
              title="Box Fill"
            >
              <GameIcon type="grid" />
            </GameButton>
          </div>
        </GameSection>

        {/* Color Section */}
        <GameSection title="Color">
          <div className="flex flex-col gap-3">
            {/* Color Picker Row */}
            <div className="flex gap-2">
              <input 
                type="color" 
                value={color} 
                onChange={handleColorChange} 
                className="game-input flex-1 h-12 cursor-pointer"
              />
              <button
                onClick={() => setColor(BIN_COLOR)}
                title="Transparent / Eraser"
                className="border-2 border-black flex items-center justify-center"
                style={{ 
                  width: '48px',
                  height: '48px',
                  boxShadow: '2px 2px 0 #000',
                  backgroundColor: color === BIN_COLOR ? 'var(--theme-accent)' : 'var(--theme-bg-medium)'
                }}
              >
                <GameIcon type="eraser" />
              </button>
            </div>
            
            {/* Hex Input */}
            <div className="flex items-center gap-2 border-2 border-black px-2 py-1" style={{ backgroundColor: 'var(--theme-bg-medium)' }}>
              <label className="text-sm font-bold">Hex</label>
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  const hex = e.target.value.trim().toUpperCase();
                  // Allow typing # and partial hex codes
                  if (hex === '' || hex === '#' || /^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                    setHexInput(hex);
                    // Only update color if it's a valid 6-digit hex
                    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                      setColor(hex.toLowerCase());
                    }
                  }
                }}
                onBlur={() => {
                  // On blur, ensure the hex input shows the current valid color
                  if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
                    setHexInput(color.toUpperCase());
                  }
                }}
                placeholder="#000000"
                className="flex-1 bg-transparent outline-none font-mono text-sm"
              />
            </div>
          </div>
        </GameSection>

        {/* Gradient Section */}
        <GameSection title="Gradient">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
              <input 
                type="color" 
                value={gradientStart} 
                onChange={e => setGradientStart(e.target.value)} 
                className="game-input w-12 h-8" 
              />
              <span>→</span>
              <input 
                type="color" 
                value={gradientEnd} 
                onChange={e => setGradientEnd(e.target.value)} 
                className="game-input w-12 h-8" 
              />
              <div className="flex items-center gap-1">
                <GameButton onClick={() => setGradientSteps(s => Math.max(2, s - 1))}>-</GameButton>
                <span className="game-input px-2">{gradientSteps}</span>
                <GameButton onClick={() => setGradientSteps(s => Math.min(32, s + 1))}>+</GameButton>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {getGradientPalette(gradientStart, gradientEnd, gradientSteps).map((c: string, i: number) => (
                <GameButton
                  key={c + i}
                  icon
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
        </GameSection>

        {/* Pinned Colors */}
        {pinnedColors.length > 0 && (
          <GameSection title="Pinned">
            <div className="flex flex-wrap gap-1">
              {pinnedColors.map(c => (
                <div key={c} className="relative">
                  <GameButton
                    icon
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 border border-black flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--theme-bg-panel)' }}
                    onClick={() => handlePinColor(c)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </GameSection>
        )}

        {/* Recent Colors */}
        {recentColors.length > 0 && (
          <GameSection title="Recent">
            <div className="flex flex-wrap gap-1">
              {recentColors.map(c => (
                <div key={c} className="relative">
                  <GameButton
                    icon
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                  <button
                    className="absolute -top-1 -right-1 w-4 h-4 border border-black flex items-center justify-center text-xs"
                    style={{ backgroundColor: 'var(--theme-bg-panel)' }}
                    onClick={() => handlePinColor(c)}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          </GameSection>
        )}

      </GameMenu>

      {/* NavBar */}
      <NavBar 
        title="Tile Editor"
        rightActions={
          <>
            <GameButton onClick={() => fileInputRef.current?.click()}>
              Load Image
            </GameButton>
            <GameButton onClick={() => handleExport('png')}>
              Export PNG
            </GameButton>
            <GameButton onClick={() => handleExport('svg')}>
              Export SVG
            </GameButton>
            <GameButton onClick={handleClearBoard}>
              Clear Board
            </GameButton>
          </>
        }
      />

      {/* Main Canvas Area */}
      <div className="w-full h-screen pt-16 flex items-center justify-center">
        {/* Brush Depth Indicator - Only visible in brush mode */}
        {brushMode && (
          <div 
            className="absolute top-20 left-[280px] z-10 flex flex-col items-center"
          >
            <div className="bg-[var(--theme-bg-medium)] border-2 border-black px-2 py-1 mb-2 text-xs font-bold" style={{ boxShadow: '2px 2px 0 #000' }}>
              DEPTH
            </div>
            <div 
              className="relative bg-[var(--theme-bg-panel)] border-2 border-black" 
              style={{ 
                width: '40px', 
                height: '200px',
                boxShadow: '2px 2px 0 #000'
              }}
            >
              {/* Background gradient */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, var(--theme-accent), rgba(255,255,255,0.3))',
                  opacity: 0.3
                }}
              />
              
              {/* Current level indicator */}
              <div 
                className="absolute left-0 right-0 border-2 border-black transition-all duration-100"
                style={{ 
                  bottom: `${brushStrength * 100}%`,
                  height: '4px',
                  backgroundColor: 'var(--theme-accent)',
                  boxShadow: '0 0 8px var(--theme-accent)'
                }}
              />
              
              {/* Fill from bottom */}
              <div 
                className="absolute left-0 right-0 bottom-0 transition-all duration-100"
                style={{ 
                  height: `${brushStrength * 100}%`,
                  backgroundColor: 'var(--theme-accent)',
                  opacity: 0.6
                }}
              />
            </div>
            <div className="bg-[var(--theme-bg-medium)] border-2 border-black px-3 py-1 mt-2 text-xs font-bold text-center" style={{ boxShadow: '2px 2px 0 #000', minWidth: '60px' }}>
              {(() => {
                const level = Math.round(brushStrength * 12);
                // Simplify the fraction
                const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                const divisor = gcd(level, 12);
                return `${level / divisor}/${12 / divisor}`;
              })()}
            </div>
          </div>
        )}
        
        {/* Tile Info - Top Left */}
        <div className="absolute top-20 left-8 z-10 p-3 space-y-3 min-w-[240px] bg-[var(--theme-bg-medium)] border-2 border-black" style={{ boxShadow: '4px 4px 0 #000' }}>
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Tile Name</div>
            <input
              type="text"
              value={currentTileName}
              onChange={(e) => setCurrentTileName(e.target.value)}
              className="w-full px-2 py-1 text-sm border-2 border-black bg-[var(--theme-bg-panel)] outline-none focus:outline-none"
              style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)' }}
              placeholder="Enter tile name"
            />
          </div>
          
          <div>
            <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Grid Size</div>
            <select 
              value={gridSize} 
              onChange={handleGridSizeChange} 
              className="w-full px-2 py-1 text-sm border-2 border-black bg-[var(--theme-bg-panel)] outline-none cursor-pointer"
              style={{ boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.1)' }}
            >
              {GRID_SIZES.map(size => (
                <option key={size} value={size}>{size}x{size}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-2 border-t border-black/20">
            <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Modifiers</div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={rotateCounterClockwise}
                  className="flex-1 px-2 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                  title="Rotate Counter-Clockwise"
                >
                  ↺
                </button>
                <button
                  onClick={rotateClockwise}
                  className="flex-1 px-2 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                  title="Rotate Clockwise"
                >
                  ↻
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={flipHorizontal}
                  className="flex-1 px-2 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                  title="Flip Horizontal"
                >
                  ⇄
                </button>
                <button
                  onClick={flipVertical}
                  className="flex-1 px-2 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                  title="Flip Vertical"
                >
                  ⇅
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2 border-t border-black/20">
            <button
              onClick={handleSaveTile}
              className="flex-1 px-3 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
              style={{ boxShadow: '2px 2px 0 #000' }}
              title="Save (Ctrl+S)"
            >
              <div className="flex items-center justify-center gap-1">
                <GameIcon type="save" />
                Save
              </div>
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-3 py-1 text-xs border-2 border-black bg-[var(--theme-bg-light)] hover:bg-[var(--theme-accent)] transition-colors"
              style={{ boxShadow: '2px 2px 0 #000' }}
              title="New Tile (Ctrl+N)"
            >
              <div className="flex items-center justify-center gap-1">
                <GameIcon type="reset" />
                New
              </div>
            </button>
          </div>
          
          {/* Publish Section */}
          <div className="pt-2 border-t border-black/20">
            <div className="text-[10px] opacity-60 uppercase tracking-wide mb-2">Publish to Map Editor</div>
            
            <button
              onClick={handleTogglePublish}
              className={`w-full px-3 py-2 text-xs border-2 border-black transition-colors ${
                tiles.find(t => t.id === currentTileId)?.isPublished
                  ? 'bg-green-200 hover:bg-red-200'
                  : 'bg-[var(--theme-bg-light)] hover:bg-green-200'
              }`}
              style={{ boxShadow: '2px 2px 0 #000' }}
              title={tiles.find(t => t.id === currentTileId)?.isPublished ? 'Unpublish' : 'Publish'}
            >
              <div className="flex items-center justify-center gap-1 font-bold">
                {tiles.find(t => t.id === currentTileId)?.isPublished ? 'Published' : 'Publish'}
              </div>
            </button>
          </div>
          
          <div className="text-[10px] opacity-60 font-mono truncate pt-1 border-t border-black/20" title={currentTileId}>
            ID: {typeof currentTileId === 'string' ? currentTileId.substring(currentTileId.lastIndexOf('_') + 1) : currentTileId}
          </div>
        </div>

        <div className="relative flex flex-row items-center justify-center">
          {/* Main Canvas */}
          <div className="relative">

          {/* Canvas */}
          <div className="relative">
            {/* Fixed color tooltip */}
            {hoveredPixel && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-12 z-10 game-button whitespace-nowrap">
                {hoveredPixel.color === "rgba(0,0,0,0)" ? "TRANSPARENT" : hoveredPixel.color.toUpperCase()}
              </div>
            )}
            
            <div
              className="game-border"
              style={{
                backgroundColor: 'var(--theme-bg-panel)',
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(80vh, 80vw)',
                height: 'min(80vh, 80vw)',
                aspectRatio: '1/1',
                userSelect: "none",
              }}
              onMouseLeave={() => { 
                if (boxMode && boxStart && mouseDown) {
                  setBoxStart(null);
                }
                setMouseDown(false);
                setHoveredPixel(null); 
              }}
              onWheel={(e) => {
                if (brushMode) {
                  e.preventDefault();
                  // Accumulate scroll delta (respects scroll speed)
                  scrollAccumulatorRef.current += e.deltaY;
                  
                  // Change level based on accumulated scroll (60 pixels = 1 level)
                  const pixelsPerLevel = 60;
                  const levelChange = Math.floor(Math.abs(scrollAccumulatorRef.current) / pixelsPerLevel);
                  
                  if (levelChange > 0) {
                    const step = (1 / 12) * levelChange; // Can change multiple levels at once with fast scroll
                    const delta = scrollAccumulatorRef.current > 0 ? -step : step;
                    setBrushStrength(prev => Math.max(1/12, Math.min(1, prev + delta)));
                    // Remove the processed scroll amount
                    scrollAccumulatorRef.current = scrollAccumulatorRef.current % pixelsPerLevel * Math.sign(scrollAccumulatorRef.current);
                  }
                }
              }}
            >
              {grid.map((row, y) =>
                row.map((cell, x) => {
                  const isTransparent = cell === "rgba(0,0,0,0)";
                  const isHovered = hoveredPixel?.x === x && hoveredPixel?.y === y;
                  const previewColor = isHovered && brushMode ? blendColors(cell, color, brushStrength) : null;
                  
                  return (
                    <div
                      key={`${y}-${x}`}
                      className="border border-black/10 relative"
                      style={{ 
                        backgroundColor: previewColor || (isTransparent ? "#f0f0f0" : cell),
                        backgroundImage: isTransparent && !previewColor
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
                          : 'none',
                        cursor: boxMode ? 'crosshair' : floodFillMode ? 'crosshair' : brushMode ? 'cell' : 'pointer',
                        outline: boxMode && boxStart && mouseDown && 
                          x >= Math.min(boxStart.x, hoveredPixel?.x ?? boxStart.x) && 
                          x <= Math.max(boxStart.x, hoveredPixel?.x ?? boxStart.x) &&
                          y >= Math.min(boxStart.y, hoveredPixel?.y ?? boxStart.y) && 
                          y <= Math.max(boxStart.y, hoveredPixel?.y ?? boxStart.y)
                          ? '2px solid rgba(255, 100, 100, 0.8)' : 
                          (isHovered && brushMode ? `3px solid ${color}` : 'none'),
                        outlineOffset: '-2px',
                        transition: brushMode ? 'background-color 0.1s ease' : 'none'
                      }}
                      onMouseDown={() => handleMouseDown(y, x)}
                      onMouseEnter={() => { handleMouseEnter(y, x); setHoveredPixel({x, y, color: cell}); }}
                      onMouseLeave={() => setHoveredPixel(null)}
                      onMouseUp={() => handleMouseUp(y, x)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLoadTexture} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Preview - Fixed Bottom Left */}
      <div className="fixed bottom-8 left-8 z-10 flex flex-col gap-2">
        <div className="text-center text-sm px-3 py-1 border-2 border-black w-fit mx-auto" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '2px 2px 0 #000' }}>
          Preview
        </div>
        <div className="game-border p-2" style={{ backgroundColor: 'var(--theme-bg-panel)' }}>
          <PixelArtPreview grid={grid} gridSize={gridSize} windowPos={board.window} />
        </div>
      </div>
      
      {/* Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
