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
// `perf_hooks`; `Date.now`; every zero-argument `new Date()`, stored
// values included (a labeled amendment: `new Date(x)` reads no clock and
// is outside the rule); `process.hrtime` and `.bigint`; `console.time`,
// `.timeEnd`, `.timeLog`; any import of test/go-timed.mjs or
// test/timing.mjs. Aliases are followed in source order within the file:
// destructuring (`const { now } = performance`), assignment of the object
// (`const p = performance`), and `.bind` (which names the member).
// `global.` is read as `globalThis.`. Bindings are tracked by lexical
// scope (Program, function and parameters, block, catch clause, loop head;
// `var` hoists to its function): a local `performance` hides the root only
// inside its own scope.
//
// Exemptions below name an exact use by file, form and source line, and
// are counted. Each is checked against its own file whether or not the
// scope reaches it, and the gate fails when it matches a different number
// of uses than listed or the file is gone, so a stale or widened exemption
// fails. An exemption outside the scope still exempts nothing there
// (go-timed.mjs is reached only if a parallel test imports it, which is
// itself a finding).
//
// Blind spots (also in docs/engineering.md): a clock reached through a
// module outside test/ (scripts/, compiled output, a child process);
// computed property access with a non-literal key, or eval; a clock root
// passed as a value (`f(performance)`, `{ c: performance }`,
// `[performance]`); `new Date(x)` with arguments (reads no clock);
// elapsed time asserted through a runner timeout (`{ timeout }`,
// spawnSync's `timeout`); dynamic or conditional imports when building the
// scope; `require` or `createRequire` of perf_hooks; a clock read in one
// file whose value is compared in another; an alias made at top level and
// used in a function declared earlier (aliases follow source order);
// non-.mjs modules under test/ (skipped; none exist today). test/timing.mjs
// does not exist yet; its import would be detected if created.

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
// `listed` is the exemption list (the real one unless a test injects).
export const clockFindings = (sources, parse, limits = floors,
  listed = exemptions) => {
  const roots = Object.keys(sources).filter(isParallelTest);
  const scanned = new Map();
  const failures = [];
  const scan = file => {
    try { return scanSource(file, sources[file], parse); } catch (error) {
      failures.push(`${file}: clock gate cannot parse: ${error.message}`);
      return { findings: [], imports: [] };
    }
  };
  for (const pending = [...roots]; pending.length > 0;) {
    const file = pending.pop();
    if (scanned.has(file) || sources[file] === undefined) continue;
    scanned.set(file, scan(file));
    pending.push(...scanned.get(file).imports.filter(target =>
      target.startsWith('test/') && !posix.relative('test', target)
      .startsWith('..')));
  }
  const all = [...scanned.values()].flatMap(result => result.findings);
  // Every exemption is checked against its own file, in scope or not.
  const exempt = listed.flatMap(exemption => {
    if (sources[exemption.file] === undefined)
      return [`clock exemption names a missing file ${exemption.file}`];
    const own = (scanned.get(exemption.file) ?? scan(exemption.file))
      .findings.filter(found => matches(exemption, found));
    return own.length === exemption.count ? [] : [`clock exemption ${
      exemption.file} \`${exemption.line}\` matches ${own.length} uses, `
      + `listed ${exemption.count}`];
  });
  const open = all.filter(found => !listed.some(exemption =>
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
