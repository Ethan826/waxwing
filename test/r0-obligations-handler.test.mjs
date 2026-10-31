import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { shape } from './regression-r0-amin-support.mjs';
import { childPath, installProblems, literalProblems }
  from './r0-obligations-handled.mjs';
import { namedPositions, survey } from './r0-obligations-handler-survey.mjs';
import { routeProblems } from './r0-obligations-routes.mjs';

// R0 amin tranche 1, Task 9: the handler family (statements §4 E3, E4,
// E5; design note docs/plans/2026-10-30-task-9-literal-design.md, its
// direction approved in dossier §18.124). What these tests establish,
// on the recorded effect problem only: a literal's marked type is its
// node's type and reaches its uses by identity along the routes tested
// here (A5's `let`/local, a block's result, a record literal's fields,
// a lambda's result, all corpus-wide with marks; a `with`'s handler
// child, A2) or through one moving rule's E1 (A1: a call argument, E5,
// on one fixture); no E1 is recorded at the literal's node (A3). Each
// literal records `HandlerLit` and its clause rows' E4 consumptions,
// its clause rows the clauses' own ambient rows; each `with` records
// `Install` and, over an MHandler, E5's InstallR and installed-C site,
// else `UnframedInstall`. Other moving rules' E1s are Task 7's tests.
// Recorded, not judged: no validator reads these yet, and nothing here
// is an effect-soundness result.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const Maps = await load('Data.Map.Internal');
const Unfoldable = await load('Data.Unfoldable');

// Key order differs between records built apart, so compare stably.
const key = stableStringify;
const effectsOf = (source, name = 'main') => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects;
};
const keyed = map => new Map(Maps.toUnfoldable(Unfoldable.unfoldableArray)(
  map).map(pair => [key(shape(pair.value0)), shape(pair.value1)]));
const body = (...steps) => childPath({ root: { InBody: [] }, steps: [] },
  ...steps);
const kinds = effects => effects.obligations.map(item =>
  item.value.constructor.name);
// The shared shape checks over one declaration, with their counts.
const handled = effects => {
  const found = { literals: 0, installs: 0, framed: 0 };
  const facts = { at: 'fixture', effects, nodes: keyed(effects.nodes),
    ambient: keyed(effects.ambient), found };
  return { problems: [...literalProblems(facts), ...installProblems(facts)],
    found };
};

const log = 'type E = E; effect Log { fn log(n: Int): Unit; }; ';
// The design note's separating example (§2).
const separating = `${log}fn pass(h: Handler(Log with Fail(E))): `
  + 'Handler(Log with Fail(E)) = h; fn main(): Unit with Console = { '
  + 'let h = handler Log { log(n) => Fail.fail(E) }; let g = pass(h); '
  + 'with h { defer Log.log(1); () } };';
const pLit = body('Block', 'items', 0, 'Let', 'value');
const pCall = body('Block', 'items', 1, 'Let', 'value');
const pWith = body('Block', 'result');

test('A1: the argument E1 joins the literal to pass\'s parameter', () => {
  const effects = effectsOf(separating);
  const nodes = keyed(effects.nodes);
  const instance = keyed(effects.instances).get(key(pCall));
  const [item, extra] = effects.obligations.filter(entry =>
    key(shape(entry.value)).includes(key({ Literal: [pLit] }))
    && entry.value.constructor.name === 'Equal');
  assert.ok(item, 'no E1 names Literal p_lit');
  assert.equal(extra, undefined, 'more than one E1 names Literal p_lit');
  const placed = shape(item.provenance).BesideAtom;
  assert.deepEqual([placed?.[0], placed?.[1].path],
    [{ ExprRule: [5] }, pCall]);
  assert.deepEqual(shape(item.value.value0), nodes.get(key(pLit)));
  assert.deepEqual(shape(item.value.value1), instance.parameters[0]);
});

test('A2: the installed handler is the literal\'s type, mark included',
  () => {
    const effects = effectsOf(separating);
    const nodes = keyed(effects.nodes);
    const installed = nodes.get(key(childPath(pWith, 'With', 'handler')));
    const mark = installed.MHandler[0].mark;
    assert.deepEqual(mark, { At: [{ Literal: [pLit] }] },
      `installed handler's mark is ${key(mark)}, not At (Literal p_lit)`);
    assert.deepEqual(installed, nodes.get(key(pLit)));
    const [install] = effects.obligations.filter(item =>
      item.value.constructor.name === 'Install');
    assert.ok(install, 'no Install recorded');
    assert.deepEqual(shape(install.value).Install[0].handler, installed);
  });

