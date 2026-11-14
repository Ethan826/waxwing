// Scope A Stage 0 (dossier §18.196; design §4 D6 as amended, §17.4).
// Evidence only. For each program membership.json lists, generates each
// declaration's problem with the committed checker, takes the unifier's
// candidate (as oracle O-A does), and reports which programs fail:
// - D6.2/D6.3 at a head (effect-row argument, record-row head, holder);
// - 4′ after substitution: an arrow, handler head, holder head or holder
//   base inside an `app` argument;
// - 8 after substitution: a record inside an `app` argument;
// - 0e: a declaration reachable from an in-scope head, through
//   constructor fields, that the Lean model's `FT` cannot express: one
//   with a record-row parameter (the only way a field holds a record
//   tail), or a field with effect-row arguments.
// A control program for each condition must be flagged, or the run
// fails.
// usage: node research/r0-scope-a/stage0-membership.mjs <membership.json>
import { readFileSync } from 'node:fs';
import { sourcesOf } from '../../test/r0-effects-pin-run.mjs';
import { load, problemsOf, resolved } from '../../test/r0-generate-support.mjs';
import { decodeType, decodeVar } from '../../test/r0-canonical-decode.mjs';
import { stubsFrom } from '../../test/r0-stubs.mjs';
import { g0From } from '../../test/r0-g0-support.mjs';

const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const Inputs = await load('Features.Check.Generate.Inputs');
const MapM = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const named = value => value.constructor.name;
const key = variable => JSON.stringify(variable);

// Declarations reachable from `id` through constructor fields.
const reachable = (tables, start) => {
  const seen = new Set();
  const visitTy = ty => {
    switch (named(ty)) {
      case 'TData':
        visit(ty.value0);
        ty.value1.forEach(visitTy);
        if (ty.value2.length > 0) seen.add(`rows:${ty.value0}`);
        break;
      case 'TFun': visitTy(ty.value0); visitTy(ty.value2); break;
      case 'TRecord':
        ty.value0.fields.forEach(pair => visitTy(pair.value1)); break;
      default: break;
    }
  };
  const visit = id => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const ctor of tables.types[id].ctors)
      tables.ctors[ctor].fields.forEach(visitTy);
  };
  visit(start);
  return seen;
};
const unexpressible = (tables, id) => [...reachable(tables, id)].some(
  entry => typeof entry === 'string'
    || tables.types[entry].sorts.some(sort => named(sort) === 'RecordSort'));

