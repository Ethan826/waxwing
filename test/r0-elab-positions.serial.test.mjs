import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalOf } from './r0-canonical.mjs';
import { decodeType, decodeVar } from './r0-canonical-decode.mjs';
import { loadCorpus } from './r0-corpus.mjs';
import { key, load, mentioned, resolved } from './r0-generate-support.mjs';
import { siteKey, sitesOf } from './r0-elab-walk.mjs';

// R0 Task 7.1b, D1 spec §10 over the pinned corpus (and one probe, for
// E18's `LambdaBody`, which no corpus program has), with no witness from
// a search. T5 (Pos): `v ∉ requests` iff T-R0b's stored position is
// `Auxiliary`, and a stored non-auxiliary position is among
// `positionsOf e ! v`; only §12.2's two predicted disagreements, each
// asserted by name, are allowed. T5b (Pos): bound to a marker of its
// own, each requested variable lands exactly at the sites `positionsOf`
// names, read off `build`'s IR. T12 (§3.3): every `ParamType`,
// `LambdaBody`, `RestType` and `ClauseParamType` entry of the site
// table is a single handle, a written annotation's translation, or `{
// ...h }`; a `RigidName` entry is a rigid variable. Corpus-wide, hence
// serial.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const { build } = await load('Domain.Elaborating.Build');
const Atom = await load('Domain.Recorded.Atom');
const Witness = await load('Domain.Verdict.Witness');
const MapM = await load('Data.Map.Internal');
const SetM = await load('Data.Set');
const { unfoldableArray } = await load('Data.Unfoldable');
const { foldableArray } = await load('Data.Foldable');
const { Tuple } = await load('Data.Tuple');

const named = value => value.constructor.name;
const pairs = map => MapM.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
const fresh = variable => 'fresh' in variable;
const rootName = { body: 'InBody', parameters: 'InParameters',
  result: 'InResult', constraints: 'InConstraints', joined: 'InJoined' };
const pathKey = path => [rootName[path.root], ...path.steps];
// A stored (canonical) position as `siteKey` writes a compiled site.
const positionKey = position => {
  if (position === 'auxiliary') return JSON.stringify(['Auxiliary']);
  const [[form, value]] = Object.entries(position);
  const upper = form[0].toUpperCase() + form.slice(1);
  if (form === 'rigidName') return JSON.stringify([upper, value]);
  return JSON.stringify(Array.isArray(value)
    ? [upper, pathKey(value[0]), ...value.slice(1)]
    : [upper, pathKey(value)]);
};

// The corpus has no bare `crash` (E18's `LambdaBody`), so one inline
// probe, kept out of the pinned corpus, joins it.
const probes = [{ origin: 'probe:crash-reference',
  source: 'fn f(): (Int) -> Int = crash;\nfn main(): Int = 0;\n' }];
const sources = [...await loadCorpus(), ...probes];
const declarations = sources.flatMap(({ origin, source }) => {
  let program;
  try { program = resolved(source); } catch { return []; }
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.map(decl => ({ at: `${origin}#${decl.name}`,
    decl, elaborating: Generate.generate(tables)(signatures)(decl).value0 }));
});

const positionsOf = elaborating => new Map(pairs(
  Elaborating.positionsOf(elaborating)).map(([variable, sites]) =>
  [key(decodeVar(variable)), new Set(SetM.toUnfoldable(unfoldableArray)(
    sites).map(siteKey))]));

// §12.2's predicted disagreements: E28's `⟨p, rest⟩` is stored
// `Auxiliary` but is the removal's checked type; P4's `⟨p, inst i⟩` is
// stored at `Slot p i`, which a checked constructor pattern does not
// have, so it is read only where a field's type mentions it.
const predicted = (variable, info) => {
  const role = variable.fresh?.role;
  if (info.origin.rule === 'E28' && role === 'rest') return 'E28 rest';
  if (info.origin.rule === 'P4' && role?.inst !== undefined) return 'P4 inst';
  return null;
};

test('T5: requests and stored positions agree, but for §12.2\'s rows', t => {
  const found = { 'E28 rest': 0, 'P4 inst': 0 };
  const unexpected = [];
  let checked = 0;
  for (const { at, elaborating } of declarations) {
    const problem = canonicalOf(Elaborating.problem(elaborating));
    const positions = positionsOf(elaborating);
    for (const [variable, info] of problem.vars) {
      if (info.quant !== 'exists') continue;
      checked += 1;
      const read = positions.get(key(variable));
      const stored = positionKey(info.position);
      const auxiliary = info.position === 'auxiliary';
      const agrees = (read === undefined) === auxiliary
        && (auxiliary || read.has(stored));
      if (agrees) continue;
      const row = predicted(variable, info);
      if (row === null) unexpected.push(`${at} ${key(variable)} ${stored}`);
      else found[row] += 1;
    }
  }
  t.diagnostic(`${checked} flexible variables; disagreements by row: `
    + JSON.stringify(found));
  assert.ok(checked > 20000, `${checked} variables`);
  assert.deepEqual(unexpected.slice(0, 10), []);
  assert.ok(found['E28 rest'] > 0 && found['P4 inst'] > 0);
});