test('A3, A4: HandlerLit and its consumptions, no E1, at the literal',
  () => {
    const effects = effectsOf(separating);
    const { problems, found } = handled(effects);
    assert.deepEqual(problems, []);
    assert.deepEqual(found, { literals: 1, installs: 1, framed: 1 });
    const lit = effects.obligations.find(item =>
      item.value.constructor.name === 'HandlerLit');
    assert.deepEqual(shape(lit.provenance).AtSite[0].path, pLit);
    assert.equal(shape(lit.value).HandlerLit[0].clauseRows.length, 1);
  });

// A literal with two clauses, installed directly (`with handler …`).
const direct = 'effect Ask { fn ask(): Int; fn tell(n: Int): Unit; }; '
  + 'fn main(): Int = with handler Ask { ask() => 1, tell(n) => () } '
  + '{ Ask.ask() };';

test('HandlerLit: per-clause ClauseIntoR and ClauseIntoC', () => {
  const effects = effectsOf(direct);
  const { problems, found } = handled(effects);
  assert.deepEqual(problems, []);
  assert.deepEqual(found, { literals: 1, installs: 1, framed: 1 });
  const sites = effects.obligations.map(item =>
    shape(item.provenance).AtSite?.[0].role.Consumed?.[0])
    .filter(site => site?.ClauseIntoR || site?.ClauseIntoC);
  assert.deepEqual(sites.map(key).sort(), [{ ClauseIntoC: [0] },
    { ClauseIntoC: [1] }, { ClauseIntoR: [0] }, { ClauseIntoR: [1] }]
    .map(key));
});

// Install over an MHandler: a literal (above), a let-bound literal (the
// separating example), an owned C (§12.1's N1 source: mk()'s ResultC)
// and a parameter without an owned C (C is R's bare alias).
const owned = 'effect Log { fn log(n: Int): Unit; }; '
  + 'effect Ask { fn ask(): Int; }; '
  + 'fn mk(): Handler(nofail Ask with Log + ...s) with pure = '
  + 'handler Ask { ask() => { Log.log(1); 1 } }; '
  + 'fn use(): Unit with Log = with mk() { defer Ask.ask(); () }; '
  + 'fn main(): Unit = ();';
const parameter = 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn framed(h: Handler(Log)): Unit = with h { Log.log(1) }; '
  + 'fn main(): Unit = ();';
const installedC = effects => shape(effects.obligations.find(item =>
  shape(item.provenance).AtSite?.[0].role.Consumed?.[0].AtInstalledC)
  ?.value)?.Consume[0];

test('Install: frame, handler, ambient; InstallR and the installed C', () => {
  const ownedC = effectsOf(owned, 'use');
  assert.deepEqual(handled(ownedC).problems, []);
  assert.equal(handled(ownedC).found.framed, 1);
  const instance = keyed(ownedC.instances).get(key(body('With', 'handler')));
  const resultC = instance.result.MHandler[1].clauses.Just?.[0];
  assert.ok(resultC, 'mk()\'s instance records no ResultC');
  assert.deepEqual(installedC(ownedC)?.source, resultC);
  const alias = effectsOf(parameter, 'framed');
  assert.deepEqual(handled(alias).problems, []);
  const handler = keyed(alias.nodes).get(key(body('With', 'handler')));
  assert.deepEqual(handler.MHandler[1].clauses, { Nothing: [] });
  assert.deepEqual(installedC(alias)?.source, handler.MHandler[1].inference);
  assert.deepEqual(installedC(alias)?.bare, true);
});

// A `with` whose handler is not an MHandler when generation reads it.
const unframed = 'effect Log { fn log(n: Int): Unit; }; '
  + 'fn f(b: Bool, h: Handler(Log)): Unit = '
  + '{ let k = if b then h else h; with k { Log.log(1) } }; '
  + 'fn main(): Unit = ();';

