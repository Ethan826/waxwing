// FX020 migration: which files are corpus, and their areas (one-off;
// Task 7 removes it, R4). Shared by the rewrite tool and the paired
// differential, so both see the same files.
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const skippedDirectories = new Set(['.git', 'node_modules', 'output',
  '.build', '.spago', '.worktrees', 'bootstrap', '.superpowers', '.agents',
  '.claude', 'assets', 'src', 'tools', '.vscode']);
// R3: deliberate bare names in the FX020 tests stay for Task 7; the
// tool's own scripts are not corpus; historical logs (plans, SDD records,
// the progress log) keep their original text (plan, Task 6). ADRs,
// README.md and docs/language.md stay in.
const skippedFiles = [/^test\/fx020-.*\.test\.mjs$/, /^scripts\/fx020-/,
  /^docs\/(plans|sdd)\//, /^docs\/progress\.md$/];
const extensions = /\.(wxw|md|mjs|js)$/;

export const corpusFiles = (root, directory = root) => readdirSync(directory,
  { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  .flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return skippedDirectories.has(entry.name) ? []
        : corpusFiles(root, path);
    }
    const name = relative(root, path);
    return extensions.test(name)
      && !skippedFiles.some(pattern => pattern.test(name)) ? [name] : [];
  });

export const areas = [
  ['examples', /^examples\//], ['negative', /^negative\//],
  ['test fixtures', /^test\/.*\.wxw$/], ['test', /^test\//],
  ['regression', /^scripts\/regression/], ['scripts', /^scripts\//],
  ['editors', /^editors\//], ['docs adr', /^docs\/adr\//],
  ['docs', /\.md$/], ['other', /./]];

export const areaOf = path =>
  areas.find(([, pattern]) => pattern.test(path))[0];
