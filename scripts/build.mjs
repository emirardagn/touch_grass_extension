import { build, context } from "esbuild";
import { cp, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";

const outdir = resolve("dist");
const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  target: "chrome120",
  platform: "browser",
  sourcemap: true,
  logLevel: "info",
};

const entrypoints = [
  { in: "src/background/serviceWorker.ts", out: "background/serviceWorker" },
  { in: "src/content/content.ts", out: "content/content" },
  { in: "src/popup/popup.ts", out: "popup/popup" },
  { in: "src/options/options.ts", out: "options/options" },
];

async function copyStatic() {
  await mkdir(resolve(outdir, "popup"), { recursive: true });
  await mkdir(resolve(outdir, "options"), { recursive: true });
  await mkdir(resolve(outdir, "icons"), { recursive: true });
  await cp(resolve("manifest.json"), resolve(outdir, "manifest.json"));
  await cp(resolve("src/popup/popup.html"), resolve(outdir, "popup/popup.html"));
  await cp(resolve("src/options/options.html"), resolve(outdir, "options/options.html"));

  // Copy single icon source if it exists
  const iconSrc = resolve("src/icons/icon.png");
  try {
    await access(iconSrc);
    await cp(iconSrc, resolve(outdir, "icons/icon.png"));
  } catch {
    // Icon not yet present — skip silently
  }
}

const config = {
  ...shared,
  outdir,
  entryPoints: entrypoints.map((it) => it.in),
  outbase: "src",
  entryNames: "[dir]/[name]",
};

if (watch) {
  const ctx = await context(config);
  await ctx.watch();
  await copyStatic();
  console.log("Watching extension files...");
} else {
  await build(config);
  await copyStatic();
}
