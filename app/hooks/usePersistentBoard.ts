import { useState, useEffect, useCallback } from 'react';
import { Board } from '../routes/Board';

/**
 * Serializable representation of a Board for localStorage
 */
interface SerializedBoard {
  size: number;
  data: string[][];
  window: { x: number; y: number };
}

/**
 * Serialize a Board instance to a plain object
 */
function serializeBoard(board: Board): SerializedBoard {
  return {
    size: board.size,
    data: board.getVirtualGrid(),
    window: { ...board.window },
  };
}

/**
 * Deserialize a plain object to a Board instance
 */
function deserializeBoard(serialized: SerializedBoard): Board {
  const board = new Board(serialized.size);
  board.data = serialized.data.map(row => [...row]);
  board.window = { ...serialized.window };
  return board;
}

/**
 * usePersistentBoard - A specialized hook for persisting Board state
 * 
 * This hook handles the serialization and deserialization of Board instances,
 * automatically saving to localStorage whenever the board changes.
 * 
 * @param key - The localStorage key to use
 * @param initialSize - The initial grid size if nothing is stored
 * @returns A tuple of [board, setBoard, clearStorage]
 */
export function usePersistentBoard(
  key: string,
  initialSize: number
): [Board, (board: Board) => void, () => void] {
  // Initialize board from localStorage or create new one
  const [board, setBoard] = useState<Board>(() => {
    if (typeof window === 'undefined') {
      return new Board(initialSize);
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const serialized = JSON.parse(item) as SerializedBoard;
        return deserializeBoard(serialized);
      }
    } catch (error) {
      console.warn(`Error loading board from localStorage key "${key}":`, error);
    }

    return new Board(initialSize);
  });

  // Save board to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const serialized = serializeBoard(board);
      window.localStorage.setItem(key, JSON.stringify(serialized));
    } catch (error) {
      console.warn(`Error saving board to localStorage key "${key}":`, error);
    }
  }, [key, board]);

  // Function to clear the stored board
  const clearStorage = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setBoard(new Board(initialSize));
    } catch (error) {
      console.warn(`Error clearing board from localStorage key "${key}":`, error);
    }
  }, [key, initialSize]);

  return [board, setBoard, clearStorage];
}