// T5b's markers: a type variable is bound to a declared type no program
// has; a record variable to a record of one label no program writes.
const markerBase = 1000000;
const markerLabel = index => `§${index}`;
const markerOf = (info, index) => new Witness.Inline(
  info.sort === 'type'
    ? new Atom.Base(new Atom.DataBase(markerBase + index))
    : new Atom.Record([new Tuple(markerLabel(index),
      new Atom.Base(Atom.IntBase.value))], []));

// The markers a compiled type holds anywhere, rows included.
const markersIn = ty => {
  const found = new Set();
  const visit = value => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (named(value) === 'TData' && value.value0 >= markerBase)
      found.add(value.value0 - markerBase);
    if (named(value) === 'Tuple' && typeof value.value0 === 'string'
      && value.value0.startsWith('§'))
      found.add(Number(value.value0.slice(1)));
    Object.values(value).forEach(visit);
  };
  visit(ty);
  return found;
};

test('T5b: each requested variable lands where positionsOf says', t => {
  let variables = 0;
  const wrong = [];
  for (const { at, decl, elaborating } of declarations) {
    const problem = Elaborating.problem(elaborating);
    const requested = SetM.toUnfoldable(unfoldableArray)(
      Elaborating.requests(elaborating));
    const infos = new Map(canonicalOf(problem).vars.map(([variable,
      info]) => [key(variable), info]));
    const bindings = MapM.fromFoldable(Atom.ordVar)(foldableArray)(
      requested.map((variable, index) => new Tuple(variable,
        markerOf(infos.get(key(decodeVar(variable))), index))));
    const built = build(elaborating)({ bindings, names: [] });
    assert.equal(named(built), 'Right', at);
    const landed = new Map();
    for (const site of sitesOf(decl, built.value0)) {
      if (['Inner', 'Static'].includes(JSON.parse(site.key)[0])) continue;
      for (const index of markersIn(site.ty))
        landed.set(index, (landed.get(index) ?? new Set()).add(site.key));
    }
    const positions = positionsOf(elaborating);
    requested.forEach((variable, index) => {
      variables += 1;
      const expected = [...positions.get(key(decodeVar(variable)))].sort();
      const found = [...(landed.get(index) ?? [])].sort();
      if (JSON.stringify(expected) !== JSON.stringify(found))
        wrong.push(`${at} ${key(decodeVar(variable))}`);
    });
  }
  t.diagnostic(`${variables} requested variables`);
  assert.ok(variables > 20000, `${variables} variables`);
  assert.deepEqual(wrong.slice(0, 10), []);
});

const single = ty => 'tvar' in ty && fresh(ty.tvar);
const shapes = {
  ParamType: ty => single(ty) || mentioned(ty).every(found => !fresh(found)),
  LambdaBody: single,
  RestType: ty => 'record' in ty && ty.record.fields.length === 0
    && ty.record.tails.length === 1 && fresh(ty.record.tails[0]),
  RigidName: ty => 'tvar' in ty && !fresh(ty.tvar)
};
// A clause parameter's declared type under its handler's `θ`: every
// variable is the handler's own `⟨p, inst j⟩`.
const clauseShape = (path, ty) => mentioned(ty).every(found => fresh(found)
  && found.fresh.role.inst !== undefined
  && JSON.stringify(pathKey(found.fresh.path)) === JSON.stringify(path));

test('T12: the site table\'s entries have §3.3\'s shapes', t => {
  const counts = {};
  const wrong = [];
  for (const { at, elaborating } of declarations)
    for (const [site, recorded] of pairs(elaborating.sites)) {
      const [form, path] = JSON.parse(siteKey(site));
      const ty = decodeType(recorded);
      const shaped = form === 'ClauseParamType' ? clauseShape(path, ty)
        : shapes[form]?.(ty);
      if (shaped === undefined) continue;
      counts[form] = (counts[form] ?? 0) + 1;
      if (!shaped) wrong.push(`${at} ${siteKey(site)}`);
    }
  t.diagnostic(`site-table entries by kind: ${JSON.stringify(counts)}`);
  assert.deepEqual(wrong.slice(0, 10), []);
  for (const form of ['ParamType', 'LambdaBody', 'RestType',
    'ClauseParamType'])
    assert.ok(counts[form] > 0, `no ${form} entry`);
});
