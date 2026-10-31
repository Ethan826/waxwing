import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalOf, stableStringify } from './r0-canonical.mjs';
import { erase, nodesOf } from './r0-marked-erase.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';

// R0 amin tranche 1, Task 3: every node's marked type, recorded in
// `effects.nodes`, erases to its recorded type. Over the declarations the
// problem pin covers (test/r0-problem-pin-run.mjs): `nodes` has exactly
// the paths of `types`, and at each `erase(nodes(p))` (test/
// r0-marked-erase.mjs) equals `types(p)` in canonical form. The first
// ten mismatches are reported. Corpus-wide, hence serial. Task 4 adds
// the rows erasure cannot see at lambda, handler literal, `with` and
// `handle` nodes, and that no declaration mints a position or an effect
// variable twice (`flexEff`, `positions`).
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');

const programOf = source => {
  try { return resolved(source); } catch { return null; }
};

const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');
const shape = value => {
  if (Array.isArray(value)) return value.map(shape);
  if (value === null || typeof value !== 'object') return value;
  return value.constructor === Object
    ? Object.fromEntries(Object.keys(value).map(n => [n, shape(value[n])]))
    : { [value.constructor.name]: Object.keys(value)
      .map(n => shape(value[n])) };
};
const key = JSON.stringify;
const fresh = (path, role) => ({ Just: [{ EffFresh: [path, role] }] });
const tailRow = (path, role) => ({ labels: [], tail: fresh(path, role) });
const childKey = (path, constructor, field) => key({ ...path,
  steps: [...path.steps, { Named: [constructor] }, { Named: [field] }] });

// A node's rows by its kind; null when the node is none of these kinds.
const kindOf = (nodes, path, mty) => {
  if (nodes.has(childKey(path, 'Lambda', 'body'))) return 'lambda';
  if (nodes.has(childKey(path, 'With', 'body'))) return 'with';
  if (nodes.has(childKey(path, 'Handle', 'body'))) return 'handle';
  return key(mty.MHandler?.[0].mark) === key({ At: [{ Literal: [path] }] })
    ? 'handler' : null;
};
// A lambda's own stages: those before its body's type (a body may itself
// be an arrow, which continues the spine).
const ownStages = (nodes, path, mty) => {
  const body = key(nodes.get(childKey(path, 'Lambda', 'body')));
  const rows = [];
  for (let rest = mty; rest.MArrow && key(rest) !== body;
    rest = rest.MArrow[2]) rows.push(rest.MArrow[1]);
  return rows;
};
const expectedRows = (kind, path, mty, own) => {
  if (kind === 'handler') return key({ inference: tailRow(path,
    { HandlerInference: [] }), clauses: { Just: [tailRow(path,
    { HandlerClauses: [] })] } });
  if (kind !== 'lambda')
    return key({ MVar: [{ FreshVar: [path, { Res: [] }] }] });
  const rows = own.map((_, k) => tailRow(path, k === own.length - 1
    ? { EffectOf: [] } : { Stage: [k] }));
  return key(rows);
};
const actualRows = (kind, mty, own) => {
  if (kind === 'handler') return key(mty.MHandler[1]);
  return key(kind === 'lambda' ? own : mty);
};

const constructsOf = (at, effects, found) => {
  const nodes = new Map(Maps.toUnfoldable(Unfoldable.unfoldableArray)(
    effects.nodes).map(pair => [key(shape(pair.value0)),
    shape(pair.value1)]));
  for (const [pathKey, mty] of nodes) {
    const path = JSON.parse(pathKey);
    const kind = kindOf(nodes, path, mty);
    if (kind === null) continue;
    found.kinds[kind] = (found.kinds[kind] ?? 0) + 1;
    const own = kind === 'lambda' ? ownStages(nodes, path, mty) : [];
    const actual = actualRows(kind, mty, own);
    if (kind === 'lambda' && own.length === 0)
      found.rows.push(`${at} ${pathKey} lambda: no stage`);
    else if (actual !== expectedRows(kind, path, mty, own))
      found.rows.push(`${at} ${pathKey} ${kind}: ${actual}`);
  }
};

// Each minted list's repeated entries.
const repeatsOf = (at, effects) => ['flexEff', 'positions'].flatMap(name => {
  const items = effects[name].map(item => key(shape(item)));
  const distinct = new Set(items).size;
  return items.length === distinct ? []
    : [`${at} ${name}: ${items.length} minted, ${distinct} distinct`];
});

