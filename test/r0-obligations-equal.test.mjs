import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalOf, stableStringify } from './r0-canonical.mjs';
import { erase } from './r0-marked-erase.mjs';
import { decodePath } from './r0-canonical-decode.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { rt8Sources } from './r0-rt8-run.mjs';
import { defectProbes } from './r0-shadow-known.mjs';
import { shape } from './regression-r0-amin-support.mjs';

// R0 amin tranche 1, Task 7: E1 equations. Every `GenEqual` atom has an
// `Equal` obligation recorded beside it (provenance `BesideAtom` with the
// atom's own AtomId) whose two marked sides erase to the atom's two sides,
// in order; the effect-only sites are O1 (`AtSite … ClauseBody`) and O2
// (`WithNode`). The handler literal's node is DEFERRED to Task 9
// (dossier 18.119): no E1 is recorded there, and nothing here covers it.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

const key = JSON.stringify;
const effectsOf = (source, name) => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects;
};
const pairs = map => Maps.toUnfoldable(Unfoldable.unfoldableArray)(map);
const nodeAt = (effects, path) => pairs(effects.nodes).find(pair =>
  key(shape(pair.value0)) === key(shape(path)))?.value1;
const childOf = (path, ...names) => ({ ...path, steps: [...path.steps,
  ...names.map(name => ({ Named: [name] }))] });
const ruleName = rule => `${{ SigRule: 'Sig', ExprRule: 'E',
  PatternRule: 'P' }[rule.constructor.name]}${rule.value0}`;
// An atom's identity: its rule-local AtomId with its rule.
const atomKey = (id, path, rule) => stableStringify({ decl: id.decl,
  path, index: id.index, rule });
const kindOf = item => item.provenance.constructor.name;

const survey = async () => {
  const found = { atoms: 0, sites: [], problems: [], repeats: [] };
  for (const { origin, source } of [...await rt8Sources(), ...defectProbes]) {
    let program;
    try { program = resolved(source); } catch { continue; }
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const problem = Elaborating.problem(result.value0);
      compare(`${origin}#${decl.name}`, problem, found);
    }
  }
  return found;
};

const compare = (at, problem, found) => {
  const { obligations } = Recorded.fields(problem).effects;
  const beside = new Map();
  const here = new Set();
  for (const item of obligations) {
    const id = kindOf(item) === 'BesideAtom'
      ? atomKey(item.provenance.value0,
        decodePath(item.provenance.value0.path), ruleName(item.rule))
      : null;
    if (id === null) {
      const site = shape(item.provenance);
      if (here.has(key(site))) found.repeats.push(`${at}: ${key(site)}`);
      here.add(key(site));
      found.sites.push(site);
      continue;
    }
    if (beside.has(id)) found.problems.push(`${at}: two E1 for ${id}`);
    beside.set(id, item);
  }
  const canonical = canonicalOf(problem);
  const used = new Set();
  for (const entry of [...canonical.b, ...canonical.d]) {
    if (!entry.value.eq) continue;
    found.atoms += 1;
    const id = atomKey(entry.origin.atom, entry.origin.atom.path,
      entry.origin.rule);
    used.add(id);
    const item = beside.get(id);
    if (item === undefined) { found.problems.push(`${at}: no E1 ${id}`);
      continue; }
    const [left, right] = entry.value.eq;
    const erased = [erase(item.value.value0), erase(item.value.value1)];
    if (stableStringify(erased) !== stableStringify([left, right]))
      found.problems.push(`${at}: sides differ at ${id}`);
    if (key(shape(item.span)) !== key(shape(entry.origin.span)) &&
      stableStringify(item.span) !== stableStringify(entry.origin.span))
      found.problems.push(`${at}: span differs at ${id}`);
  }
  for (const id of beside.keys())
    if (!used.has(id)) found.problems.push(`${at}: E1 without atom ${id}`);
};

const found = await survey();

test('E1 beside every GenEqual, sides erasing to the atom\'s', () => {
  assert.ok(found.atoms > 90000, `${found.atoms} equality atoms`);
  assert.deepEqual(found.problems.slice(0, 10), [],
    `${found.problems.length} problems`);
});

test('the only effect-only E1 sites are O1 and O2; the literal is'
  + ' deferred to Task 9', () => {
  const roles = new Set(found.sites.map(site =>
    Object.keys(site.AtSite[0].role)[0]));
  assert.deepEqual([...roles].sort(), ['ClauseBody', 'WithNode']);
  assert.deepEqual(found.repeats.slice(0, 10), [], 'a site repeats');
  assert.ok(found.sites.length > 50, `${found.sites.length} sites`);
});

const log = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Get(a) { fn get(): a; }; type E = E; ';
const o1 = `${log}fn main(): Unit with Console = with handler `
  + 'Get(Handler(Log with Console)) { get() => handler Log '
  + '{ log(n) => Fail.fail(E) } } { with Get.get() { Log.log(1) } };';
const siteOf = (effects, role) => effects.obligations.filter(item =>
  kindOf(item) === 'AtSite' && item.provenance.value0.role.constructor.name
    === role);

test('O1: the clause body against the operation result, rows closed', () => {
  const effects = effectsOf(o1, 'main');
  const [item] = siteOf(effects, 'ClauseBody');
  assert.ok(item, 'no O1 obligation');
  const { path } = item.provenance.value0;
  assert.deepEqual(shape(item.value.value0),
    shape(nodeAt(effects, childOf(path, 'body'))));
  const right = shape(item.value.value1);
  const mark = { Written: [{ FixedM: [] }] };
  assert.equal(key(right.MHandler[0].mark), key(mark));
  assert.equal(right.MHandler[1].clauses.Nothing ? 'none' : 'some', 'none');
  const rows = right.MHandler[1].inference;
  assert.equal(rows.tail.Nothing ? 'closed' : 'open', 'closed');
  assert.equal(rows.labels.length, 1);
  assert.doesNotMatch(key(right), /EffFresh|EffRigid/);
});

test('O2: each with node against its body', () => {
  const source = `${log}fn main(): Unit with Console = { let h0 = `
    + 'handler Log { log(n) => () }; let h = with h0 { handler Log '
    + '{ log(n) => Fail.fail(E) } }; with h { Log.log(1) } };';
  const effects = effectsOf(source, 'main');
  const items = siteOf(effects, 'WithNode');
  assert.equal(items.length, 2);
  for (const item of items) {
    const { path } = item.provenance.value0;
    assert.deepEqual(shape(item.value.value0), shape(nodeAt(effects, path)));
    assert.deepEqual(shape(item.value.value1),
      shape(nodeAt(effects, childOf(path, 'With', 'body'))));
  }
});

test('E1 marked sides: a written Log side keeps Written FixedM', () => {
  const source = `${log}fn mk(): Handler(Log with Console) = `
    + 'handler Log { log(n) => Console.print(n) }; fn main(): Unit = ();';
  const effects = effectsOf(source, 'mk');
  const body = effects.obligations.filter(item =>
    kindOf(item) === 'BesideAtom' && item.rule.value0 === 3);
  const rights = body.map(item => key(shape(item.value.value1)));
  assert.ok(rights.some(text => text.includes(key({ Written: [{ FixedM:
    [] }] }))), `no written M side: ${rights}`);
});
