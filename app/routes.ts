import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("tile-editor", "routes/PixelArtGenerator.tsx"),
  route("map-editor", "routes/MapEditor.tsx"),
] satisfies RouteConfig;
