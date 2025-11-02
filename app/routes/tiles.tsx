import React, { useState, useMemo, useEffect } from 'react';
import { useTiles } from '../hooks/useTiles';
import { useRouteCycling } from '../hooks/useRouteCycling';
import { NavBar } from '../components/NavBar';
import { TileItem } from '../components/TileItem';
import { TrashIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function TilesPage() {
  const { tiles, deleteTile, renameTile, publishTile, unpublishTile, getAllLabels, addLabelToTile, removeLabelFromTile, getTile } = useTiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const allLabels = getAllLabels();
  
  // Enable route cycling with Shift+Tab
  useRouteCycling();

  // Set theme for tiles manager
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light-purple');
    
    return () => {
      // Reset to default theme when leaving
      document.documentElement.setAttribute('data-theme', 'green');
    };
  }, []);

  // Filter tiles based on search query and labels
  const filteredTiles = useMemo(() => {
    let result = tiles;
    
    // Filter by labels (must have ALL selected labels)
    if (filterLabels.length > 0) {
      result = result.filter(tile => 
        filterLabels.every(label => tile.labels?.includes(label))
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tile => tile.name.toLowerCase().includes(query));
    }
    
    return result;
  }, [tiles, searchQuery, filterLabels]);

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

  const handleAddLabel = () => {
    if (!selectedTileId || !newLabel.trim()) return;
    const trimmedLabel = newLabel.trim();
    addLabelToTile(selectedTileId, trimmedLabel);
    setNewLabel('');
  };

  const handleRemoveLabel = (label: string) => {
    if (!selectedTileId) return;
    removeLabelFromTile(selectedTileId, label);
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
      <NavBar title="Library" />

      <div className="flex-1 flex mt-16 overflow-hidden">
        {/* Left Side - Tiles Grid (3/4 width) */}
        <div className="flex-1 overflow-y-auto relative">
          {/* Fixed Search Bar and Filters */}
          <div className="sticky top-0 z-10 p-8 pb-4" style={{ backgroundColor: 'var(--theme-bg-light)' }}>
            <div className="relative max-w-md mb-3">
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
            
            {/* Label Filters */}
            {allLabels.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] opacity-60 uppercase tracking-wide mb-2">Filter by Labels</div>
                
                {/* Selected Filter Labels */}
                {filterLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {filterLabels.map(label => (
                      <div
                        key={label}
                        className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black text-[10px]"
                        style={{ 
                          backgroundColor: 'var(--theme-accent)',
                          boxShadow: '1px 1px 0 #000'
                        }}
                      >
                        <span>{label}</span>
                        <button
                          onClick={() => setFilterLabels(prev => prev.filter(l => l !== label))}
                          className="hover:text-red-600"
                          title="Remove filter"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setFilterLabels([])}
                      className="px-2 py-1 border-2 border-black text-[10px] hover:bg-red-200"
                      style={{ 
                        backgroundColor: 'var(--theme-bg-light)',
                        boxShadow: '1px 1px 0 #000'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                
                {/* Available Labels */}
                <div className="flex flex-wrap gap-1">
                  {allLabels
                    .filter(label => !filterLabels.includes(label))
                    .map(label => (
                      <button
                        key={label}
                        onClick={() => setFilterLabels(prev => [...prev, label])}
                        className="px-2 py-1 border-2 border-black text-[10px] hover:bg-[var(--theme-accent)]"
                        style={{ 
                          backgroundColor: 'var(--theme-bg-panel)',
                          boxShadow: '1px 1px 0 #000'
                        }}
                      >
                        {label}
                      </button>
                    ))}
                </div>
              </div>
            )}
            
            {(searchQuery || filterLabels.length > 0) && (
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
                <a href="/canvas" className="underline text-lg">
                  Create your first tile
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTiles.map(tile => {
                const isSelected = selectedTileId === tile.id;

                return (
                  <div key={tile.id} className="relative">
                    <TileItem
                      tile={tile}
                      size="medium"
                      showName={true}
                      showTypeIcon={true}
                      selected={isSelected}
                      onClick={() => setSelectedTileId(tile.id)}
                      getTile={getTile}
                    />
                    {/* Additional info badges */}
                    <div className="absolute bottom-7 left-0 right-0 flex justify-center gap-1">
                      {tile.isPublished && (
                        <span className="text-[9px] font-bold bg-green-600 text-white px-1 rounded border border-black">
                          PUB
                        </span>
                      )}
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
                <div className="flex justify-center mb-4">
                  <TileItem
                    tile={selectedTile}
                    size="large"
                    showName={false}
                    showTypeIcon={true}
                    getTile={getTile}
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

              {/* Labels Management */}
              <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
                <div className="text-sm font-bold mb-3">Labels</div>
                
                {/* Existing Labels */}
                {selectedTile.labels && selectedTile.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTile.labels.map(label => (
                      <div
                        key={label}
                        className="inline-flex items-center gap-1 px-2 py-1 border-2 border-black text-xs"
                        style={{ 
                          backgroundColor: 'var(--theme-bg-light)',
                          boxShadow: '1px 1px 0 #000'
                        }}
                      >
                        <span>{label}</span>
                        <button
                          onClick={() => handleRemoveLabel(label)}
                          className="hover:text-red-600"
                          title="Remove label"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs opacity-60 mb-3">No labels yet</div>
                )}
                
                {/* Add New Label */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddLabel();
                      }
                    }}
                    placeholder="Add label..."
                    className="flex-1 px-2 py-1 text-xs border-2 border-black"
                    style={{
                      backgroundColor: 'var(--theme-bg-light)',
                      boxShadow: '1px 1px 0 #000'
                    }}
                  />
                  <button
                    onClick={handleAddLabel}
                    className="px-2 py-1 border-2 border-black bg-[var(--theme-accent)] hover:opacity-80"
                    style={{ boxShadow: '1px 1px 0 #000' }}
                    title="Add label"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Quick Select from All Labels */}
                {allLabels.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[10px] opacity-60 mb-2">Quick add:</div>
                    <div className="flex flex-wrap gap-1">
                      {allLabels
                        .filter(label => !selectedTile.labels?.includes(label))
                        .map(label => (
                          <button
                            key={label}
                            onClick={() => addLabelToTile(selectedTileId!, label)}
                            className="px-2 py-1 border border-black text-[10px] hover:bg-[var(--theme-accent)] transition-colors"
                            style={{ backgroundColor: 'var(--theme-bg-panel)' }}
                          >
                            {label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Publishing Status */}
              <div className="mb-6 p-4 border-2 border-black" style={{ backgroundColor: 'var(--theme-bg-medium)', boxShadow: '4px 4px 0 #000' }}>
                <div className="text-sm font-bold mb-2">Geography Status</div>
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

