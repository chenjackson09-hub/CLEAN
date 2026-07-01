import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    // Target older Safari so autoprefixer emits `-webkit-backdrop-filter`
    // alongside `backdrop-filter` in Tailwind's own utility (Safari needs the
    // prefix through v17; `defaults` alone only sees prefix-free versions).
    autoprefixer: {
      overrideBrowserslist: ["defaults", "safari >= 12", "ios_saf >= 12"],
    },
    // Runs after autoprefixer: adds the standard `text-size-adjust` next to
    // Tailwind preflight's `-webkit-text-size-adjust` (referenced by absolute
    // path because Next's PostCSS loader resolves plugins via require.resolve).
    [path.join(dir, "postcss/pair-webkit-standard.cjs")]: {},
  },
};

export default config;
