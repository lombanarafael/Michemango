// Configuración de Vite: compila el React de frontend/ y deja el resultado en dist/.
// En GitHub Pages la base cambia a /Michemango/ (ver .github/workflows/pages.yml).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  root: "frontend",
  plugins: [react()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
