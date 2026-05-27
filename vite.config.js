import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The base path is set to "./" so the build works both on a local server
// and when published to a GitHub Pages subdirectory.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
