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

  // Directional indicators for when center is out of view
  const showLeftArrow = centerInWindow.x < 0;
  const showRightArrow = centerInWindow.x >= gridSize;
  const showUpArrow = centerInWindow.y < 0;
  const showDownArrow = centerInWindow.y >= gridSize;

  return (
    <div style={{ width: gridSize * scale, height: gridSize * scale, margin: '0 auto', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: gridSize * scale, height: gridSize * scale, display: 'block', imageRendering: 'pixelated' }}
      />
      
      {/* Directional arrows when center is out of view */}
      {showLeftArrow && (
        <div style={{
          position: 'absolute',
          left: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}>
            <path d="M10 2 L4 8 L10 14" fill="none" stroke="rgba(0, 0, 0, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      
      {showRightArrow && (
        <div style={{
          position: 'absolute',
          right: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}>
            <path d="M6 2 L12 8 L6 14" fill="none" stroke="rgba(0, 0, 0, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      
      {showUpArrow && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '4px',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}>
            <path d="M2 10 L8 4 L14 10" fill="none" stroke="rgba(0, 0, 0, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      
      {showDownArrow && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '4px',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))' }}>
            <path d="M2 6 L8 12 L14 6" fill="none" stroke="rgba(0, 0, 0, 1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};
