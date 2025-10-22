import React, { useState } from 'react';
import { Tile } from '../hooks/useTiles';
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
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(tile.id);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="game-input flex-1 text-xs px-1 py-0"
                  autoFocus
                />
                <button
                  onClick={() => saveEdit(tile.id)}
                  className="text-xs px-1"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-xs px-1"
                  title="Cancel"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onLoadTile(tile)}
                  className="flex-1 text-left text-xs truncate"
                  title={tile.name}
                >
                  {tile.name}
                  <span className="text-[10px] opacity-60 ml-1">
                    ({tile.size}×{tile.size})
                  </span>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEditing(tile)}
                    className="text-xs px-1"
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${tile.name}"?`)) {
                        onDeleteTile(tile.id);
                      }
                    }}
                    className="text-xs px-1"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
};

