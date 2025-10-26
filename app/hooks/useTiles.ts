import { useState, useEffect } from 'react';

export interface Tile {
  id: string;
  name: string;
  grid: string[][];
  size: number;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  isComplex?: boolean; // True for animated/complex tiles
  animationFrames?: string[]; // Array of tile IDs for animation
  animationFps?: number; // Animation speed
  isPublished?: boolean; // True if published to map editor
  publishedFolderId?: string | null; // Folder for published tiles in map editor
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export function useTiles() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tiles and folders from localStorage on mount
  useEffect(() => {
    try {
      const storedTiles = localStorage.getItem('pixelart-tiles');
      const storedFolders = localStorage.getItem('pixelart-folders');
      
      if (storedTiles) {
        const parsed = JSON.parse(storedTiles);
        // Migrate old tiles without folderId
        const migratedTiles = parsed.map((tile: any) => ({
          ...tile,
          folderId: tile.folderId ?? null,
        }));
        setTiles(migratedTiles);
      }
      
      if (storedFolders) {
        setFolders(JSON.parse(storedFolders));
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

  // Save folders to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('pixelart-folders', JSON.stringify(folders));
      } catch (error) {
        console.error('Error saving folders:', error);
      }
    }
  }, [folders, isLoaded]);

  const saveTile = (
    name: string, 
    grid: string[][], 
    size: number, 
    folderId: string | null = null, 
    existingId?: string,
    isComplex?: boolean,
    animationFrames?: string[],
    animationFps?: number
  ): string => {
    const now = Date.now();
    
    if (existingId) {
      // Check if tile exists in the array
      const tileExists = tiles.some(tile => tile.id === existingId);
      
      if (tileExists) {
        // Update existing tile
        setTiles(prev => prev.map(tile => 
          tile.id === existingId 
            ? { 
                ...tile, 
                name, 
                grid, 
                size, 
                folderId, 
                updatedAt: now,
                isComplex,
                animationFrames,
                animationFps
              }
            : tile
        ));
        return existingId;
      } else {
        // Tile doesn't exist yet, create it with the provided ID
        const newTile: Tile = {
          id: existingId,
          name,
          grid,
          size,
          folderId,
          createdAt: now,
          updatedAt: now,
          isComplex,
          animationFrames,
          animationFps,
        };
        setTiles(prev => [...prev, newTile]);
        return existingId;
      }
    } else {
      // Create new tile with generated ID
      const newTile: Tile = {
        id: `tile_${now}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        grid,
        size,
        folderId,
        createdAt: now,
        updatedAt: now,
        isComplex,
        animationFrames,
        animationFps,
      };
      setTiles(prev => [...prev, newTile]);
      return newTile.id;
    }
  };

  const createFolder = (name: string, parentId: string | null = null): string => {
    const now = Date.now();
    const newFolder: Folder = {
      id: `folder_${now}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      parentId,
      createdAt: now,
    };
    setFolders(prev => [...prev, newFolder]);
    return newFolder.id;
  };

  const renameFolder = (id: string, newName: string) => {
    setFolders(prev => prev.map(folder =>
      folder.id === id
        ? { ...folder, name: newName }
        : folder
    ));
  };

  const deleteFolder = (id: string) => {
    // Move tiles in this folder to root
    setTiles(prev => prev.map(tile =>
      tile.folderId === id
        ? { ...tile, folderId: null }
        : tile
    ));
    // Delete child folders recursively
    const childFolders = folders.filter(f => f.parentId === id);
    childFolders.forEach(f => deleteFolder(f.id));
    // Delete the folder
    setFolders(prev => prev.filter(folder => folder.id !== id));
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

  const publishTile = (id: string, publishedFolderId: string | null = null) => {
    setTiles(prev => prev.map(tile =>
      tile.id === id
        ? { ...tile, isPublished: true, publishedFolderId, updatedAt: Date.now() }
        : tile
    ));
  };

  const unpublishTile = (id: string) => {
    setTiles(prev => prev.map(tile =>
      tile.id === id
        ? { ...tile, isPublished: false, publishedFolderId: null, updatedAt: Date.now() }
        : tile
    ));
  };

  const getTile = (id: string) => {
    return tiles.find(tile => tile.id === id);
  };

  const loadAllTiles = (newTiles: Tile[]) => {
    setTiles(newTiles);
  };

  return {
    tiles,
    folders,
    saveTile,
    deleteTile,
    renameTile,
    publishTile,
    unpublishTile,
    getTile,
    createFolder,
    renameFolder,
    deleteFolder,
    loadAllTiles,
    isLoaded,
  };
}

