import { readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const src = resolve("src/onboarding-assets");
const dest = resolve("dist/onboarding-assets");

console.log(`Copying onboarding assets from ${src} to ${dest}...`);

function copyDirRecursive(source, destination) {
  mkdirSync(destination, { recursive: true });
  const entries = readdirSync(source);

  for (const entry of entries) {
    const srcPath = join(source, entry);
    const destPath = join(destination, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyDirRecursive(src, dest);
  console.log("Onboarding assets copied successfully.");
} catch (err) {
  console.error("Failed to copy onboarding assets:", err);
  process.exit(1);
}
