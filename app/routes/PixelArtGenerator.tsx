import React, { useRef, useState, useEffect, useCallback } from "react";
import { PixelArtPreview } from "./PixelArtPreview";
import { Board } from "./Board";
import { KeyboardTrigger } from "../utils/KeyboardTrigger";

const GRID_SIZES = [8, 16, 32, 64];

export default function PixelArtGenerator() {
  const [gridSize, setGridSize] = useState(16);
  const [board, setBoard] = useState(() => new Board(16));
  const [grid, setGrid] = useState(() => board.getWindow());
  const [color, setColor] = useState("#000000");
  const [mouseDown, setMouseDown] = useState(false);
  const [undoStack, setUndoStack] = useState<Board[]>([]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [pinnedColors, setPinnedColors] = useState<string[]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number, color: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const BIN_COLOR = "rgba(0,0,0,0)";

  // Gradient state
  const [gradientStart, setGradientStart] = useState("#000000");
  const [gradientEnd, setGradientEnd] = useState("#ffffff");
  const [gradientSteps, setGradientSteps] = useState(5);

  // Track last two uploads
  const [lastUploads, setLastUploads] = useState<string[]>([]);

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
    setGrid(newBoard.getWindow());
  }, [board]);

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
    ]);

    keyboard.start();

    // Cleanup on unmount
    return () => {
      keyboard.destroy();
    };
  }, [shiftWindow]); // Re-register when shiftWindow changes

  // Helper to update grid from board
  function syncGrid(b: Board) {
    setGrid(b.getWindow());
  }

  // Handle grid size change
  function handleGridSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = parseInt(e.target.value);
    const newBoard = new Board(size);
    setGridSize(size);
    setBoard(newBoard);
    setGrid(newBoard.getWindow());
    setUndoStack([]);
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
    const newBoard = new Board(board.size);
    newBoard.data = board.getVirtualGrid();
    newBoard.window = { ...board.window };
    newBoard.setPixel(row, col, color);
    setBoard(newBoard);
    setGrid(newBoard.getWindow());
    addRecentColor(color);
  }

  // Mouse events for drawing
  function handleMouseDown(row: number, col: number) {
    setMouseDown(true);
    handlePixelAction(row, col);
  }
  function handleMouseEnter(row: number, col: number) {
    if (mouseDown) handlePixelAction(row, col);
  }
  function handleMouseUp() {
    setMouseDown(false);
  }

  // Pin/unpin color
  function handlePinColor(pinColor: string) {
    setPinnedColors(prev => prev.includes(pinColor) ? prev.filter(c => c !== pinColor) : [pinColor, ...prev]);
  }

  // Undo
  function handleUndo() {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setBoard(prev);
      setGrid(prev.getWindow());
      return stack.slice(0, -1);
    });
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
      setGrid(newBoard.getWindow());
    };
    img.src = url!;
  }

  // Reset grid: center window and clear colors
  function handleReset() {
    const newBoard = new Board(gridSize);
    newBoard.centerWindow();
    setBoard(newBoard);
    setGrid(newBoard.getWindow());
    setUndoStack([]);
  }

  // Export as PNG
  function handleExport() {
    const size = gridSize;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x, y, 1, 1);
      }
    }
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pixel-art-${size}x${size}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
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
    <div className="flex flex-col items-center w-full min-h-screen bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 p-4 gap-8 overflow-hidden">
      {/* Preview at the top, outside the control panel */}
      <div className="mb-6">
        <div className="font-bold mb-1 text-black text-center">Preview</div>
        <PixelArtPreview virtualGrid={board.getVirtualGrid()} gridSize={gridSize} windowPos={board.window} />
      </div>
      <div className="flex flex-row items-start justify-center w-full gap-8">
        {/* Grid on the left */}
        <div className="flex-1 flex items-center justify-center min-w-0 min-h-0">
          <div
            className="grid bg-gray-200 shadow-xl rounded-lg border-4 border-blue-400 relative"
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              width: 'min(80vh, 80vw)',
              height: 'min(80vh, 80vw)',
              aspectRatio: '1/1',
              userSelect: "none",
              backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb 0 10px, #f3f4f6 10px 20px)',
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredPixel(null); }}
          >
            {grid.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className="border border-gray-400 cursor-pointer relative group"
                  style={{ backgroundColor: cell === "rgba(0,0,0,0)" ? "transparent" : cell }}
                  onMouseDown={() => handleMouseDown(y, x)}
                  onMouseEnter={() => { handleMouseEnter(y, x); setHoveredPixel({x, y, color: cell}); }}
                  onMouseLeave={() => setHoveredPixel(null)}
                >
                  {/* Show color hex on hover */}
                  {hoveredPixel && hoveredPixel.x === x && hoveredPixel.y === y && (
                    <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-10 px-2 py-1 rounded bg-black text-white text-xs shadow-lg border border-white whitespace-nowrap">
                      {cell === "rgba(0,0,0,0)" ? "TRANSPARENT" : cell.toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        {/* Controls on the right - just the control panel */}
        <div className={`flex flex-col gap-4 w-[320px] p-4 bg-white/90 rounded-xl shadow-2xl border-2 border-blue-300 text-black min-h-0 overflow-y-auto max-h-[480px]`}>
          {/* Quick upload buttons for last two uploads */}
          {lastUploads.length > 0 && (
            <div>
              <div className="font-bold mb-1 text-black">Recent Uploads</div>
              <div className="flex gap-2">
                {lastUploads.map((url, i) => (
                  <button key={url} className="px-2 py-1 bg-gray-200 rounded border border-blue-300 text-xs" onClick={() => handleLoadTexture(url)}>
                    Upload #{i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Color and Gradient controls */}
          <div>
            <label className="font-bold block mb-1 text-black">Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={color} onChange={handleColorChange} className="w-full h-12 p-0 border-2 border-blue-300 rounded cursor-pointer bg-white" />
              <button
                type="button"
                className={`w-12 h-12 flex items-center justify-center border-2 rounded border-gray-400 bg-white hover:bg-gray-200 transition ${color === BIN_COLOR ? 'ring-2 ring-yellow-500' : ''}`}
                title="Transparent (Bin)"
                onClick={() => setColor(BIN_COLOR)}
              >
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <rect width="24" height="24" rx="6" fill="#eee"/>
                  <path d="M7 7l10 10M17 7L7 17" stroke="#888" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="font-bold block mb-1 text-black">Gradient Palette</label>
            <div className="flex gap-2 items-center mb-2">
              <input type="color" value={gradientStart} onChange={e => setGradientStart(e.target.value)} className="w-8 h-8 border-2 border-blue-300 rounded" title="Gradient Start" />
              <span className="text-gray-500">→</span>
              <input type="color" value={gradientEnd} onChange={e => setGradientEnd(e.target.value)} className="w-8 h-8 border-2 border-blue-300 rounded" title="Gradient End" />
              <div className="flex items-center ml-4">
                <button type="button" className="px-2 py-1 border rounded-l bg-gray-100 border-blue-300 text-lg font-bold" onClick={() => setGradientSteps(s => Math.max(2, s - 1))}>-</button>
                <span className="px-2 border-t border-b border-blue-300 bg-white">{gradientSteps}</span>
                <button type="button" className="px-2 py-1 border rounded-r bg-gray-100 border-blue-300 text-lg font-bold" onClick={() => setGradientSteps(s => Math.min(32, s + 1))}>+</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getGradientPalette(gradientStart, gradientEnd, gradientSteps).map((c: string, i: number) => (
                <button
                  key={c + i}
                  className="w-8 h-8 rounded border-2 border-blue-400 flex items-center justify-center hover:scale-110 transition"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </div>
          {/* Grid size, pins, recents, actions */}
          <div>
            <label className="font-bold block mb-1 text-black">Grid Size</label>
            <select value={gridSize} onChange={handleGridSizeChange} className="border-2 border-blue-300 rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-400 text-black bg-white">
              {GRID_SIZES.map(size => (
                <option key={size} value={size} className="text-black bg-white">{size}x{size}</option>
              ))}
            </select>
          </div>
          {/* Pinned Colors */}
          {pinnedColors.length > 0 && (
            <div>
              <div className="font-bold mb-1 text-black">Pinned Colors</div>
              <div className="flex flex-wrap gap-2">
                {pinnedColors.map((c, i) => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded border-2 border-pink-400 flex items-center justify-center relative group"
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  >
                    <span
                      className="absolute -top-2 -right-2 bg-white text-pink-600 rounded-full px-1 text-xs border border-pink-400 cursor-pointer group-hover:scale-110 transition"
                      onClick={e => { e.stopPropagation(); handlePinColor(c); }}
                    >×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div>
              <div className="font-bold mb-1 text-black">Recent Colors</div>
              <div className="flex flex-wrap gap-2">
                {recentColors.map((c, i) => (
                  <button
                    key={c}
                    className="w-8 h-8 rounded border-2 border-yellow-400 flex items-center justify-center relative group"
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    title={c}
                  >
                    <span
                      className="absolute -top-2 -right-2 bg-white text-yellow-600 rounded-full px-1 text-xs border border-yellow-400 cursor-pointer group-hover:scale-110 transition"
                      onClick={e => { e.stopPropagation(); handlePinColor(c); }}
                    >★</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleUndo} className="px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold border-2 border-red-700">Undo</button>
          <button onClick={handleExport} className="px-2 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold border-2 border-blue-700">Export PNG</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-2 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold border-2 border-green-700">Load Texture</button>
          <button onClick={handleReset} className="px-2 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-500 font-semibold border-2 border-yellow-600">Reset</button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLoadTexture} className="hidden" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