test('a non-MHandler with: Install and UnframedInstall, no InstallR', () => {
  const effects = effectsOf(unframed, 'f');
  const { problems, found } = handled(effects);
  assert.deepEqual(problems, []);
  assert.deepEqual(found, { literals: 0, installs: 1, framed: 0 });
  assert.ok(kinds(effects).includes('Unsupported'));
  assert.ok(!key(effects.obligations.map(item => shape(item.provenance)))
    .includes('InstallR'));
});

// Review 1 P1-1: a literal as a block's result, a record field and a
// lambda's result keeps its type, mark included, on each route.
const routed = 'effect Log { fn log(n: Int): Unit; }; fn main(): Unit = '
  + '{ let h = { handler Log { log(n) => () } }; let r = { k: handler Log '
  + '{ log(n) => () } }; let f = fn(u: Unit) => handler Log { log(n) => () '
  + '}; with h { Log.log(1) } };';

test('identity routes: block result, record field, lambda result', () => {
  const program = resolved(routed);
  const decl = program.functions.find(item => item.name === 'main');
  const nodes = keyed(effectsOf(routed).nodes);
  const counts = { blocks: 0, fields: 0, lambdas: 0 };
  assert.deepEqual(routeProblems('fixture', decl, nodes, counts), []);
  assert.deepEqual(counts, { blocks: 3, fields: 1, lambdas: 1 });
  const lit = body('Block', 'items', 0, 'Let', 'value', 'Block', 'result');
  const mark = nodes.get(key(body('Block', 'result', 'With', 'handler')))
    .MHandler[0].mark;
  assert.deepEqual(mark, { At: [{ Literal: [lit] }] },
    `installed handler's mark is ${key(mark)}, not At (Literal p_lit)`);
});

const positions = effects => shape(effects.positions).map(item => key(item));

test('§12.1 N5: the let-bound failing handler records HandlerLit', () => {
  const source = `${log}fn main(): Unit with Console = { let h = handler `
    + 'Log { log(n) => Fail.fail(E) }; with h { defer Log.log(1); () } };';
  const effects = effectsOf(source);
  assert.ok(kinds(effects).includes('HandlerLit'));
  const nodes = keyed(effects.nodes);
  const use = nodes.get(key(body('Block', 'result', 'With', 'handler')));
  assert.deepEqual(use.MHandler[0].mark, { At: [{ Literal: [pLit] }] });
  assert.deepEqual(handled(effects).problems, []);
});

test('positions: none minted twice, exactly those named', () => {
  for (const [source, name] of [[separating, 'main'], [direct, 'main'],
    [owned, 'use'], [parameter, 'framed'], [unframed, 'f']]) {
    const effects = effectsOf(source, name);
    const minted = positions(effects);
    assert.equal(minted.length, new Set(minted).size, `${name}: twice`);
    assert.deepEqual([...new Set(minted)].sort(),
      [...namedPositions(effects)].sort(), `${name}: minted ≠ named`);
  }
});

const found = await survey();

test('corpus: A5, routes, HandlerLit, Install and positions', t => {
  t.diagnostic(`locals ${found.locals}, blocks ${found.blocks}, fields `
    + `${found.fields}, lambdas ${found.lambdas}, literals `
    + `${found.literals}, installs ${found.installs} (framed `
    + `${found.framed}), positions ${found.positions}`);
  assert.deepEqual(found.problems.slice(0, 10), [],
    `${found.problems.length} problems`);
  // Floors, so an empty survey cannot pass: about 80% of the counts
  // observed when they were set (locals 531, blocks 1346, fields 19404,
  // lambdas 646, literals 317, installs 317, framed 297).
  assert.ok(found.locals > 424, `${found.locals} let-bound locals`);
  assert.ok(found.blocks > 1076, `${found.blocks} blocks`);
  assert.ok(found.fields > 15523, `${found.fields} record-literal fields`);
  assert.ok(found.lambdas > 516, `${found.lambdas} lambdas`);
  assert.ok(found.literals > 253, `${found.literals} literals`);
  assert.ok(found.installs > 253, `${found.installs} installs`);
  assert.ok(found.framed > 237, `${found.framed} framed installs`);
  assert.ok(found.installs > found.framed, 'no unframed install');
});
