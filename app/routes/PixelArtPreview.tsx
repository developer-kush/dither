import React from "react";

interface PixelArtPreviewProps {
  virtualGrid: string[][];
  gridSize: number;
  windowPos: { x: number; y: number };
}

export const PixelArtPreview: React.FC<PixelArtPreviewProps> = ({ virtualGrid, gridSize, windowPos }) => {
  const virtualSize = virtualGrid.length;
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scale = Math.max(8, Math.floor(384 / virtualSize));

  React.useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.width = virtualSize;
    el.height = virtualSize;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    // Fill background black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, virtualSize, virtualSize);
    // Draw all cells
    for (let y = 0; y < virtualSize; y++) {
      for (let x = 0; x < virtualSize; x++) {
        const inWindow =
          y >= windowPos.y && y < windowPos.y + gridSize &&
          x >= windowPos.x && x < windowPos.x + gridSize;
        const color = virtualGrid[y][x];
        if (color === "rgba(0,0,0,0)") continue;
        ctx.globalAlpha = inWindow ? 1.0 : 0.5;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1.0;
    el.style.imageRendering = 'pixelated';
  }, [virtualGrid, gridSize, windowPos, virtualSize]);

  // Always show the full virtual grid, scrollable if needed
  return (
    <div style={{ width: Math.min(virtualSize * scale, 384), height: Math.min(virtualSize * scale, 384), overflow: 'auto', margin: '0 auto', background: '#000', borderRadius: 8, border: '2px solid #222' }}>
      <canvas
        ref={canvasRef}
        style={{ width: virtualSize * scale, height: virtualSize * scale, display: 'block', background: '#000', borderRadius: 8 }}
      />
    </div>
  );
};
