// Reads a V8 .cpuprofile written by `node --cpu-prof` around the
// paired measurement's worker (docs/plans/2026-11-04-readback-cost-
// proposal.md §2), for attribution only:
//   node scripts/r0-t2-readback-cpuprofile.mjs <file> steps
//   node scripts/r0-t2-readback-cpuprofile.mjs <file> <self|inclusive>
//     <function|module> [count]
//   node scripts/r0-t2-readback-cpuprofile.mjs <file> callers <regex>
//     [depth] [skip regex]
// `steps`: each sample's time under the online step on its stack
// (recheck, readBack, readEffects and the read-back module beneath
// Package; the worker's `itemsOf` is `prepare`), marked [walk] when
// ReadBack.Walk is on the stack. GC samples carry no stack. `callers`:
// the self time of the frames matching <regex>, by their nearest
// ancestors (skipping frames matching the skip regex).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const readBackPrefix = 'Features.Check.Strategy.ReadBack';
const parts = ['EffectRows', 'Marks', 'Images', 'EffectPlaces',
  'EffectSites', 'Instances', 'Bound'].map(part => `${readBackPrefix}.${part}`);

const loaded = file => {
  const profile = JSON.parse(readFileSync(file, 'utf8'));
  const byId = new Map(profile.nodes.map(node => [node.id, node]));
  const parent = new Map();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parent.set(child, node.id);
  const stackOf = id => {
    const stack = [];
    for (let at = id; at !== undefined; at = parent.get(at))
      stack.push(byId.get(at));
    return stack;
  };
  const samples = profile.samples.map((id, index) =>
    ({ stack: stackOf(id), micros: profile.timeDeltas[index] ?? 0 }));
  return samples;
};

// A frame's module: the build directory its index.js or foreign.js sits
// in, else the file name, else the V8 pseudo-frame's name.
const moduleOf = node => {
  const url = node.callFrame.url;
  const built = url.match(/\/([^/]+)\/(index|foreign)\.js$/);
  if (built) return built[1];
  return url === '' ? `(${node.callFrame.functionName})`
    : url.replace(/.*\//, '');
};
const functionOf = node => `${node.callFrame.functionName || '(anon)'} `
  + `${moduleOf(node)}:${node.callFrame.lineNumber}`;

const added = (table, key, micros) =>
  table.set(key, (table.get(key) ?? 0) + micros);

const stepOf = stack => {
  const modules = stack.map(moduleOf);
  if (modules.includes(`${readBackPrefix}.Package`)) {
    const beneath = modules.filter(found => parts.includes(found));
    return `readEffects/${beneath.length === 0 ? 'Package'
      : beneath[beneath.length - 1].slice(readBackPrefix.length + 1)}`;
  }
  if (modules.includes(readBackPrefix)) return 'readBack';
  if (modules.includes('Features.Check.Function')) return 'recheck';
  if (stack.some(node => node.callFrame.functionName === 'itemsOf'))
    return 'prepare';
  return stack[0].callFrame.functionName === '(garbage collector)'
    ? 'gc' : 'other';
};

const steps = samples => {
  const table = new Map();
  for (const { stack, micros } of samples) {
    const walk = stack.some(node =>
      moduleOf(node) === `${readBackPrefix}.Walk`);
    added(table, `${stepOf(stack)}${walk ? ' [walk]' : ''}`, micros);
  }
  return table;
};

const keyed = { function: functionOf, module: moduleOf };

const self = (samples, key) => {
  const table = new Map();
  for (const { stack, micros } of samples)
    added(table, key(stack[0]), micros);
  return table;
};

// Each key once per sample, however often it recurs on the stack.
const inclusive = (samples, key) => {
  const table = new Map();
  for (const { stack, micros } of samples)
    for (const found of new Set(stack.map(key)))
      added(table, found, micros);
  return table;
};

const callers = (samples, pattern, depth, skip) => {
  const table = new Map();
  for (const { stack, micros } of samples) {
    if (!pattern.test(functionOf(stack[0]))) continue;
    const above = stack.slice(1).map(functionOf)
      .filter(found => skip === undefined || !skip.test(found))
      .slice(0, depth);
    added(table, above.join(' <- '), micros);
  }
  return table;
};

const printed = (table, total, count) => [...table]
  .sort((one, other) => other[1] - one[1]).slice(0, count)
  .forEach(([key, micros]) => console.log(
    `${(micros / 1e6).toFixed(2).padStart(7)} s `
      + `${(100 * micros / total).toFixed(1).padStart(5)}%  ${key}`));

if (process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, mode, ...rest] = process.argv.slice(2);
  const samples = loaded(file);
  const total = samples.reduce((sum, sample) => sum + sample.micros, 0);
  console.log(`total ${(total / 1e6).toFixed(1)} s, ${samples.length} samples`);
  if (mode === 'steps') printed(steps(samples), total, 40);
  else if (mode === 'callers')
    printed(callers(samples, new RegExp(rest[0]), Number(rest[1] ?? 1),
      rest[2] === undefined ? undefined : new RegExp(rest[2])), total, 25);
  else {
    const tables = { self, inclusive };
    if (tables[mode] === undefined || keyed[rest[0]] === undefined)
      throw new Error(`unknown mode ${mode} ${rest[0]}`);
    printed(tables[mode](samples, keyed[rest[0]]), total,
      Number(rest[1] ?? 40));
  }
}
