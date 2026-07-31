#!/usr/bin/env node
/**
 * prisma generate --schema ../database/schema.prisma writes into
 * database/node_modules. Nest runs from backend/, so we link the
 * generated client into backend/node_modules without editing the locked schema.
 */
const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');
const srcPrisma = path.join(repoRoot, 'database/node_modules/.prisma');
const srcClient = path.join(repoRoot, 'database/node_modules/@prisma/client');
const destPrisma = path.join(backendRoot, 'node_modules/.prisma');
const destClient = path.join(backendRoot, 'node_modules/@prisma/client');

function linkOrCopy(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[sync-prisma] missing source: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.rmSync(dest, { recursive: true, force: true });
  try {
    fs.symlinkSync(src, dest, 'dir');
    console.log(`[sync-prisma] linked ${path.relative(backendRoot, dest)} -> ${src}`);
  } catch {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`[sync-prisma] copied ${path.relative(backendRoot, dest)}`);
  }
}

linkOrCopy(srcPrisma, destPrisma);
linkOrCopy(srcClient, destClient);
