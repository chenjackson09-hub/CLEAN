// Allow side-effect imports of stylesheets (e.g. `import "./globals.css"`).
// Next.js handles CSS at build time, but the TS language server otherwise
// reports ts(2882) under `moduleResolution: "bundler"`.
declare module "*.css";
