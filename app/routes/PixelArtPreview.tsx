import React from "react";

interface PixelArtPreviewProps {
  grid: string[][];
  gridSize: number;
}

export const PixelArtPreview: React.FC<PixelArtPreviewProps> = ({ grid, gridSize }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scale = Math.max(8, Math.floor(192 / gridSize));

  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.width = gridSize;
    el.height = gridSize;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    
    // Checkerboard pattern for transparency
    function drawChecker(x: number, y: number) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#bbb' : '#eee';
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Draw only the tile (window view)
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const color = grid[y]?.[x] || "rgba(0,0,0,0)";
        if (color === "rgba(0,0,0,0)") {
          drawChecker(x, y);
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    
    el.style.imageRendering = 'pixelated';
  }, [grid, gridSize]);

  return (
    <div style={{ width: gridSize * scale, height: gridSize * scale, margin: '0 auto' }}>
      <canvas
        ref={canvasRef}
        style={{ width: gridSize * scale, height: gridSize * scale, display: 'block', imageRendering: 'pixelated' }}
      />
    </div>
  );
};
