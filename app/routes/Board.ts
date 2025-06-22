export class Board {
  size: number; // d
  virtualSize: number; // 3d
  data: string[][];
  window: { x: number; y: number };

  constructor(size: number, fill: string = "rgba(0,0,0,0)") {
    this.size = size;
    this.virtualSize = size * 3;
    this.data = Array.from({ length: this.virtualSize }, () => Array(this.virtualSize).fill(fill));
    this.window = { x: size, y: size };
  }

  // Get d x d window
  getWindow(): string[][] {
    const { x, y } = this.window;
    const d = this.size;
    return Array.from({ length: d }, (_, i) =>
      this.data[y + i].slice(x, x + d)
    );
  }

  // Set d x d window
  setWindow(grid: string[][]) {
    const { x, y } = this.window;
    const d = this.size;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        this.data[y + i][x + j] = grid[i][j];
      }
    }
  }

  // Set a pixel in the window
  setPixel(i: number, j: number, color: string) {
    const { x, y } = this.window;
    this.data[y + i][x + j] = color;
  }

  // Get a pixel in the window
  getPixel(i: number, j: number): string {
    const { x, y } = this.window;
    return this.data[y + i][x + j];
  }

  // Shift window
  shift(dx: number, dy: number) {
    const max = this.size * 2;
    this.window.x = Math.max(0, Math.min(max, this.window.x + dx));
    this.window.y = Math.max(0, Math.min(max, this.window.y + dy));
  }

  // Reset window to center
  centerWindow() {
    this.window = { x: this.size, y: this.size };
  }

  // Fill window
  fillWindow(color: string) {
    const { x, y } = this.window;
    const d = this.size;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        this.data[y + i][x + j] = color;
      }
    }
  }

  // Get the full virtual grid
  getVirtualGrid(): string[][] {
    return this.data.map(row => [...row]);
  }
}
