import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Lists every line over 80 code points in the .md, .mjs, .js and .wxw
// files: tracked ones, and untracked ones git does not ignore, so verify
// covers files not yet committed (user, 2026-10-20), except docs/writing/,
// the user's own untracked workspace. Usage: node scripts/width.mjs
// [--exclude <file>]. The file names paths to skip, one per line
// (relative to the repository root).
// Skipped always: vendored skills, patches, bootstrap snapshots, generated
// editor snapshots and lock files.
// Exempt, in Markdown outside code fences only: table rows, ATX headings
// (a heading is one line), and a line that is a single unbreakable token or
// one whole `[text](target)` link after its indent and list marker. Inside
// a fence only a line that is one bare URL is exempt.
export const maximumColumns = 80;
const sourceFile = /\.(md|mjs|js|wxw)$/;
const skippedPrefixes = [
  '.agents/', '.claude/skills/', 'docs/patches/', 'bootstrap/',
  'editors/vscode/snapshots/'
];
const privatePrefixes = ['docs/writing/'];
const skippedNames = [
  'spago.lock', 'skills-lock.json', 'bun.lock', 'package-lock.json'
];

const columnsOf = line => [...line].length;
const fence = /^\s*(>\s*)*(`{3,}|~{3,})(.*)$/;
const marker = /^(\s*(>\s*)*([-*+]|\d+[.)])?\s+)/;
const bareUrl = /^\S*:\/\/\S*( \\)?$/;
const wholeLink = /^\[[^\]]*\]\([^)\s]*\)\S*$/;

const unbreakable = line => {
  const rest = line.replace(marker, '').trim();
  return !/\s/.test(rest) || wholeLink.test(rest);
};

const exemptMarkdown = line => line.trimStart().startsWith('|') ||
  /^ {0,3}#{1,6}(\s|$)/.test(line) || unbreakable(line);

// A fence opens with 3 or more backticks or tildes and closes only with the
// same character, at least as many times, and nothing after it.
const fenceStep = (open, line) => {
  const found = fence.exec(line);
  if (!found) return open;
  const [, , run, rest] = found;
  if (open === null) return run;
  const closes = run[0] === open[0] && run.length >= open.length &&
    rest.trim() === '';
  return closes ? null : open;
};

export const wideLinesOf = (file, text) => {
  let open = null;
  return text.split('\n').flatMap((line, index) => {
    if (file.endsWith('.md')) open = fenceStep(open, line);
    const inFence = open !== null;
    const columns = columnsOf(line);
    const exempt = file.endsWith('.md') &&
      (inFence ? bareUrl.test(line.trim()) : exemptMarkdown(line));
    return columns > maximumColumns && !exempt ?
      [`${file}:${index + 1}: ${columns}`] : [];
  });
};

// The files to scan: tracked and untracked, of a scanned kind, neither
// skipped, private nor excluded.
export const scannedFiles = ({ tracked, untracked, excluded }) =>
  [...tracked, ...untracked].filter(file => sourceFile.test(file) &&
    !excluded.has(file) &&
    ![...skippedPrefixes, ...privatePrefixes]
      .some(prefix => file.startsWith(prefix)) &&
    !skippedNames.includes(file.split('/').pop()));

const main = () => {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'],
    { encoding: 'utf8' }).trim();
  const run = args =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  const argumentsList = process.argv.slice(2);
  const excludeAt = argumentsList.indexOf('--exclude');
  const excludedNames = excludeAt < 0 ? '' :
    readFileSync(argumentsList[excludeAt + 1], 'utf8');
  const excluded = new Set(excludedNames.split('\n').filter(Boolean));
  const listed = args => run(['ls-files', '-z', ...args]).split('\0')
    .filter(Boolean);
  const files = scannedFiles({ tracked: listed([]),
    untracked: listed(['--others', '--exclude-standard']), excluded });
  const findings = files.flatMap(file =>
    wideLinesOf(file, readFileSync(`${root}/${file}`, 'utf8')));
  console.log(findings.join('\n'));
  console.log(`${findings.length} lines over ${maximumColumns} columns`
    + ` in ${files.length} files`);
  process.exitCode = findings.length === 0 ? 0 : 1;
};

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
