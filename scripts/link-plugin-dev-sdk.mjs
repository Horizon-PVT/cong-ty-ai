#!/usr/bin/env node

import { existsSync, mkdirSync, lstatSync, symlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const packageDir = process.cwd();
const sdkDir = join(repoRoot, "packages", "plugins", "sdk");
const scopeDir = join(packageDir, "node_modules", "@paperclipai");
const linkTarget = join(scopeDir, "plugin-sdk");

if (!existsSync(join(packageDir, "package.json"))) {
  throw new Error(`No package.json found in plugin directory: ${packageDir}`);
}

mkdirSync(scopeDir, { recursive: true });

let exists = false;
try {
  lstatSync(linkTarget);
  exists = true;
} catch (e) {
  // doesn't exist
}

if (exists) {
  console.log(`  i @paperclipai/plugin-sdk already exists for ${packageDir}`);
  process.exit(0);
}

const relativeSdkDir = relative(scopeDir, sdkDir);

try {
  symlinkSync(relativeSdkDir, linkTarget, "junction");
  console.log(`  ✓ Linked local @paperclipai/plugin-sdk (junction) for ${packageDir}`);
} catch (err) {
  try {
    symlinkSync(relativeSdkDir, linkTarget, "dir");
    console.log(`  ✓ Linked local @paperclipai/plugin-sdk (symlink) for ${packageDir}`);
  } catch (err2) {
    // Check if it was created by a parallel process
    try {
      lstatSync(linkTarget);
      console.log(`  i @paperclipai/plugin-sdk exists after link attempt for ${packageDir}`);
      process.exit(0);
    } catch (e) {
      // ignore
    }
    console.warn(`  ! Symlink failed, but continuing install: ${err2.message}`);
  }
}
