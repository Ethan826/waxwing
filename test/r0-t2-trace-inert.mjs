// Tranche 2 Task 7 (design §C.4, §I Task 3d; dossier §18.155 (4)): the
// production trace's inertness and coverage over the R0 corpus, shared by
// test/r0-t2-trace-inert.serial.test.mjs, its pin script
// (scripts/r0-t2-trace-inert-pin.mjs) and the restored-defect probe
// (test/regression-r0-t2-gates.mjs). `traceRun(load, corpus)` takes a
// module loader, so each reads the compiler it is given only.
//
// Per corpus-loader declaration (`origin#name`, every function of every
// program that parses and resolves), a SHA-256 of `recheck`'s outcome
// with the trace taken away: the checked declaration and the final
// `State` less its `trace` field, or the refusal's diagnostic. A build
// without collection (the pre-trace commit) has no `trace` to take, so
// both encode the same way. Plus the finished trace's entry counts per
// kind (every entry under every key). Corpus-observed.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const inertFixture = 'test/fixtures/r0/t2-trace-inert.json';
export const repinProcedure = 'node scripts/r0-t2-trace-inert-pin.mjs'
  + ' <scratch dir outside the worktree> (a reviewed re-pin: the digests'
  + ' must move only with the corpus; see the header of'
  + ' test/r0-t2-trace-inert.serial.test.mjs)';

// Coverage, corpus-observed (Task 6's and 6b's runs): every entry under
// every key of the finished traces, summed over the corpus's
// declarations. A dropped recorder call (`traced`, `appliedAt`,
// `pipedAt`, Clauses `file`, Defer `checkDefer`, Install `install`) moves
// a count; a change is reviewed, never re-pinned to pass.
export const pinnedEntries = { uses: 40287, applied: 815, piped: 160,
  clauses: 220, deferrals: 51, installations: 208 };

const sha = text => createHash('sha256').update(text).digest('hex');

// The pinned corpus's identity: the SHA-256 of its manifest
// (test/fixtures/r0/corpus-manifest.json), so a corpus re-pin is seen.
export const corpusHash = () => sha(readFileSync(
  join(root, 'test/fixtures/r0/corpus-manifest.json')));

// Plain data from compiled PureScript values: a map as its [key, value]
// pairs in key order, a constructor as { Name: [fields] }, a record's
// fields sorted by label (a record is a set of fields). A function value
// has no encoding, so meeting one fails the run rather than dropping it.
const shaper = (Maps, unfoldableArray) => {
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map);
  const isMap = value => value instanceof Maps.Leaf
    || value instanceof Maps.Node;
  const pair = item => [shape(item.value0), shape(item.value1)];
  const field = value => name => [name, shape(value[name])];
  const shape = value => {
    if (Array.isArray(value)) return value.map(shape);
    if (isMap(value)) return pairs(value).map(pair);
    if (typeof value === 'function')
      throw new Error('a function value in recheck\'s outcome');
    if (value === null || typeof value !== 'object') return value;
    if (value.constructor === Object)
      return Object.fromEntries(Object.keys(value).sort().map(field(value)));
    const fields = Object.keys(value).map(name => shape(value[name]));
    return { [value.constructor.name]: fields };
  };
  return shape;
};

export const traceRun = async (load, corpus) => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const { recheck } = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const Maps = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const shape = shaper(Maps, unfoldableArray);
  const sizes = map => Maps.toUnfoldable(unfoldableArray)(map)
    .reduce((sum, item) => sum + item.value1.length, 0);
  const digests = {};
  const zero = () => Object.fromEntries(Object.keys(pinnedEntries)
    .map(kind => [kind, 0]));
  // `counts`: the finished trace's entries; `collected`: the raw trace's
  // in the final `State`, before `finish` (a baseline that only skips
  // `finish` still collects, and shows here).
  const counts = zero();
  const collected = zero();
  const add = (into, traced) => {
    if (traced !== undefined)
      for (const kind of Object.keys(into))
        into[kind] += sizes(traced[kind]);
  };
  const repeated = [];
  const outcome = found => {
    if (found.constructor.name !== 'Right')
      return { refused: shape(found.value0) };
    const { trace, ...state } = found.value0.state;
    add(counts, found.value0.trace);
    add(collected, trace);
    return { function: shape(found.value0.function), state: shape(state) };
  };
  for (const { origin, source } of corpus) {
    const parsed = parse(source);
    if (parsed.constructor.name !== 'Right') continue;
    const resolved = resolve(parsed.value0);
    if (resolved.constructor.name !== 'Right') continue;
    const program = resolved.value0;
    const holders = functional(program.ctors);
    for (const decl of program.functions) {
      const key = `${origin}#${decl.name}`;
      if (key in digests) repeated.push(key);
      digests[key] = sha(JSON.stringify(outcome(
        recheck(holders)(program)(decl))));
    }
  }
  return { digests, counts, collected, repeated };
};
