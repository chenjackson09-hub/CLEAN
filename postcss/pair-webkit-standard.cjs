/**
 * PostCSS plugin: pair a prefixed-only property with its standard form.
 *
 * Tailwind's preflight emits `-webkit-text-size-adjust: 100%` with no
 * unprefixed fallback, and autoprefixer won't add the standard property
 * (it only adds prefixes, never the base). Baseline/compat linters then
 * flag the rule for missing `text-size-adjust`. This runs after
 * autoprefixer and clones the standard declaration in next to each
 * prefixed-only one (skipping rules that already have it).
 */
const PAIRS = {
  "-webkit-text-size-adjust": "text-size-adjust",
};

module.exports = {
  postcssPlugin: "pair-webkit-standard",
  Declaration(decl) {
    const std = PAIRS[decl.prop];
    if (!std) return;
    if (decl.parent.some((d) => d.type === "decl" && d.prop === std)) return;
    decl.cloneAfter({ prop: std });
  },
};
