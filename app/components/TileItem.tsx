import React, { useRef, useEffect, useState } from "react";
import { FilmIcon, Squares2X2Icon } from "@heroicons/react/24/solid";
import type { Tile } from "../hooks/useTiles";

interface TileItemProps {
  tile: Tile;
  onClick?: () => void;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showTypeIcon?: boolean;
  getTile?: (id: string) => Tile | undefined;
  className?: string;
  style?: React.CSSProperties;
}

export function TileItem({
  tile,
  onClick,
  selected = false,
  size = 'medium',
  showName = true,
  showTypeIcon = true,
  getTile,
  className = '',
  style = {}
}: TileItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Size mappings
  const sizeMap = {
    small: { container: '80px', padding: 'p-1.5' },
    medium: { container: '100px', padding: 'p-2' },
    large: { container: '120px', padding: 'p-3' }
  };

  const { container: containerSize, padding } = sizeMap[size];

  // Animation for animated tiles
  useEffect(() => {
    if (!tile.isComplex || !tile.animationFrames || !getTile) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex(prev => (prev + 1) % (tile.animationFrames?.length || 1));
    }, 1000 / (tile.animationFps || 10));

    return () => clearInterval(interval);
  }, [tile.isComplex, tile.animationFrames, tile.animationFps, getTile]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // For animated tiles
    if (tile.isComplex && tile.animationFrames && getTile) {
      const frameId = tile.animationFrames[currentFrameIndex];
      const frameTile = getTile(frameId);
      if (!frameTile) return;

      canvas.width = frameTile.size;
      canvas.height = frameTile.size;

      for (let y = 0; y < frameTile.size; y++) {
        for (let x = 0; x < frameTile.size; x++) {
          const color = frameTile.grid[y]?.[x] || 'rgba(0,0,0,0)';
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    } else {
      // For basic tiles
      canvas.width = tile.size;
      canvas.height = tile.size;

      for (let y = 0; y < tile.size; y++) {
        for (let x = 0; x < tile.size; x++) {
          const color = tile.grid[y]?.[x] || 'rgba(0,0,0,0)';
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }, [tile, currentFrameIndex, getTile]);

  // Get type icon
  const getTypeIcon = () => {
    if (!showTypeIcon || !tile.isComplex) return null;

    if (tile.animationFrames) {
      return <FilmIcon className="w-4 h-4 text-yellow-600" />;
    }
    
    // For composite tiles (future)
    return <Squares2X2Icon className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div
      className={`relative border-2 border-black ${padding} cursor-pointer transition-all hover:scale-105 ${
        selected ? 'ring-4 ring-blue-500' : ''
      } ${className}`}
      style={{
        width: containerSize,
        height: showName ? 'auto' : containerSize,
        backgroundColor: 'var(--theme-bg-light)',
        boxShadow: '2px 2px 0 #000',
        ...style
      }}
      onClick={onClick}
      title={tile.name}
    >
      {/* Canvas Container */}
      <div 
        className="border-2 border-black relative"
        style={{ 
          aspectRatio: '1/1',
          backgroundColor: 'var(--theme-bg-medium)'
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Type Icon */}
        {getTypeIcon() && (
          <div className="absolute top-1 right-1 bg-white rounded-sm p-0.5 shadow-md border border-black">
            {getTypeIcon()}
          </div>
        )}
      </div>

      {/* Name */}
      {showName && (
        <div className="text-xs mt-1.5 text-center font-bold truncate">
          {tile.name}
        </div>
      )}
    </div>
  );
}

