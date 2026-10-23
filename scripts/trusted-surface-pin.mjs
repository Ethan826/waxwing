// Re-pins the token boundary's trusted surface (scripts/trusted-surface.mjs):
// writes, for each allowed importer of a token Internal module, its source
// export list and compiled export names, and prints what changed. Build
// first (node scripts/build.mjs). A re-pin widens what may build tokens:
// review the diff of scripts/trusted-surface.json before committing.
//
//   node scripts/trusted-surface-pin.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { builtModules, pursGraph, trustedImporters } from './structure.mjs';
import { manifestFile, surfaceFindings, surfaceOf }
  from './trusted-surface.mjs';

const { graph, error } = pursGraph();
if (error !== undefined) throw new Error(error);
const importers = trustedImporters(graph, builtModules('output'));
const previous = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
const pinned = Object.fromEntries(Object.entries(importers).sort()
  .map(([name, { source, js }]) => [name, surfaceOf(name, source, js)]));
for (const finding of surfaceFindings(previous, importers))
  console.log(`changed: ${finding}`);
writeFileSync(manifestFile, `${JSON.stringify(pinned, null, 1)}\n`);
console.log(`Pinned ${Object.keys(pinned).length} allowed importers in`
  + ` ${manifestFile}.`);
