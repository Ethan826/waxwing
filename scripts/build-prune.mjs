import { join } from 'node:path';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { layers } from './structure.mjs';

// Workspace modules live under the layer prefixes plus the style tool's.
// Dependencies (Data, Control, ...) have none of these prefixes, so their
// cached output is never touched.
export const workspacePrefixes = [...layers, 'Style'];

const hasWorkspacePrefix = name =>
  workspacePrefixes.includes(name.split('.')[0]);

// Output directories to delete: every live module's (so each build
// recompiles it, BACKLOG F004) and every workspace-prefixed directory whose
// source is gone (BACKLOG F006).
export const outputsToRemove = (existing, liveModules) =>
  existing.filter(name => liveModules.includes(name)
    || hasWorkspacePrefix(name));

export const pruneOutput = (outputRoot, liveModules) => {
  if (!existsSync(outputRoot)) return;
  const existing = readdirSync(outputRoot);
  outputsToRemove(existing, liveModules).forEach(name =>
    rmSync(join(outputRoot, name), { recursive: true, force: true }));
};
