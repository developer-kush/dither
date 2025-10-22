# Pixel Art Generator

A modern pixel art editor for creating and editing pixel art with keyboard controls.

## Features

### 📁 File Menu
The floating **File** button in the top right corner provides quick access to:
- **Load Image**: Import an existing image to trace or edit
- **Save As**: Export your pixel art in multiple formats
  - **PNG**: Lossless raster format (recommended)
  - **JPEG**: Compressed format for smaller file sizes
  - **WebP**: Modern format with great compression
  - **SVG**: Vector format that scales perfectly

### 🎨 Persistent Storage
All your work is automatically saved to your browser's localStorage and restored when you reload the page:
- **Board State**: Your entire pixel art canvas is preserved
- **Colors**: Current color, recent colors, and pinned colors
- **Settings**: Grid size, gradient settings
- No manual saving required - everything just works!

### ⌨️ Keyboard Controls
The pixel art generator supports extensive keyboard controls for efficient editing:

#### Viewport Navigation
- **Arrow Keys** or **WASD**: Shift the viewport in any direction
  - ↑ / W: Shift viewport up
  - ↓ / S: Shift viewport down
  - ← / A: Shift viewport left
  - → / D: Shift viewport right

#### Drawing Tools
- **F Key**: Toggle between Draw Mode and Flood Fill Mode
  - **Draw Mode** (✏️): Click and drag to paint individual pixels
  - **Flood Fill Mode** (🪣): Click to fill connected regions with the current color

#### Undo/Redo
- **Ctrl+Z** (or **Cmd+Z** on Mac): Undo last action
- **Ctrl+Shift+Z** (or **Cmd+Shift+Z** on Mac): Redo last action

### 🪣 Flood Fill Tool
The flood fill feature works like the "paint bucket" tool in traditional image editors:
- Fills all connected pixels of the same color
- Uses 4-directional connectivity (up, down, left, right)
- Perfect for quickly filling large areas
- Works on the current visible window
- Toggle with **F key** or click the mode button in the UI

**Tip**: Use flood fill to quickly establish base colors for your pixel art, then switch to draw mode for details!

## Additional Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
