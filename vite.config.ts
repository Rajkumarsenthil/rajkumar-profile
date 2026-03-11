import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const normalizeBasePath = (value: string) => {
  const cleanedValue = value.trim();

  if (cleanedValue === "" || cleanedValue === "/") {
    return "/";
  }

  const withLeadingSlash = cleanedValue.startsWith("/") ? cleanedValue : `/${cleanedValue}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH ?? "/");

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: basePath,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
