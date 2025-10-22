import React, { useState } from 'react';
import type { Tile } from '../hooks/useTiles';
import { GameButton } from './GameButton';
import { GameIcon } from './GameIcon';

interface TileListProps {
  tiles: Tile[];
  onLoadTile: (tile: Tile) => void;
  onDeleteTile: (id: string) => void;
  onRenameTile: (id: string, newName: string) => void;
  currentTileId?: string;
}

export const TileList: React.FC<TileListProps> = ({
  tiles,
  onLoadTile,
  onDeleteTile,
  onRenameTile,
  currentTileId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEditing = (tile: Tile) => {
    setEditingId(tile.id);
    setEditingName(tile.name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) {
      onRenameTile(id, editingName.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="flex flex-col gap-2">
      {tiles.length === 0 ? (
        <div className="text-sm text-center p-4">
          No tiles saved yet.
          <br />
          Create and save your first tile!
        </div>
      ) : (
        tiles.map(tile => (
          <div
            key={tile.id}
            className="game-button flex items-center justify-between gap-2 p-2"
            style={currentTileId === tile.id ? { backgroundColor: 'var(--theme-accent)' } : {}}
          >
            {editingId === tile.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(tile.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="game-input flex-1 text-xs px-2 py-1"
                  autoFocus
                />
                <button
                  onClick={() => saveEdit(tile.id)}
                  className="w-6 h-6 flex items-center justify-center hover:opacity-70"
                  title="Save"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
                <button
                  onClick={cancelEdit}
                  className="w-6 h-6 flex items-center justify-center hover:opacity-70"
                  title="Cancel"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-red-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onLoadTile(tile)}
                  onDoubleClick={() => startEditing(tile)}
                  className="flex-1 text-left text-xs truncate"
                  title={`${tile.name} (double-click to rename)`}
                >
                  {tile.name}
                  <span className="text-[10px] opacity-60 ml-1">
                    ({tile.size}×{tile.size})
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${tile.name}"?`)) {
                      onDeleteTile(tile.id);
                    }
                  }}
                  className="text-xs px-1 hover:text-red-600"
                  title="Delete"
                >
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

