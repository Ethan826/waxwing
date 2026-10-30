import { posix } from 'node:path';
import { scanSource } from './clock-scan.mjs';

// Clock gate (docs/engineering.md "Verification contract"). Every clock
// read under test/ belongs to one command and one category in
// test/fixtures/timing-inventory.json, and the gate checks the match.
//
// Scope. Parallel: every top-level test/*.test.mjs that is neither
// *.serial.test.mjs nor *.perf.test.mjs, plus every module under test/ it
// imports, transitively, by relative static import (`import … from` and
// `export … from`). Serial: the same for *.serial.test.mjs. Regression: the
// same for test/regression.mjs and test/regression-*.mjs, which verify's
// regression phase runs. Perf: the same for *.perf.test.mjs and for
// test/perf-regression.mjs (the perf-side regression proofs). A module
// reached from several scopes takes the strictest (parallel, serial,
// regression, perf, in that order). Every routine scope (all but perf)
// shares the serial scope's allowed categories.
//
// Policy. A clock read must match a use in the inventory (file, form,
// source line text, count), and the use's category must be allowed in the
// file's scope: parallel, `functional clock use` only (a named exception,
// never a whole-file one); serial and regression, also `termination
// safeguard` and `diagnostics only`; perf, every category. `growth check`
// is allowed only for an import of test/growth.mjs and for the clock reads
// inside test/growth.mjs itself. So an absolute bound cannot sit in a
// routine file, and elapsed times are compared against a threshold in
// routine code only inside test/growth.mjs; the listed functional uses
// (fx-shrink's deadline) compare a time with a limit that fails nothing,
// and go-timed's `buildMs` is returned and compared only in perf files
// (nothing enforces that last point: see the limits). Importing growth.mjs
// is allowed only from files the inventory lists. Every top-level
// *.perf.test.mjs file must be listed in `perfFiles`, the count must equal
// `floors.perfFiles` exactly, and each must reach at least one listed
// `absolute budget` or `existing ratio check` use, so a perf file cannot
// be emptied of its bound unnoticed. An unlisted read, a listed use that no
// longer matches (a different count, a missing file, a changed line) and a
// listed file or timeout line that is gone are findings, so a stale or
// widened entry fails. Entries are checked against their own file whether or
// not a scope reaches it.
//
// Finding forms: `performance.now`, `.timeOrigin`, `.mark`, `.measure`;
// `globalThis.performance`; any import of `node:perf_hooks` or
// `perf_hooks`; `Date.now`; every zero-argument `new Date()`, stored values
// included (`new Date(x)` reads no clock and is outside the rule);
// `process.hrtime` and `.bigint`, `process.uptime`, `process.cpuUsage`,
// `process.resourceUsage`; `console.time`, `.timeEnd`, `.timeLog`;
// `Temporal.Now`; a call of `Date()` without `new`; `os.uptime` (a named
// import of `uptime` from `node:os`/`os`, or a member of an imported `os`);
// any import of test/go-timed.mjs, test/growth.mjs or test/timing.mjs.
// Aliases and lexical scopes: scripts/clock-scan.mjs.
//
// Limits (also in docs/engineering.md). The gate sees syntax, not intent:
// it cannot judge whether a listed use really is a termination safeguard,
// cannot tell a generous timeout from a tight one (the margin of about ten
// times the measured time is a review guideline), cannot see a duration a
// child process reports in its output, cannot stop misuse of a listed
// helper (go-timed's returned `buildMs` compared in a routine file, a
// growth call with a lax threshold), and does not check the growth
// threshold, which is reviewed. Timeouts (`timeout:`, `setTimeout` kills)
// read no clock; the inventory lists them for review and the gate only
// checks that the listed line still exists. Also blind: a clock reached
// through a module outside test/ (scripts/, compiled output, a child
// process); computed property access with a non-literal key, or eval; a
// clock root passed as a value (`f(performance)`); elapsed time asserted
// through a runner timeout; dynamic imports and `require`/`createRequire`
// (so `import('node:os')`); a clock read in one file compared in another;
// an alias made at top level and used in a function declared earlier;
// other clock sources (`Atomics.wait`, `setInterval` counting, `fs` mtimes).

