import { useState, useEffect } from 'react';

export interface Tile {
  id: string;
  name: string;
  grid: string[][];
  size: number;
  createdAt: number;
  updatedAt: number;
}

export function useTiles() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tiles from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pixelart-tiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTiles(parsed);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading tiles:', error);
      setIsLoaded(true);
    }
  }, []);

  // Save tiles to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('pixelart-tiles', JSON.stringify(tiles));
      } catch (error) {
        console.error('Error saving tiles:', error);
      }
    }
  }, [tiles, isLoaded]);

  const saveTile = (name: string, grid: string[][], size: number, existingId?: string) => {
    const now = Date.now();
    
    if (existingId) {
      // Update existing tile
      setTiles(prev => prev.map(tile => 
        tile.id === existingId 
          ? { ...tile, name, grid, size, updatedAt: now }
          : tile
      ));
    } else {
      // Create new tile
      const newTile: Tile = {
        id: `tile_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        grid,
        size,
        createdAt: now,
        updatedAt: now,
      };
      setTiles(prev => [...prev, newTile]);
    }
  };

  const deleteTile = (id: string) => {
    setTiles(prev => prev.filter(tile => tile.id !== id));
  };

  const renameTile = (id: string, newName: string) => {
    setTiles(prev => prev.map(tile =>
      tile.id === id
        ? { ...tile, name: newName, updatedAt: Date.now() }
        : tile
    ));
  };

  const getTile = (id: string) => {
    return tiles.find(tile => tile.id === id);
  };

  return {
    tiles,
    saveTile,
    deleteTile,
    renameTile,
    getTile,
    isLoaded,
  };
}