// Terms after the candidate: a bound type variable is replaced, and a
// bound row tail is spliced (its fields after the record's own, as
// `under` in Candidate.purs). Revised after the Stage 0 review (design
// §17.6): tails were not spliced at first.
const under = (image, ty) => {
  if ('tvar' in ty) {
    const bound = image.get(key(ty.tvar));
    return bound === undefined ? ty : under(image, bound);
  }
  if ('fun' in ty) return { fun: { params: ty.fun.params
    .map(part => under(image, part)), result: under(image, ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(arg => under(image, arg)) } };
  if ('record' in ty) {
    let fields = ty.record.fields
      .map(([label, field]) => [label, under(image, field)]);
    let tails = [];
    for (const tail of ty.record.tails) {
      const bound = image.get(key(tail));
      if (bound === undefined) { tails.push(tail); continue; }
      const row = under(image, bound).record;
      fields = fields.concat(row.fields);
      tails = tails.concat(row.tails);
    }
    return { record: { fields, tails } };
  }
  return ty;
};
const isType = value => ['tvar', 'fun', 'app', 'record', 'base']
  .some(tag => tag in value);
const underAll = (image, value) => {
  if (Array.isArray(value)) return value.map(item => underAll(image, item));
  if (value === null || typeof value !== 'object') return value;
  if (isType(value)) return under(image, value);
  return Object.fromEntries(Object.entries(value)
    .map(([name, item]) => [name, underAll(image, item)]));
};
// The splice itself, on a synthetic term: `{ x: Int, ...s }` with `s`
// bound to `{ y: L(Int -> Int) }` must show an arrow inside an `app`.
const spliceControl = () => {
  const s = { fresh: 's' };
  const image = new Map([[key(s), { record: { fields: [['y', { app: {
    head: { data: 0 }, args: [{ fun: { params: [{ base: 'Int' }],
      result: { base: 'Int' } } }] } }]], tails: [] } }]]);
  const term = under(image, { record: { fields: [['x', { base: 'Int' }]],
    tails: [s] } });
  return apps(term).some(({ node }) => node.args
    .some(arg => within(arg, v => 'fun' in v)));
};

// Every `app` node in a value, with whether it is inside an argument.
const apps = (value, found = [], inside = false) => {
  if (Array.isArray(value)) value.forEach(item => apps(item, found, inside));
  else if (value !== null && typeof value === 'object') {
    if ('app' in value) {
      found.push({ node: value.app, inside });
      value.app.args.forEach(arg => apps(arg, found, true));
    } else Object.values(value).forEach(item => apps(item, found, inside));
  }
  return found;
};
const within = (value, test) => {
  if (Array.isArray(value)) return value.some(item => within(item, test));
  if (value === null || typeof value !== 'object') return false;
  return test(value) || Object.values(value).some(item => within(item, test));
};

const flagsOf = (source, origin) => {
  const program = resolved(source);
  const { tables } = Inputs.generationInputs(program);
  const flags = new Set();
  for (const { decl, problem } of problemsOf(program)) {
    const holding = problem.holders.holding;
    let image = new Map();
    try {
      const recorded = stubs.recorded.problem(source, decl.name);
      const candidate = g0.candidateOf(recorded);
      image = new Map(MapM.toUnfoldable(unfoldableArray)(candidate)
        .map(pair => [key(decodeVar(pair.value0)),
          decodeType(pair.value1)]));
    } catch { flags.add('noCandidate'); }
    const terms = [problem.d, problem.b, problem.bq].flat()
      .map(entry => JSON.parse(JSON.stringify(entry.value)));
    const substituted = underAll(image, terms);
    // 0e through nullary declared bases too (`Reach.base`), revised
    // after the Stage 0 review: at first only `app` heads were followed.
    if (within(substituted, v => 'base' in v && typeof v.base === 'object'
      && unexpressible(tables, v.base.data)))
      flags.add('reachesUnexpressible');
    for (const { node } of apps(substituted)) {
      const head = node.head.data;
      if (head === undefined) { flags.add('handlerHead'); continue; }
      const info = tables.types[head];
      if (info.rowParameters.length > 0) flags.add('effectRowHead');
      if (info.sorts.some(sort => named(sort) === 'RecordSort'))
        flags.add('recordRowHead');
      if (holding.includes(head)) flags.add('holderHead');
      if (unexpressible(tables, head)) flags.add('reachesUnexpressible');
      for (const arg of node.args) {
        if (within(arg, v => 'fun' in v)) flags.add('arrowInArgument');
        if (within(arg, v => 'record' in v)) flags.add('recordInArgument');
        if (within(arg, v => 'app' in v && v.app.head.data === undefined))
          flags.add('handlerInArgument');
        if (within(arg, v => 'base' in v && typeof v.base === 'object'
          && holding.includes(v.base.data))) flags.add('holderBaseInArgument');
      }
    }
  }
  void origin;
  return [...flags].sort();
};

const controls = {
  holderBaseInArgument: 'type F = F(Unit -> Unit);\ntype L(a) = N | C(a);'
    + '\nfn f(x: L(F)): L(F) = x;\nfn main(): Unit = ();\n',
  recordInArgument: 'type L(a) = N | C(a);\nfn f(x: L({ y: Int })):'
    + ' L({ y: Int }) = x;\nfn main(): Unit = ();\n',
  reachesUnexpressible: 'type R(...r) = R({ x: Int, ...r });\ntype L(a) ='
    + ' N | C(a, R({ y: Int }));\nfn f(x: L(Int)): L(Int) = x;'
    + '\nfn main(): Unit = ();\n',
  holderHead: 'type W(a) = W(a, Unit -> Unit);\nfn f(x: W(Int)): W(Int) = x;'
    + '\nfn main(): Unit = ();\n',
};
// Reachability through a nullary declared base (the reviewer's control).
const baseControl = flagsOf('type R(...r) = R({ x: Int, ...r });\n'
  + 'type N0 = N0(R({ y: Int }));\ntype L(a) = N | C(a);\n'
  + 'fn f(x: L(N0)): L(N0) = x;\nfn main(): Unit = ();\n')
  .includes('reachesUnexpressible');
const controlResults = Object.fromEntries(Object.entries(controls)
  .map(([flag, source]) => [flag, flagsOf(source, flag).includes(flag)]));
controlResults.reachesThroughBase = baseControl;
controlResults.spliceShowsArrow = spliceControl();

const membership = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const listed = new Set(membership.rows.map(row => row.origin));
const rows = [];
for (const source of (await sourcesOf()).filter(s => listed.has(s.origin)))
  rows.push({ origin: source.origin, flags: flagsOf(source.source) });
const excluding = ['effectRowHead', 'recordRowHead', 'holderHead',
  'handlerHead', 'arrowInArgument', 'recordInArgument',
  'handlerInArgument', 'holderBaseInArgument', 'reachesUnexpressible',
  'noCandidate'];
const inScope = rows.filter(row => !row.flags.some(f => excluding.includes(f)));
const byFlag = Object.fromEntries(excluding.map(flag => [flag,
  rows.filter(row => row.flags.includes(flag)).map(row => row.origin)]));
console.log(JSON.stringify({ listed: listed.size, generated: rows.length,
  inScope: inScope.length, byFlag,
  noCandidate: rows.filter(row => row.flags.includes('noCandidate'))
    .map(row => row.origin),
  controls: controlResults, inScopeOrigins: inScope.map(row => row.origin) },
null, 1));
process.exitCode = Object.values(controlResults).every(Boolean) ? 0 : 1;
