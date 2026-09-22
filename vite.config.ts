import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this site from the root of a custom domain, but keep the
// base path configurable so a project-pages deploy (/<repo>/) still works.
const normalizeBase = (value: string | undefined) => {
  const trimmed = (value ?? "/").trim();
  if (trimmed === "" || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

export default defineConfig({
  base: normalizeBase(process.env.VITE_BASE_PATH),
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    // Three.js is lazy-loaded in its own chunk; it is expected to be large.
    chunkSizeWarningLimit: 1200,
  },
});
