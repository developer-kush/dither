import React, { useRef, useEffect, useState } from "react";
import { PlayIcon, XMarkIcon } from "@heroicons/react/24/solid";
import type { Tile } from "../hooks/useTiles";

interface TileItemProps {
  tile: Tile;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showTypeIcon?: boolean;
  showDelete?: boolean;
  getTile?: (id: string) => Tile | undefined;
  className?: string;
  style?: React.CSSProperties;
}

export function TileItem({
  tile,
  onClick,
  onDelete,
  selected = false,
  size = 'medium',
  showName = true,
  showTypeIcon = true,
  showDelete = false,
  getTile,
  className = '',
  style = {}
}: TileItemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Size mappings - larger tiles for better visibility
  const sizeMap = {
    small: { width: '120px', canvasSize: '100px' },
    medium: { width: '180px', canvasSize: '160px' },
    large: { width: '200px', canvasSize: '180px' }
  };

  const { width: containerWidth, canvasSize } = sizeMap[size];

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

  // Get type icon - returns icon component for footer
  const getTypeIcon = () => {
    if (!showTypeIcon || !tile.isComplex) return null;

    if (tile.animationFrames) {
      return <PlayIcon className="w-4 h-4" />;
    }
    
    // For composite tiles (future) - 2x2 grid of circles
    return (
      <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
        <div className="rounded-full bg-black"></div>
        <div className="rounded-full bg-black"></div>
        <div className="rounded-full bg-black"></div>
        <div className="rounded-full bg-black"></div>
      </div>
    );
  };

  return (
    <div
      className={`relative border-2 cursor-pointer transition-all hover:scale-105 ${
        selected ? 'ring-4 ring-blue-500' : ''
      } ${className}`}
      style={{
        width: containerWidth,
        backgroundColor: '#c0c0c0',
        boxShadow: '4px 4px 0 #000',
        borderColor: '#000',
        overflow: showDelete ? 'visible' : 'hidden',
        ...style
      }}
      onClick={onClick}
      title={tile.name}
    >
      {/* Canvas Area - Perfect Square */}
      <div 
        className={`relative ${showName ? 'border-b-2 border-black' : ''}`}
        style={{ 
          width: containerWidth,
          height: containerWidth,
          backgroundColor: 'var(--theme-bg-medium)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          boxSizing: 'border-box',
          overflow: 'visible'
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Delete Button - 3D styled button in top-right corner */}
        {showDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="absolute w-6 h-6 flex items-center justify-center border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all active:translate-x-[2px] active:translate-y-[2px]"
            style={{ 
              backgroundColor: '#ef4444',
              boxShadow: '2px 2px 0 #000',
              top: '-3px',
              right: '-3px'
            }}
            title="Delete"
          >
            <XMarkIcon className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Footer with Icon and Info */}
      {showName && (
        <div 
          className="flex items-center gap-3 p-2"
          style={{ backgroundColor: '#c0c0c0' }}
        >
          {/* Type Icon on Left */}
          <div className="flex-shrink-0">
            {getTypeIcon()}
          </div>
          
          {/* Name and Size on Right */}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate">
              {tile.name}
            </div>
            <div className="text-xs opacity-70">
              {tile.size}×{tile.size}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

