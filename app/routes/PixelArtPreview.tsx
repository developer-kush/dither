import React from "react";

interface PixelArtPreviewProps {
  grid: string[][];
  gridSize: number;
  windowPos?: { x: number; y: number };
}

export const PixelArtPreview: React.FC<PixelArtPreviewProps> = ({ grid, gridSize, windowPos }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const scale = Math.max(8, Math.floor(192 / gridSize));
  
  // Calculate where the center of the virtual board is relative to the current window
  const virtualBoardCenter = gridSize * 1.5; // Center of 3x grid
  const centerInWindow = windowPos ? {
    x: virtualBoardCenter - windowPos.x,
    y: virtualBoardCenter - windowPos.y
  } : { x: gridSize / 2, y: gridSize / 2 };

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

  // Check if center is visible in current window
  const centerVisible = centerInWindow.x >= 0 && centerInWindow.x < gridSize && 
                        centerInWindow.y >= 0 && centerInWindow.y < gridSize;

  return (
    <div style={{ width: gridSize * scale, height: gridSize * scale, margin: '0 auto', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: gridSize * scale, height: gridSize * scale, display: 'block', imageRendering: 'pixelated' }}
      />
      {/* Center indicator - shows where the center of the full virtual board is */}
      {centerVisible && (
        <div 
          style={{ 
            position: 'absolute',
            left: `${(centerInWindow.x / gridSize) * 100}%`,
            top: `${(centerInWindow.y / gridSize) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '2px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {/* Horizontal line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${Math.min(gridSize * scale * 0.15, 16)}px`,
            height: '2px',
            backgroundColor: 'rgba(255, 50, 50, 0.9)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.9)'
          }} />
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: `${Math.min(gridSize * scale * 0.15, 16)}px`,
            backgroundColor: 'rgba(255, 50, 50, 0.9)',
            boxShadow: '0 0 3px rgba(0, 0, 0, 0.9)'
          }} />
          {/* Center dot */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 50, 50, 1)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 0 4px rgba(0, 0, 0, 1)'
          }} />
        </div>
      )}
    </div>
  );
};