// Every `EffFresh` variable and `At` position a recorded type names (in
// `nodes`, `instances`, `annotations`, `ambient` (Task 8's ambient rows,
// which name a clause's `⟨p, clauses k⟩` and a frame's `Frame p`), the
// declaration's `signature` and the types inside `obligations`),
// by an explicit stack.
const valuesOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => shape(pair.value1));
const namedIn = effects => {
  const named = { flexEff: new Set(), positions: new Set() };
  const pending = ['nodes', 'instances', 'annotations', 'ambient']
    .flatMap(name => valuesOf(effects[name]));
  pending.push(shape(effects.signature));
  // E1's built right sides (Task 7, Generate.Obligation `builtArrow`)
  // name stage variables no node's type does.
  pending.push(...effects.obligations.map(item => shape(item.value)));
  // Task 9's site facts are the homes of two marks (statements §2,
  // ownership table): a literal's own-abort mark `HandlerLit.m` and an
  // installation's frame mark `Install.frame`. They hold a bare
  // position, not an `At`, and a `with` over a handler that is not an
  // `MHandler` names its `Frame p` there only.
  effects.obligations.map(item => shape(item.value)).forEach(value => {
    if (value.HandlerLit) named.positions.add(key(value.HandlerLit[0].m));
    if (value.Install) named.positions.add(key(value.Install[0].frame));
  });
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (value.EffFresh) named.flexEff.add(key(value));
    if (value.At) named.positions.add(key(value.At[0]));
    pending.push(...Object.values(value));
  }
  return named;
};

// A Declared signature names rigids and written marks, never a minted
// variable or position.
const signatureNames = (at, effects) => {
  const found = [];
  const pending = [shape(effects.signature)];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (value.EffFresh || value.At) found.push(`${at} signature names ${
      key(value)}`);
    pending.push(...Object.values(value));
  }
  return found;
};

const unmatchedKind = (at, effects, named, name) => {
  const minted = new Set(effects[name].map(item => key(shape(item))));
  return [...[...minted].filter(item => !named[name].has(item))
    .map(item => `${at} ${name} minted, unnamed: ${item}`),
  ...[...named[name]].filter(item => !minted.has(item))
    .map(item => `${at} ${name} named, unminted: ${item}`)];
};

// What is minted but named by no recorded type, and the reverse.
const unmatchedOf = (at, effects) => {
  const named = namedIn(effects);
  return [...signatureNames(at, effects), ...['flexEff', 'positions']
    .flatMap(name => unmatchedKind(at, effects, named, name))];
};

const keyed = pairs => new Map(pairs.map(([path, value]) =>
  [stableStringify(path), value]));

const mismatchesOf = (at, problem) => {
  const types = keyed(canonicalOf(problem).types);
  const nodes = keyed(nodesOf(Recorded.fields(problem).effects.nodes));
  const found = [];
  for (const [path, ty] of types) {
    if (!nodes.has(path)) { found.push(`${at} ${path}: no node`); continue; }
    const erased = stableStringify(erase(nodes.get(path)));
    if (erased !== stableStringify(ty))
      found.push(`${at} ${path}: erased ${erased}, types`
        + ` ${stableStringify(ty)}`);
  }
  for (const path of nodes.keys())
    if (!types.has(path)) found.push(`${at} ${path}: not in types`);
  return found;
};

const survey = async () => {
  let declarations = 0;
  let paths = 0;
  const mismatches = [];
  const constructs = { kinds: {}, rows: [] };
  const repeats = [];
  const unmatched = [];
  const minted = { flexEff: 0, positions: 0 };
  for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
    const program = programOf(source);
    if (program === null) continue;
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const problem = Elaborating.problem(result.value0);
      declarations += 1;
      paths += canonicalOf(problem).types.length;
      const at = `${origin}#${decl.name}`;
      mismatches.push(...mismatchesOf(at, problem));
      const { effects } = Recorded.fields(problem);
      constructsOf(at, effects, constructs);
      repeats.push(...repeatsOf(at, effects));
      unmatched.push(...unmatchedOf(at, effects));
      minted.flexEff += effects.flexEff.length;
      minted.positions += effects.positions.length;
    }
  }
  return { declarations, paths, mismatches, constructs, repeats, minted,
    unmatched };
};

const found = await survey();

test('erasing every node\'s marked type gives its recorded type', () => {
  assert.ok(found.declarations > 2500, `${found.declarations} declarations`);
  assert.ok(found.paths > 100000, `${found.paths} paths`);
  assert.deepEqual(found.mismatches.slice(0, 10), [],
    `${found.mismatches.length} mismatches`);
});

test('lambda, handler, with and handle nodes carry their own rows', () => {
  const { kinds, rows } = found.constructs;
  for (const kind of ['lambda', 'handler', 'with', 'handle'])
    assert.ok((kinds[kind] ?? 0) > 50, `${kind}: ${kinds[kind]}`);
  assert.deepEqual(rows.slice(0, 10), [], `${rows.length} mismatches`);
});

test('no position or effect variable minted twice', () => {
  const { flexEff, positions } = found.minted;
  assert.ok(flexEff > 10000 && positions > 100, `${flexEff}, ${positions}`);
  assert.deepEqual(found.repeats.slice(0, 10), [],
    `${found.repeats.length} declarations repeat`);
});

test('every minted effect variable and position is named by a recorded '
  + 'type, and every named one is minted', () => {
  const { flexEff, positions } = found.minted;
  assert.ok(flexEff > 10000 && positions > 100, `${flexEff}, ${positions}`);
  assert.deepEqual(found.unmatched.slice(0, 10), [],
    `${found.unmatched.length} unmatched`);
});
