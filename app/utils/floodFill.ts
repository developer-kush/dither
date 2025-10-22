/**
 * Flood Fill Algorithm
 * 
 * Fills a connected region of pixels with a new color using BFS (Breadth-First Search).
 * This is the classic "paint bucket" tool found in most image editors.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Performs a flood fill operation on a 2D grid
 * 
 * @param grid - The 2D grid of colors
 * @param startX - Starting column
 * @param startY - Starting row
 * @param newColor - The color to fill with
 * @returns A new grid with the flood fill applied
 */
export function floodFill(
  grid: string[][],
  startX: number,
  startY: number,
  newColor: string
): string[][] {
  // Create a copy of the grid to avoid mutation
  const result = grid.map(row => [...row]);
  
  // Get dimensions
  const height = result.length;
  const width = result[0]?.length || 0;
  
  // Validate starting position
  if (startY < 0 || startY >= height || startX < 0 || startX >= width) {
    return result;
  }
  
  // Get the original color at the starting position
  const originalColor = result[startY][startX];
  
  // If the new color is the same as the original, no need to fill
  if (originalColor === newColor) {
    return result;
  }
  
  // BFS queue
  const queue: Point[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  
  // Helper to create a unique key for visited tracking
  const getKey = (x: number, y: number) => `${x},${y}`;
  
  while (queue.length > 0) {
    const point = queue.shift()!;
    const { x, y } = point;
    const key = getKey(x, y);
    
    // Skip if already visited or out of bounds
    if (visited.has(key)) continue;
    if (y < 0 || y >= height || x < 0 || x >= width) continue;
    if (result[y][x] !== originalColor) continue;
    
    // Mark as visited and fill
    visited.add(key);
    result[y][x] = newColor;
    
    // Add adjacent cells (4-directional connectivity)
    queue.push({ x: x + 1, y });     // right
    queue.push({ x: x - 1, y });     // left
    queue.push({ x, y: y + 1 });     // down
    queue.push({ x, y: y - 1 });     // up
  }
  
  return result;
}

/**
 * Performs a flood fill operation with 8-directional connectivity (including diagonals)
 * 
 * @param grid - The 2D grid of colors
 * @param startX - Starting column
 * @param startY - Starting row
 * @param newColor - The color to fill with
 * @returns A new grid with the flood fill applied
 */
export function floodFill8Way(
  grid: string[][],
  startX: number,
  startY: number,
  newColor: string
): string[][] {
  const result = grid.map(row => [...row]);
  const height = result.length;
  const width = result[0]?.length || 0;
  
  if (startY < 0 || startY >= height || startX < 0 || startX >= width) {
    return result;
  }
  
  const originalColor = result[startY][startX];
  
  if (originalColor === newColor) {
    return result;
  }
  
  const queue: Point[] = [{ x: startX, y: startY }];
  const visited = new Set<string>();
  const getKey = (x: number, y: number) => `${x},${y}`;
  
  while (queue.length > 0) {
    const point = queue.shift()!;
    const { x, y } = point;
    const key = getKey(x, y);
    
    if (visited.has(key)) continue;
    if (y < 0 || y >= height || x < 0 || x >= width) continue;
    if (result[y][x] !== originalColor) continue;
    
    visited.add(key);
    result[y][x] = newColor;
    
    // Add all 8 adjacent cells
    queue.push({ x: x + 1, y });         // right
    queue.push({ x: x - 1, y });         // left
    queue.push({ x, y: y + 1 });         // down
    queue.push({ x, y: y - 1 });         // up
    queue.push({ x: x + 1, y: y + 1 });  // down-right
    queue.push({ x: x + 1, y: y - 1 });  // up-right
    queue.push({ x: x - 1, y: y + 1 });  // down-left
    queue.push({ x: x - 1, y: y - 1 });  // up-left
  }
  
  return result;
}

