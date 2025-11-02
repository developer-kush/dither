import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("canvas", "routes/PixelArtGenerator.tsx"),
  route("geography", "routes/MapEditor.tsx"),
  route("studio", "routes/TileStudio.tsx"),
  route("library", "routes/tiles.tsx"),
] satisfies RouteConfig;
