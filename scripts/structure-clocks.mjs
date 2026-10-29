import { posix } from 'node:path';
import { scanSource } from './clock-scan.mjs';

// Clock gate (docs/plans/2026-10-29-verify-timing-proposal.md, 1b): no
// parallel-phase test reads a clock. Timing bounds belong in
// `*.serial.test.mjs` files, which verify runs one at a time.
//
// Scope: every test/*.test.mjs that does not end in .serial.test.mjs, and
// every module under test/ it imports, transitively, by relative static
// import (`import … from` and `export … from`).
//
// Finding: `performance.now`, `.timeOrigin`, `.mark`, `.measure`;
// `globalThis.performance`; any import of `node:perf_hooks` or
// `perf_hooks`; `Date.now`; `new Date()` used in arithmetic or
// comparison; `process.hrtime` and `.bigint`; `console.time`, `.timeEnd`,
// `.timeLog`; any import of test/go-timed.mjs or test/timing.mjs. Aliases
// are followed in source order within the file: destructuring
// (`const { now } = performance`), assignment of the object
// (`const p = performance`), and `.bind` (which names the member).
// A name bound anywhere in the file (a declaration, parameter or import)
// is local, so `performance` as an unrelated variable is not a clock.
//
// Exemptions below name an exact use by file, form and source line, and
// are counted: the gate fails when one matches a different number of
// uses than listed, so a stale or widened exemption fails. An exemption
// whose file is outside the scope is dormant (go-timed.mjs is reached only
// if a parallel test imports it, which is itself a finding).
//
// Blind spots (also in docs/engineering.md): a clock reached through a
// module outside test/ (scripts/, compiled output, a child process);
// computed property access with a non-literal key, or eval; `new Date()`
// read by method (`.getTime()`) or with arguments; elapsed time asserted
// through a runner timeout (`{ timeout }`, spawnSync's `timeout`);
// dynamic or conditional imports when building the scope; a clock read in
// one file whose value is compared in another; aliases made in a nested
// scope that source order does not follow.

// Floors on what the scan saw, so an empty or truncated scan cannot pass.
// They fall only with the owner's approval.
export const floors = { parallelTests: 250, scanned: 380 };

// Author-approved (dossier §18.115). Load can change how far shrinking
// proceeds; nothing fails on time. go-timed's two `performance.now()`
// reads have no exemption.
export const exemptions = [
  { file: 'test/fx-shrink.mjs', form: 'Date.now', count: 1,
    line: 'const deadline = Date.now() + limitMs;' },
  { file: 'test/fx-shrink.mjs', form: 'Date.now', count: 1,
    line: 'if (++calls > budget || Date.now() > deadline) return current;' },
  { file: 'test/go-timed.mjs', form: 'Date.now', count: 1,
    line: 'appendFileSync(go, `// cache nonce ${process.pid} '
      + '${Date.now()}\\n`);' }
];

const serialSuffix = '.serial.test.mjs';
const isParallelTest = file => /^test\/[^/]+\.test\.mjs$/.test(file)
  && !file.endsWith(serialSuffix);

const matches = (exemption, found) => exemption.file === found.file
  && exemption.form === found.form && exemption.line === found.text;

// `sources` maps each path under test/ to its text. Returns finding text.
export const clockFindings = (sources, parse, limits = floors) => {
  const roots = Object.keys(sources).filter(isParallelTest);
  const scanned = new Map();
  const failures = [];
  for (const pending = [...roots]; pending.length > 0;) {
    const file = pending.pop();
    if (scanned.has(file) || sources[file] === undefined) continue;
    try { scanned.set(file, scanSource(file, sources[file], parse)); } catch
    (error) {
      scanned.set(file, { findings: [], imports: [] });
      failures.push(`${file}: clock gate cannot parse: ${error.message}`);
    }
    pending.push(...scanned.get(file).imports.filter(target =>
      target.startsWith('test/') && !posix.relative('test', target)
      .startsWith('..')));
  }
  const all = [...scanned.values()].flatMap(result => result.findings);
  const exempt = exemptions.filter(exemption =>
    scanned.has(exemption.file)).flatMap(exemption => {
    const used = all.filter(found => matches(exemption, found));
    return used.length === exemption.count ? [] : [`clock exemption ${
      exemption.file} \`${exemption.line}\` matches ${used.length} uses, `
      + `listed ${exemption.count}`];
  });
  const open = all.filter(found => !exemptions.some(exemption =>
    matches(exemption, found)));
  const floorFailures = [
    ...(roots.length < limits.parallelTests ? [`clock gate saw ${
      roots.length} parallel test files, floor ${limits.parallelTests}`]
      : []),
    ...(scanned.size < limits.scanned ? [`clock gate scanned ${
      scanned.size} files, floor ${limits.scanned}`] : [])];
  return [...failures, ...exempt, ...floorFailures, ...open.map(found =>
    `${found.file}:${found.line}: clock read in a parallel-phase test (${
    found.form}); move the timing to a *.serial.test.mjs file`)];
};

// The checkStructure entry: reads test/ from `files` (paths from filesUnder)
// and loads acorn when called, so a missing install fails verify's own
// version check first.
export const clockGate = async (files, readText) => {
  const { parse } = await import('acorn');
  return clockFindings(Object.fromEntries(files.filter(file =>
    file.startsWith('test/') && file.endsWith('.mjs')).map(file =>
    [file, readText(file)])), parse);
};
