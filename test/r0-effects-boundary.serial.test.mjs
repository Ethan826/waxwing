import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { declarationsOf, rt8Sources } from './r0-rt8-run.mjs';

// R0 amin tranche 1, Task 5 (Checkpoint A): the blocking boundary. No
// effect checker exists yet, so a handler declaration must never be
// certified: generation emits `Outside HandlerType` (and `Outside
// FailFamily` for `handle`/`fail`), which keeps rule 1 blocking. A
// declaration is in scope when a marked type in its recorded effects
// holds an `MHandler`, or its `outside` list names HandlerType or
// FailFamily. Each in-scope declaration's shadow verdict is not Solved
// and its `outside` holds HandlerType (FailFamily alone only where no
// handler type is recorded). Task 12 extends this to obligations.
// Task 17: the expected cases are also derived from resolved source,
// independently of generation: a generic walk of each resolved
// declaration counts handler literals, `with`, `handle`, `fail` and
// written handler types. A literal, `with` or written handler type needs
// a recorded MHandler and `HandlerType`; only `handle`/`fail` may use
// `FailFamily`; a source case with neither is a breach.
// Corpus-wide (every program decided), hence serial.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

// About 80% of the 276 observed.
const minimum = 220;
// About 80% of the 235 observed.
const handlerFloor = 188;
const siteFloor = 1;
const named = value => value.constructor.name;
const valuesOf = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map)
  .map(pair => pair.value1);

// Whether any `MHandler` sits anywhere in the values, by explicit stack.
const holdsHandler = values => {
  const pending = [...values];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (named(value) === 'MHandler') return true;
    pending.push(...Object.values(value));
  }
  return false;
};

const constructs = { Handler: 'literal', With: 'with', Handle: 'handle',
  Fail: 'fail', THandler: 'type' };
const sourceKinds = Object.values(constructs);

// Which handler constructs occur in a resolved declaration, by an
// explicit stack over the value, matching constructor names.
const constructsOf = decl => {
  const found = new Set();
  const seen = new Set();
  const pending = [decl];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object' || seen.has(value))
      continue;
    seen.add(value);
    const construct = constructs[named(value)];
    if (construct !== undefined) found.add(construct);
    pending.push(...Object.values(value));
  }
  return [...found].sort();
};

const kindsOf = entries => entries.map(entry => named(entry.value));

const factsOf = row => {
  const { tables, signatures } = Inputs.generationInputs(row.program);
  const generated = Generate.generate(tables)(signatures)(row.decl);
  if (named(generated) !== 'Right') return { at: row.at, refused: true };
  const source = constructsOf(row.decl);
  const fields = Recorded.fields(Elaborating.problem(generated.value0));
  const { effects } = fields;
  const kinds = kindsOf(fields.outside);
  const sites = { nodes: holdsHandler(valuesOf(effects.nodes)),
    instances: holdsHandler(valuesOf(effects.instances)),
    annotations: holdsHandler(valuesOf(effects.annotations)) };
  return { at: row.at, kinds, source, solved: describe(row.decision).verdict
    === 'Solved', handler: Object.values(sites).some(Boolean), sites };
};

const survey = async () => {
  const rows = (await rt8Sources()).flatMap(declarationsOf);
  const all = rows.map(factsOf);
  const refused = all.filter(fact => fact.refused).map(fact => fact.at);
  const facts = all.filter(fact => !fact.refused);
  const scoped = facts.filter(fact => fact.handler
    || fact.kinds.includes('HandlerType')
    || fact.kinds.includes('FailFamily'));
  return { facts, scoped, refused };
};

const found = await survey();

// Controller ruling (Task 17): `fail` alone performs the Fail effect and
// is not a handler construct (Failure.purs, E23: a written family that
// translates is not marked), so a `fail`-only declaration is outside the
// boundary: counted and printed, never asserted. `fail` plus another
// construct is judged by that construct. A literal or `with` records a
// node type, so it needs MHandler; a handler type written only in the
// declaration's own signature is not recorded in `effects` (no signature
// field yet), so it needs HandlerType and not Solved only. `handle`
// alone may use FailFamily instead of HandlerType.
const gated = source => source.some(kind => kind !== 'fail');
const recorded = source => ['literal', 'with'].some(k => source.includes(k));
const typed = source => ['literal', 'with', 'type']
  .some(kind => source.includes(kind));