// Floors on what the scan saw, so an empty or truncated scan cannot pass.
// They fall only with the owner's approval.
export const floors = { parallelTests: 250, scanned: 380, perfFiles: 26 };
// perfFiles is exact: a file added or removed changes it with the owner's
// approval.

const routine = ['functional clock use', 'termination safeguard',
  'diagnostics only', 'growth check'];
const allowedIn = {
  parallel: ['functional clock use'],
  serial: routine,
  regression: routine,
  perf: null,
  unreached: routine
};
const serialSuffix = '.serial.test.mjs';
const perfSuffix = '.perf.test.mjs';
const topLevelTest = file => /^test\/[^/]+\.test\.mjs$/.test(file);
const isPerf = file => topLevelTest(file) && file.endsWith(perfSuffix);
const isPerfEntry = file => file === 'test/perf-regression.mjs';
const isRegression = file => /^test\/regression(-[^/]*)?\.mjs$/.test(file);
const isSerial = file => topLevelTest(file) && file.endsWith(serialSuffix);
const isParallel = file => topLevelTest(file) && !isPerf(file)
  && !isSerial(file);

export const emptyInventory = { uses: [], perfFiles: [], timeouts: [],
  outOfScope: [] };

const parallelHint = 'move the timing to a *.serial.test.mjs file';
const unlistedHint = {
  parallel: `clock read in a parallel-phase test (FORM); ${parallelHint}`,
  serial: 'clock read in a serial test (FORM) that the timing inventory '
    + 'does not list',
  regression: 'clock read in a regression-phase module (FORM) that the '
    + 'timing inventory does not list',
  perf: 'clock read in a perf file or helper (FORM) that the timing '
    + 'inventory does not list',
  unreached: 'clock read (FORM) that the timing inventory does not list'
};

// Compares one file's findings with its listed uses, group by group (same
// form and line text). Returns finding texts and the category of each
// matched read.
const compare = (file, found, listed, scope) => {
  const texts = [];
  const groups = new Map();
  const groupOf = (form, line) => {
    const name = `${form}\t${line}`;
    if (!groups.has(name)) groups.set(name, { form, line, found: [],
      listed: [] });
    return groups.get(name);
  };
  found.forEach(use => groupOf(use.form, use.text).found.push(use));
  listed.forEach(entry => groupOf(entry.form, entry.line).listed.push(entry));
  for (const group of groups.values()) {
    const total = group.listed.reduce((sum, entry) =>
      sum + (entry.count ?? 1), 0);
    if (group.listed.length === 0) {
      group.found.forEach(use => texts.push(`${file}:${use.line}: ${
        unlistedHint[scope].replace('FORM', use.form)}`));
    } else if (group.found.length !== total) {
      texts.push(`clock inventory ${file} \`${group.line}\` matches ${
        group.found.length} uses, listed ${total}`);
    } else {
      const categories = group.listed.flatMap(entry =>
        Array(entry.count ?? 1).fill(entry.category));
      group.found.forEach((use, at) => {
        const allowed = allowedIn[scope];
        if (categories[at] === 'growth check' && file !== 'test/growth.mjs'
          && use.form !== 'import test/growth.mjs')
          texts.push(`${file}:${use.line}: a direct clock read (${use.form}) `
            + 'labeled growth check; only test/growth.mjs reads a clock for '
            + 'it, and callers import it');
        else if (allowed !== null && !allowed.includes(categories[at]))
          texts.push(`${file}:${use.line}: ${categories[at]} use in a ${
            scope} test (${use.form}); only ${allowed.join(', ')} may read `
            + 'a clock there');
      });
    }
  }
  return texts;
};

