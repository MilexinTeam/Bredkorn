import { defineConfig } from "tsup";
import fs from "fs";
import path from "path";

// Automatyczne wykrywanie themes
const themesDir = path.resolve(__dirname, "src/themes");
const themeFiles = fs.existsSync(themesDir)
  ? fs.readdirSync(themesDir).filter(f => f.endsWith(".ts"))
  : [];

export default defineConfig({
  entry: {
    index: "src/core/api/Bredkorn.ts",
    ...Object.fromEntries(
      themeFiles.map(f => {
        const name = path.basename(f, ".ts");
        return [name, `src/themes/${f}`];
      })
    )
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  target: "es2020",
  outDir: "dist",
  splitting: false,
  shims: false,
  treeshake: true
});
