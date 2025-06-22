import React, { useRef, useState } from "react";

const GRID_SIZES = [8, 16, 32, 64];

function getEmptyGrid(size: number) {
  return Array.from({ length: size }, () => Array(size).fill("rgba(0,0,0,0)"));
}

function cloneGrid(grid: string[][]) {
  return grid.map(row => [...row]);
}

export default function PixelArtGenerator() {
  const [gridSize, setGridSize] = useState(16);
  const [grid, setGrid] = useState(() => getEmptyGrid(16));
  const [color, setColor] = useState("#000000");
  const [mouseDown, setMouseDown] = useState(false);
  const [undoStack, setUndoStack] = useState<string[][][]>([]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [pinnedColors, setPinnedColors] = useState<string[]>([]);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number, color: string} | null>(null);
  const [lastTexture, setLastTexture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Add a 'bin' color for transparency
  const BIN_COLOR = "rgba(0,0,0,0)";

  // Gradient state
  const [gradientStart, setGradientStart] = useState("#000000");
  const [gradientEnd, setGradientEnd] = useState("#ffffff");
  const [gradientSteps, setGradientSteps] = useState(5);

  // Buffer size for each edge
  const BUFFER_SIZE = 8;
  // Virtual grid size
  const virtualSize = gridSize + 2 * BUFFER_SIZE;
  // The virtual grid: buffer + image + buffer
  const [virtualGrid, setVirtualGrid] = useState(() => getEmptyGrid(virtualSize));
  // The visible area is always at (BUFFER_SIZE, BUFFER_SIZE)

  // Sync virtual grid when grid or gridSize changes
  React.useEffect(() => {
    const newVirtual = getEmptyGrid(virtualSize);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        newVirtual[y + BUFFER_SIZE][x + BUFFER_SIZE] = grid[y][x];
      }
    }
    setVirtualGrid(newVirtual);
  }, [grid, gridSize]);

  // Helper to update grid from virtualGrid
  function updateGridFromVirtual(vg: string[][]) {
    const newGrid = getEmptyGrid(gridSize);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        newGrid[y][x] = vg[y + BUFFER_SIZE][x + BUFFER_SIZE];
      }
    }
    setGrid(newGrid);
  }

  // Handle grid size change
  function handleGridSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const size = parseInt(e.target.value);
    setGridSize(size);
    setGrid(getEmptyGrid(size));
    setUndoStack([]);
  }

  // Handle color change
  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    setColor(e.target.value);
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
    setUndoStack(stack => [...stack, cloneGrid(grid)]);
    setGrid(prev => {
      const newGrid = cloneGrid(prev);
      newGrid[row][col] = color;
      return newGrid;
    });
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
      setGrid(prev);
      return stack.slice(0, -1);
    });
  }

  // Load image
  function handleLoadTexture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    img.onload = () => {
      // Determine the best grid size for the image
      const { width, height } = img;
      let bestSize = GRID_SIZES.find(s => s === width && s === height);
      if (!bestSize) {
        // If not exact, pick the closest allowed size
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
      const newGrid = [];
      for (let y = 0; y < size; y++) {
        const row = [];
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const r = imageData[idx];
          const g = imageData[idx + 1];
          const b = imageData[idx + 2];
          const a = imageData[idx + 3];
          if (a === 0) {
            row.push("rgba(0,0,0,0)"); // transparent
          } else {
            row.push(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
          }
        }
        newGrid.push(row);
      }
      setUndoStack([]);
      setGrid(newGrid);
      setLastTexture(URL.createObjectURL(file));
    };
    img.src = URL.createObjectURL(file);
  }

  // Reset grid to white or last texture
  function handleReset() {
    if (lastTexture) {
      const img = new window.Image();
      img.onload = () => {
        const size = gridSize;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;
        const newGrid = [];
        for (let y = 0; y < size; y++) {
          const row = [];
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = imageData[idx];
            const g = imageData[idx + 1];
            const b = imageData[idx + 2];
            const a = imageData[idx + 3];
            if (a === 0) {
              row.push("rgba(0,0,0,0)");
            } else {
              row.push(`#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`);
            }
          }
          newGrid.push(row);
        }
        setUndoStack([]);
        setGrid(newGrid);
      };
      img.src = lastTexture;
    } else {
      setUndoStack([]);
      setGrid(getEmptyGrid(gridSize));
    }
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

  // Shift logic: move the visible window in the virtual grid
  function shiftGrid(direction: 'up' | 'down' | 'left' | 'right') {
    setUndoStack(stack => [...stack, cloneGrid(grid)]);
    setVirtualGrid(prev => {
      const vg = cloneGrid(prev);
      if (direction === 'up') {
        // Only allow if not at top buffer
        if (vg[BUFFER_SIZE - 1].slice(BUFFER_SIZE, BUFFER_SIZE + gridSize).some(c => c !== BIN_COLOR)) {
          return prev;
        }
        for (let y = BUFFER_SIZE - 1; y < BUFFER_SIZE + gridSize - 1; y++) {
          for (let x = BUFFER_SIZE; x < BUFFER_SIZE + gridSize; x++) {
            vg[y][x] = vg[y + 1][x];
          }
        }
        for (let x = BUFFER_SIZE; x < BUFFER_SIZE + gridSize; x++) {
          vg[BUFFER_SIZE + gridSize - 1][x] = BIN_COLOR;
        }
      } else if (direction === 'down') {
        if (vg[BUFFER_SIZE + gridSize].slice(BUFFER_SIZE, BUFFER_SIZE + gridSize).some(c => c !== BIN_COLOR)) {
          return prev;
        }
        for (let y = BUFFER_SIZE + gridSize; y > BUFFER_SIZE; y--) {
          for (let x = BUFFER_SIZE; x < BUFFER_SIZE + gridSize; x++) {
            vg[y][x] = vg[y - 1][x];
          }
        }
        for (let x = BUFFER_SIZE; x < BUFFER_SIZE + gridSize; x++) {
          vg[BUFFER_SIZE][x] = BIN_COLOR;
        }
      } else if (direction === 'left') {
        for (let y = BUFFER_SIZE; y < BUFFER_SIZE + gridSize; y++) {
          if (vg[y][BUFFER_SIZE - 1] !== BIN_COLOR) {
            return prev;
          }
        }
        for (let y = BUFFER_SIZE; y < BUFFER_SIZE + gridSize; y++) {
          for (let x = BUFFER_SIZE - 1; x < BUFFER_SIZE + gridSize - 1; x++) {
            vg[y][x] = vg[y][x + 1];
          }
          vg[y][BUFFER_SIZE + gridSize - 1] = BIN_COLOR;
        }
      } else if (direction === 'right') {
        for (let y = BUFFER_SIZE; y < BUFFER_SIZE + gridSize; y++) {
          if (vg[y][BUFFER_SIZE + gridSize] !== BIN_COLOR) {
            return prev;
          }
        }
        for (let y = BUFFER_SIZE; y < BUFFER_SIZE + gridSize; y++) {
          for (let x = BUFFER_SIZE + gridSize; x > BUFFER_SIZE; x--) {
            vg[y][x] = vg[y][x - 1];
          }
          vg[y][BUFFER_SIZE] = BIN_COLOR;
        }
      }
      // Update the main grid for editing
      setTimeout(() => updateGridFromVirtual(vg), 0);
      return vg;
    });
  }

  // When editing, always update the virtual grid's visible area
  React.useEffect(() => {
    setVirtualGrid(prev => {
      const vg = cloneGrid(prev);
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          vg[y + BUFFER_SIZE][x + BUFFER_SIZE] = grid[y][x];
        }
      }
      return vg;
    });
  }, [grid]);

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
    <div className="flex flex-row items-start justify-center w-full min-h-screen bg-gradient-to-br from-blue-100 via-pink-100 to-yellow-100 p-4 gap-8">
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
      {/* Controls on the right - now split into two columns */}
      <div className={`flex flex-row gap-4 w-[36rem] p-6 bg-white/90 rounded-xl shadow-2xl border-2 border-blue-300 text-black`}>
        {/* Left column: Color, Gradient, Shift */}
        <div className="flex flex-col gap-6 w-1/2">
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
          {/* Gradient Palette */}
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
          {/* Shift Controls - moved to left column */}
          <div>
            <label className="font-bold block mb-1 text-black">Shift Pixels</label>
            <div className="flex flex-row gap-2 justify-center mt-2">
              <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => shiftGrid('left')} title="Shift Left">←</button>
              <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => shiftGrid('up')} title="Shift Up">↑</button>
              <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => shiftGrid('down')} title="Shift Down">↓</button>
              <button type="button" className="p-2 rounded bg-gray-100 border border-blue-300 hover:bg-blue-200" onClick={() => shiftGrid('right')} title="Shift Right">→</button>
            </div>
          </div>
        </div>
        {/* Right column: Grid size, pins, recents, actions, preview */}
        <div className="flex flex-col gap-6 w-1/2">
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
          {/* Preview */}
          <div className="mt-4">
            <div className="font-bold mb-1 text-black">Preview</div>
            <canvas
              ref={el => {
                if (!el) return;
                const size = virtualSize;
                el.width = size;
                el.height = size;
                const ctx = el.getContext("2d");
                if (!ctx) return;
                // Draw dimmed buffer
                for (let y = 0; y < size; y++) {
                  for (let x = 0; x < size; x++) {
                    ctx.fillStyle = virtualGrid[y][x] === BIN_COLOR ? '#eee' : virtualGrid[y][x] + '80';
                    ctx.fillRect(x, y, 1, 1);
                  }
                }
                // Draw visible area (not dimmed)
                for (let y = 0; y < gridSize; y++) {
                  for (let x = 0; x < gridSize; x++) {
                    ctx.fillStyle = virtualGrid[y + BUFFER_SIZE][x + BUFFER_SIZE];
                    ctx.fillRect(x + BUFFER_SIZE, y + BUFFER_SIZE, 1, 1);
                  }
                }
                // Outline visible area
                ctx.save();
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 2;
                ctx.strokeRect(BUFFER_SIZE - 1 + 0.5, BUFFER_SIZE - 1 + 0.5, gridSize + 1, gridSize + 1);
                ctx.restore();
                // Upscale preview
                el.style.width = '384px';
                el.style.height = '384px';
                el.style.imageRendering = 'pixelated';
              }}
              style={{ width: 384, height: 384, border: '2px solid #bbb', background: '#fff', borderRadius: 8, imageRendering: 'pixelated' }}
              className="block mx-auto"
            />
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