// `sources` maps each path under test/ to its text; `outside` is the set of
// existing paths elsewhere (for out-of-scope entries). Returns finding text.
export const clockFindings = (sources, parse, limits = floors,
  inventory = emptyInventory, outside = new Set()) => {
  const failures = [];
  const scans = new Map();
  const scan = file => {
    if (!scans.has(file)) {
      try { scans.set(file, scanSource(file, sources[file], parse)); } catch (
        error) {
        failures.push(`${file}: clock gate cannot parse: ${error.message}`);
        scans.set(file, { findings: [], imports: [] });
      }
    }
    return scans.get(file);
  };
  const reach = roots => {
    const seen = new Set();
    for (const pending = [...roots]; pending.length > 0;) {
      const file = pending.pop();
      if (seen.has(file) || sources[file] === undefined) continue;
      seen.add(file);
      pending.push(...scan(file).imports.filter(target =>
        target.startsWith('test/')
        && !posix.relative('test', target).startsWith('..')));
    }
    return seen;
  };
  const files = Object.keys(sources);
  const parallel = reach(files.filter(isParallel));
  const serial = reach(files.filter(isSerial));
  const regression = reach(files.filter(isRegression));
  const perf = reach(files.filter(file => isPerf(file) || isPerfEntry(file)));
  const scopeOf = file => parallel.has(file) ? 'parallel'
    : serial.has(file) ? 'serial' : regression.has(file) ? 'regression'
      : perf.has(file) ? 'perf' : 'unreached';
  const listedFiles = [...new Set(inventory.uses.map(use => use.file))];
  const checked = new Set([...parallel, ...serial, ...regression, ...perf,
    ...listedFiles]
    .filter(file => sources[file] !== undefined));
  const missing = listedFiles.filter(file => sources[file] === undefined)
    .map(file => `clock inventory names a missing file ${file}`);
  const comparisons = [...checked].sort().flatMap(file => compare(file,
    scan(file).findings, inventory.uses.filter(use => use.file === file),
    scopeOf(file)));
  return [...failures, ...missing, ...comparisons,
    ...perfFileFindings(files.filter(isPerf), inventory.perfFiles),
    ...files.filter(isPerf).filter(file => !hasBound(reach([file]),
      inventory.uses)).map(file => `${file}: a perf file must reach a `
      + 'listed absolute budget or ratio use; it has none'),
    ...timeoutFindings(sources, inventory.timeouts),
    ...outOfScopeFindings(inventory.outOfScope, outside),
    ...floorFindings(files, scans.size, limits)];
};

const boundCategories = ['absolute budget', 'existing ratio check'];
const hasBound = (reached, uses) => uses.some(use => reached.has(use.file)
  && boundCategories.includes(use.category));

const perfFileFindings = (present, listed) => [
  ...present.filter(file => !listed.includes(file)).map(file =>
    `${file}: perf file missing from the timing inventory (perfFiles)`),
  ...listed.filter(file => !present.includes(file)).map(file =>
    `clock inventory lists a missing perf file ${file}`)];

const timeoutFindings = (sources, timeouts) => timeouts.flatMap(entry => {
  if (sources[entry.file] === undefined)
    return [`clock inventory names a missing file ${entry.file}`];
  return sources[entry.file].split('\n').some(line =>
    line.trim() === entry.line) ? [] : [`clock inventory timeout ${
    entry.file} \`${entry.line}\` is gone`];
});

const outOfScopeFindings = (entries, outside) => entries
  .filter(entry => !outside.has(entry.file)).map(entry =>
    `clock inventory names a missing file ${entry.file}`);

const floorFindings = (files, scanned, limits) => [
  ...(files.filter(isParallel).length < limits.parallelTests ? [`clock gate `
    + `saw ${files.filter(isParallel).length} parallel test files, floor ${
      limits.parallelTests}`] : []),
  ...(scanned < limits.scanned ? [`clock gate scanned ${scanned} files, `
    + `floor ${limits.scanned}`] : []),
  ...(files.filter(isPerf).length !== limits.perfFiles ? [`clock gate saw ${
    files.filter(isPerf).length} perf files, expected exactly ${
    limits.perfFiles}`] : [])];

// The checkStructure entry: reads test/ from `files` (paths from filesUnder)
// and loads acorn when called, so a missing install fails verify's own
// version check first.
export const clockGate = async (files, readText) => {
  const { parse } = await import('acorn');
  const inventory = JSON.parse(readText(
    'test/fixtures/timing-inventory.json'));
  return clockFindings(Object.fromEntries(files.filter(file =>
    file.startsWith('test/') && file.endsWith('.mjs')).map(file =>
    [file, readText(file)])), parse, floors, inventory, new Set(files));
};
