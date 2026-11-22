#!/usr/bin/env node
/**
 * Builds Foundry VTT release artifacts (system.json + system.zip) for a given tag.
 * Usage: node scripts/package-release.mjs <tag> [outDir]
 * Example: node scripts/package-release.mjs v0.1.0 dist-release
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const tag = process.argv[2];
const outDir = path.resolve(process.argv[3] || "dist-release");

if (!tag) {
  console.error("Usage: node scripts/package-release.mjs <tag> [outDir]");
  process.exit(1);
}

const version = tag.replace(/^v/, "");
const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
const repoUrl = manifest.url.replace(/\/+$/, "");

manifest.version = version;
manifest.download = `${repoUrl}/releases/download/${tag}/system.zip`;
manifest.flags = {};

const stageRoot = path.join(outDir, "_stage", manifest.id);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(stageRoot, { recursive: true });

const entries = [
  "LICENSE.txt",
  "README.md",
  "CHANGELOG.md",
  "assets",
  "css",
  "lang",
  "lib",
  "module",
  "templates",
];

for (const entry of entries) {
  fs.cpSync(entry, path.join(stageRoot, entry), { recursive: true });
}

const manifestText = JSON.stringify(manifest, null, 2) + "\n";
fs.writeFileSync(path.join(stageRoot, "system.json"), manifestText);
fs.writeFileSync(path.join(outDir, "system.json"), manifestText);

const zipOut = path.join(outDir, "system.zip");
if (process.platform === "win32") {
  const pyCode = [
    "import os, sys, zipfile",
    "stage_dir, zip_path = sys.argv[1], sys.argv[2]",
    "with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:",
    "    for root, _, files in os.walk(stage_dir):",
    "        for fn in sorted(files):",
    "            full = os.path.join(root, fn)",
    "            rel = os.path.relpath(full, stage_dir).replace(os.sep, '/')",
    "            zf.write(full, rel)",
  ].join("\n");
  execFileSync("python", ["-c", pyCode, path.join(outDir, "_stage"), zipOut], {
    stdio: "inherit",
  });
} else {
  execFileSync("zip", ["-rq", zipOut, manifest.id], {
    cwd: path.join(outDir, "_stage"),
    stdio: "inherit",
  });
}

fs.rmSync(path.join(outDir, "_stage"), { recursive: true, force: true });
console.log(`Built ${path.join(outDir, "system.json")} and ${zipOut} (${version})`);
