import React, { useRef, useState, useEffect, useCallback } from "react";
import { PixelArtPreview } from "./PixelArtPreview";
import { Board } from "./Board";
import { KeyboardTrigger } from "../utils/KeyboardTrigger";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { usePersistentBoard } from "../hooks/usePersistentBoard";
import { GameMenu } from "../components/GameMenu";
import { GameSection } from "../components/GameSection";
import { GameButton } from "../components/GameButton";
import { GameIcon } from "../components/GameIcon";
import { NavBar } from "../components/NavBar";
import { floodFill } from "../utils/floodFill";

const GRID_SIZES = [8, 16, 32, 64];

export default function PixelArtGenerator() {
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const BIN_COLOR = "rgba(0,0,0,0)";

  // Sync grid with board whenever board changes
  useEffect(() => {
    setGrid(board.getWindow());
  }, [board]);

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
    const keyboard = new KeyboardTrigger();
    
    // Register arrow keys and WASD for shifting
    keyboard.registerMultiple([
      {
        keys: ['ArrowUp', 'w', 'W'],
        handler: () => shiftWindow('up'),
        description: 'Shift viewport up',
      },
      {
        keys: ['ArrowDown', 's', 'S'],
        handler: () => shiftWindow('down'),
        description: 'Shift viewport down',
      },
      {
        keys: ['ArrowLeft', 'a', 'A'],
        handler: () => shiftWindow('left'),
        description: 'Shift viewport left',
      },
      {
        keys: ['ArrowRight', 'd', 'D'],
        handler: () => shiftWindow('right'),
        description: 'Shift viewport right',
      },
      {
        keys: ['f', 'F'],
        handler: () => setFloodFillMode(prev => !prev),
        description: 'Toggle flood fill mode',
      },
    ]);

    // Register undo/redo shortcuts
    keyboard.register(
      ['z', 'Z'],
      handleUndo,
      { 
        ctrlKey: true, 
        shiftKey: false,
        description: 'Undo last action' 
      }
    );
    
    keyboard.register(
      ['z', 'Z'],
      handleRedo,
      { 
        ctrlKey: true, 
        shiftKey: true,
        description: 'Redo last action' 
      }
    );

    keyboard.start();

    // Cleanup on unmount
    return () => {
      keyboard.destroy();
    };
  }, [shiftWindow, handleUndo, handleRedo]); // Re-register when dependencies change

  // Handle grid size change
  function handleGridSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = parseInt(e.target.value);
    const newBoard = new Board(size);
    setGridSize(size);
    setBoard(newBoard);
    setUndoStack([]);
    setRedoStack([]);
  }

  // Add color to recent colors (if not already present, and not transparent)
  function addRecentColor(newColor: string) {
    if (newColor === "rgba(0,0,0,0)" || newColor === "#ffffff") return;
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== newColor);
      return [newColor, ...filtered].slice(0, 20);
    });
  }

  // Handle pixel coloring (add color to recents)
  function handlePixelAction(row: number, col: number) {
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
    } else {
      // Normal pixel coloring
    newBoard.setPixel(row, col, color);
    }
    
    setBoard(newBoard);
    addRecentColor(color);
  }

  // Mouse events for drawing
  function handleMouseDown(row: number, col: number) {
    setMouseDown(true);
    handlePixelAction(row, col);
  }
  function handleMouseEnter(row: number, col: number) {
    // Only allow dragging in normal mode, not flood fill mode
    if (mouseDown && !floodFillMode) handlePixelAction(row, col);
  }
  function handleMouseUp() {
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

  // Reset grid: center window and clear colors
  function handleReset() {
    const newBoard = new Board(gridSize);
    newBoard.centerWindow();
    setBoard(newBoard);
    setUndoStack([]);
    setRedoStack([]);
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
      <GameMenu side="left" triggerIcon={<GameIcon type="menu" />}>
        <div className="h-full">
          {/* Empty for now */}
        </div>
      </GameMenu>

      {/* Right Menu - Tools & Colors */}
      <GameMenu side="right" triggerIcon={<GameIcon type="palette" />} keyboardShortcut="b">
        {/* Tools Section */}
        <GameSection title="Tools">
          <div className="flex flex-col gap-2">
            <GameButton
              icon
              className={floodFillMode ? 'bg-[#7ac07a]' : ''}
              onClick={() => setFloodFillMode(prev => !prev)}
              title="Flood Fill (F)"
            >
              <GameIcon type={floodFillMode ? 'bucket' : 'pencil'} />
            </GameButton>
          </div>
        </GameSection>

        {/* Color Section */}
        <GameSection title="Color">
          <div className="flex flex-col gap-2">
            <input 
              type="color" 
              value={color} 
              onChange={handleColorChange} 
              className="game-input w-full h-12"
            />
            <GameButton
              icon
              className={color === BIN_COLOR ? 'bg-[#7ac07a]' : ''}
              onClick={() => setColor(BIN_COLOR)}
              title="Transparent"
            >
              <GameIcon type="eraser" />
            </GameButton>
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
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#e8f4e8] border border-black rounded-sm flex items-center justify-center text-xs"
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
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#e8f4e8] border border-black rounded-sm flex items-center justify-center text-xs"
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
        onExport={handleExport}
        onReset={handleReset}
        onLoadClick={() => fileInputRef.current?.click()}
      />

      {/* Main Canvas Area */}
      <div className="w-full h-screen pt-16 flex items-center justify-center">
        <div className="relative flex flex-row items-center gap-8">
          {/* Preview */}
          <div className="flex flex-col gap-2">
            <div className="text-center text-sm px-3 py-1 bg-[#c2e4c2] border-2 border-black w-fit mx-auto" style={{ boxShadow: '2px 2px 0 #000' }}>
              Preview
            </div>
            <div className="game-border bg-[#e8f4e8] p-2">
              <PixelArtPreview virtualGrid={board.getVirtualGrid()} gridSize={gridSize} windowPos={board.window} />
            </div>
          </div>

          {/* Main Canvas */}
          <div className="relative">

          {/* Canvas */}
          <div className="relative">
            <div
              className="game-border bg-[#e8f4e8]"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
                width: 'min(80vh, 80vw)',
                height: 'min(80vh, 80vw)',
                aspectRatio: '1/1',
                userSelect: "none",
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setHoveredPixel(null); }}
            >
              {grid.map((row, y) =>
                row.map((cell, x) => (
                  <div
                    key={`${y}-${x}`}
                    className="border border-black/10"
                    style={{ 
                      backgroundColor: cell === "rgba(0,0,0,0)" ? "transparent" : cell,
                      cursor: floodFillMode ? 'crosshair' : 'pointer'
                    }}
                    onMouseDown={() => handleMouseDown(y, x)}
                    onMouseEnter={() => { handleMouseEnter(y, x); setHoveredPixel({x, y, color: cell}); }}
                    onMouseLeave={() => setHoveredPixel(null)}
                  >
                    {hoveredPixel && hoveredPixel.x === x && hoveredPixel.y === y && (
                      <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 game-button whitespace-nowrap">
                        {cell === "rgba(0,0,0,0)" ? "TRANSPARENT" : cell.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {/* Grid Size Selector */}
            <div className="absolute right-[5%] top-[calc(100%-1px)] -translate-y-1/2 z-10">
              <div className="game-button whitespace-nowrap">
                <select 
                  value={gridSize} 
                  onChange={handleGridSizeChange} 
                  className="bg-transparent border-none outline-none cursor-pointer"
                >
                  {GRID_SIZES.map(size => (
                    <option key={size} value={size}>{size}x{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLoadTexture} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
