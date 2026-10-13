import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Lists every line over 80 code points in the tracked .md, .mjs, .js and
// .wxw files. Usage: node scripts/width.mjs [--exclude <file>]. The file
// names paths to skip, one per line; phase 1 of the 80-column sweep skips
// the files the Text branch changes.
const maximumColumns = 80;
const sourceFile = /\.(md|mjs|js|wxw)$/;
const skippedPrefixes = [
  '.agents/', '.claude/skills/', 'docs/patches/', 'bootstrap/'
];
const skippedNames = [
  'spago.lock', 'skills-lock.json', 'bun.lock', 'package-lock.json'
];

const argumentsList = process.argv.slice(2);
const excludeAt = argumentsList.indexOf('--exclude');
const excludedNames = excludeAt < 0 ? '' :
  readFileSync(argumentsList[excludeAt + 1], 'utf8');
const excluded = new Set(excludedNames.split('\n').filter(Boolean));

const inScope = file => sourceFile.test(file) && !excluded.has(file) &&
  !skippedPrefixes.some(prefix => file.startsWith(prefix)) &&
  !skippedNames.includes(file.split('/').pop());

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(inScope);

const wideLines = file =>
  readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
    const columns = [...line].length;
    return columns > maximumColumns ? [`${file}:${index + 1}: ${columns}`] : [];
  });

const findings = tracked.flatMap(wideLines);

console.log(findings.join('\n'));
console.log(`${findings.length} lines over ${maximumColumns} columns`
  + ` in ${tracked.length} files`);
process.exitCode = findings.length === 0 ? 0 : 1;
