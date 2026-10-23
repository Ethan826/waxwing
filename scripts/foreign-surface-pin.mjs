// Re-pins the src modules allowed a foreign module, with their `foreign
// import` signatures (scripts/forgery.mjs). Build first (node
// scripts/build.mjs). A re-pin widens what may forge a token: review the
// diff of scripts/foreign-surface.json, and the JS behind it, before
// committing.
//
//   node scripts/foreign-surface-pin.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pursGraph } from './structure.mjs';
import { foreignModules, foreignPinFile, foreignSurfaceFindings }
  from './forgery.mjs';

const { graph, error } = pursGraph();
if (error !== undefined) throw new Error(error);
const modules = foreignModules(graph);
const previous = existsSync(foreignPinFile)
  ? JSON.parse(readFileSync(foreignPinFile, 'utf8')) : {};
for (const finding of foreignSurfaceFindings(previous, modules))
  console.log(`changed: ${finding}`);
const unreadable = Object.entries(modules).filter(([, entry]) =>
  entry.error !== undefined);
if (unreadable.length > 0)
  throw new Error(`cannot pin: ${unreadable.map(([name, entry]) =>
    `${name} (${entry.error})`).join('; ')}`);
const pinned = Object.fromEntries(Object.entries(modules).sort()
  .map(([name, entry]) => [name, entry.imports]));
writeFileSync(foreignPinFile, `${JSON.stringify(pinned, null, 1)}\n`);
console.log(`Pinned ${Object.keys(pinned).length} foreign modules in`
  + ` ${foreignPinFile}.`);
