import { defineConfig } from "tsup";
import fs from "fs";
import path from "path";

const themesDir = path.resolve(__dirname, "src/themes");
const themeFiles = fs.existsSync(themesDir)
  ? fs.readdirSync(themesDir).filter(f => f.endsWith(".ts"))
  : [];

const entry = {
  index: "src/core/api/new/main.ts",
  ...Object.fromEntries(
    themeFiles.map(f => {
      const name = path.basename(f, ".ts");
      return [name, `src/themes/${f}`];
    })
  )
};

export default defineConfig([
  {
    entry,
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
  },
  {
    entry,
    format: ["esm"],
    dts: false,
    sourcemap: false,
    clean: false,
    minify: true,
    target: "es2020",
    outDir: "docs/dist",
    splitting: false,
    shims: false,
    treeshake: true
  }
]);