const sourceBreaches = ({ at, kinds, source, solved, handler }) => {
  if (!gated(source)) return [];
  const marked = kinds.includes('HandlerType')
    || (!typed(source) && kinds.includes('FailFamily'));
  const where = `${at} (constructs: ${source.join(', ')}; outside: `
    + `${kinds.join(', ')}; MHandler recorded: ${handler})`;
  return [...(solved ? [`${where}: Solved`] : []),
    ...(recorded(source) && !handler ? [`${where}: no MHandler`] : []),
    ...(marked ? [] : [`${where}: no marker`])];
};

// About 80% of the observed counts (declarations per construct, and in
// all); printed on every run.
const sourceFloors = { all: 250, literal: 150, with: 150, handle: 45,
  fail: 55, type: 55 };

const refusals = ({ at, kinds, solved, handler }) => {
  const marked = kinds.includes('HandlerType')
    || (!handler && kinds.includes('FailFamily'));
  return [...(solved ? [`${at}: Solved`] : []),
    ...(marked ? [] : [`${at}: no HandlerType marker (outside: `
      + `${kinds.join(', ')}; MHandler recorded: ${handler})`])];
};

test('no handler declaration is Solved and each is marked', () => {
  console.log(`effects boundary: ${found.scoped.length} in-scope of `
    + `${found.facts.length} declarations`);
  assert.deepEqual(found.refused.slice(0, 10), [],
    `${found.refused.length} declarations refused by generation`);
  const holding = found.facts.filter(fact => fact.handler);
  const through = site => holding.filter(fact => fact.sites[site]).length;
  console.log(`MHandler recorded in ${holding.length} declarations: `
    + `${through('nodes')} nodes, ${through('instances')} instances, `
    + `${through('annotations')} annotations`);
  assert.ok(holding.length > handlerFloor,
    `only ${holding.length} declarations record an MHandler`);
  for (const site of ['instances', 'annotations'])
    assert.ok(through(site) >= siteFloor, `no MHandler through ${site}`);
  assert.ok(found.scoped.length > minimum,
    `only ${found.scoped.length} in-scope declarations`);
  const failures = found.scoped.flatMap(refusals);
  assert.deepEqual(failures.slice(0, 10), [],
    `${failures.length} breaches`);
});

test('every handler construct in resolved source is blocked', () => {
  const cases = found.facts.filter(fact => fact.source.length > 0);
  const count = kind => cases.filter(f => f.source.includes(kind)).length;
  console.log(`source-derived: ${cases.length} declarations; `
    + sourceKinds.map(kind => `${kind} ${count(kind)}`).join(', '));
  assert.ok(cases.length >= sourceFloors.all,
    `only ${cases.length} source-derived declarations`);
  for (const kind of sourceKinds)
    assert.ok(count(kind) >= sourceFloors[kind],
      `only ${count(kind)} declarations hold a ${kind} construct`);
  const failOnly = cases.filter(fact => !gated(fact.source));
  const signatureOnly = cases.filter(fact => gated(fact.source)
    && !recorded(fact.source) && fact.source.includes('type'));
  console.log(`fail-only (unasserted): ${failOnly.length}, of which `
    + `${failOnly.filter(fact => fact.solved).length} Solved; `
    + `signature-only handler type: ${signatureOnly.length}`);
  const breaches = cases.flatMap(sourceBreaches);
  assert.deepEqual(breaches.slice(0, 10), [],
    `${breaches.length} source-derived breaches`);
});

test('the harness can return Solved outside the boundary', () => {
  const solved = found.facts.filter(fact => fact.solved
    && !found.scoped.includes(fact));
  assert.ok(solved.length > 0, 'no declaration is Solved at all');
});
