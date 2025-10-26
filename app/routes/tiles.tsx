import React, { useState, useMemo } from 'react';
import { useTiles } from '../hooks/useTiles';
import { useRouteCycling } from '../hooks/useRouteCycling';
import { NavBar } from '../components/NavBar';
import { TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function TilesPage() {
  const { tiles, deleteTile, renameTile, publishTile, unpublishTile, folders } = useTiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();

  // Filter tiles based on search query
  const filteredTiles = useMemo(() => {
    if (!searchQuery.trim()) return tiles;
    const query = searchQuery.toLowerCase();
    return tiles.filter(tile => tile.name.toLowerCase().includes(query));
  }, [tiles, searchQuery]);

  // Get selected tile
  const selectedTile = selectedTileId ? tiles.find(t => t.id === selectedTileId) : null;

  // Initialize editing name when tile is selected
  React.useEffect(() => {
    if (selectedTile) {
      setEditingName(selectedTile.name);
    }
  }, [selectedTile]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveName = () => {
    if (selectedTileId && editingName.trim() && editingName.trim() !== selectedTile?.name) {
      renameTile(selectedTileId, editingName.trim());
    }
  };

  const handleDelete = () => {
    if (!selectedTile) return;
    if (confirm(`Are you sure you want to delete "${selectedTile.name}"? This action cannot be undone.`)) {
      deleteTile(selectedTile.id);
      setSelectedTileId(null);
    }
  };

  const handleTogglePublish = () => {
    if (!selectedTile) return;
    if (selectedTile.isPublished) {
      unpublishTile(selectedTile.id);
    } else {
      publishTile(selectedTile.id, selectedTile.publishedFolderId || null);
    }
  };

  // Create image from tile grid
  const getTileImage = (tile: typeof tiles[0]) => {
    const canvas = document.createElement('canvas');
    canvas.width = tile.size;
    canvas.height = tile.size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    tile.grid.forEach((row, y) => {
      row.forEach((color, x) => {
        if (color && color !== 'rgba(0,0,0,0)') {
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
        }
      });
    });

    return canvas.toDataURL();
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Tiles Manager" />

      <div className="flex-1 flex mt-16 overflow-hidden">
        {/* Left Side - Tiles Grid (3/4 width) */}
        <div className="flex-1 overflow-y-auto relative">
          {/* Fixed Search Bar */}
          <div className="sticky top-0 z-10 p-8 pb-4" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tiles... (⌘K)"
                className="w-full pl-12 pr-4 py-3 border-2 border-black text-lg"
                style={{
                  backgroundColor: 'var(--theme-bg-panel)',
                  boxShadow: '4px 4px 0 #000'
                }}
              />
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm opacity-60">
                Found {filteredTiles.length} tile{filteredTiles.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          <div className="px-8 pb-8">

          {/* Tiles Grid */}
          {filteredTiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-lg opacity-60 mb-4">
                {searchQuery ? 'No tiles found matching your search' : 'No tiles yet'}
              </div>
              {!searchQuery && (
                <a href="/tile-editor" className="underline text-lg">
                  Create your first tile
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTiles.map(tile => {
                const isComplex = tile.isComplex || false;
                const isSelected = selectedTileId === tile.id;

                return (
                  <div
                    key={tile.id}
                    onClick={() => setSelectedTileId(tile.id)}
                    className={`border-2 cursor-pointer p-4 transition-all hover:translate-x-0.5 hover:translate-y-0.5 ${
                      isSelected ? 'ring-4 ring-blue-500' : ''
                    }`}
                    style={{
                      backgroundColor: isComplex ? '#FFF8DC' : 'var(--theme-bg-panel)',
                      borderColor: isComplex ? '#FFD700' : '#000',
                      borderWidth: isComplex ? '3px' : '2px',
                      boxShadow: isComplex ? '4px 4px 0 #DAA520' : '4px 4px 0 #000'
                    }}
                  >
                    {/* Tile Image */}
                    <div className="mb-3 bg-white border-2 border-black p-2">
                      <img
                        src={getTileImage(tile)}
                        alt={tile.name}
                        className="w-full h-auto"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>

                    {/* Tile Name */}
                    <div
                      className="font-bold text-sm truncate text-center"
                      title={tile.name}
                      style={{ color: isComplex ? '#8B6914' : 'inherit' }}
                    >
                      {tile.name}
                    </div>

                    {/* Tile Info */}
                    <div className="text-[10px] opacity-60 text-center mt-1">
                      {tile.size}x{tile.size}
                      {tile.isComplex && <span className="ml-2 font-bold text-amber-700">ANIM</span>}
                      {tile.isPublished && <span className="ml-2 font-bold text-green-700">PUB</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Right Side - Operations Panel (1/4 width) */}
        <div 
          className="w-96 border-l-2 border-black overflow-y-auto p-6"
          style={{ backgroundColor: 'var(--theme-bg-panel)' }}
        >
          {selectedTile ? (
            <>
              <h2 className="text-xl font-bold mb-4">Tile Details</h2>

              {/* Tile Preview */}
              <div className="mb-6 border-2 border-black p-4" style={{ backgroundColor: 'var(--theme-bg-light)', boxShadow: '4px 4px 0 #000' }}>
                <div className="bg-white border-2 border-black p-4 mb-4">
                  <img
                    src={getTileImage(selectedTile)}
                    alt={selectedTile.name}
                    className="w-full h-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm opacity-60">Size: {selectedTile.size}x{selectedTile.size}</div>
                  {selectedTile.isComplex && <div className="text-sm font-bold text-amber-700 mt-1">Animated Tile</div>}
                </div>
              </div>

              {/* Name Edit */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Tile Name</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full px-3 py-2 border-2 border-black"
                  style={{ 
                    backgroundColor: 'var(--theme-bg-light)',
                    boxShadow: '2px 2px 0 #000'
                  }}
                />
              </div>

              {/* Publishing Status */}
              <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
                <div className="text-sm font-bold mb-2">Map Editor Status</div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm">{selectedTile.isPublished ? 'Published' : 'Not Published'}</span>
                  <span className={`text-xs font-bold ${selectedTile.isPublished ? 'text-green-700' : 'text-gray-400'}`}>
                    {selectedTile.isPublished ? 'YES' : 'NO'}
                  </span>
                </div>
                <button
                  onClick={handleTogglePublish}
                  className={`w-full px-4 py-2 border-2 border-black font-bold transition-colors ${
                    selectedTile.isPublished
                      ? 'bg-red-200 hover:bg-red-300'
                      : 'bg-green-200 hover:bg-green-300'
                  }`}
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  {selectedTile.isPublished ? 'Unpublish' : 'Publish'}
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                className="w-full px-4 py-3 border-2 border-black bg-red-500 hover:bg-red-600 text-white font-bold transition-colors flex items-center justify-center gap-2"
                style={{ boxShadow: '4px 4px 0 #000' }}
              >
                <TrashIcon className="w-5 h-5" />
                Delete Tile
              </button>

              {/* Tile ID */}
              <div className="mt-4 text-[10px] opacity-60 font-mono truncate" title={selectedTile.id}>
                ID: {selectedTile.id}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center opacity-60">
              <div>
                <p className="text-lg">Select a tile to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

