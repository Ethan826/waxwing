// Scope A implementation, task 1 (dossier §18.198; proposal §8): the two
// allowlists, predicted before any source change by a JS model of the
// narrowing that is separate from the PureScript implementation.
// - admitted: declared, no effect-row or record-row parameter, not a
//   holder, and every declaration reachable through constructor fields
//   (type arguments, record fields, nullary declared types) free of
//   record-row parameters and effect-row arguments;
// - a node keeps `DataApplication` unless its head is admitted and its
//   arguments hold no arrow, handler, record, or head or nullary base
//   that is not admitted (read on the recorded terms, before
//   substitution, as generation sees them);
// - exposure: the same test on the terms after the unifier's candidate
//   (oracle O-A's candidate) blocks Solved as `Outside DataApplication`.
// It predicts, for every declaration whose recorded problem has a
// `DataApplication` marker today, whether the marker survives and the
// verdict that follows. Read-only; prints JSON.
// usage: node research/r0-scope-a/allowlists.mjs <baseline-dump.json>
//          <in-scope-stage0.json>
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

// The admitted set, from the tables and the holder set.
const admittedOf = (tables, holding) => {
  const expressible = new Map();
  const fieldsOk = id => {
    const reached = new Set();
    let ok = true;
    const visitTy = ty => {
      switch (named(ty)) {
        case 'TData':
          if (ty.value2.length > 0) ok = false;
          visit(ty.value0);
          ty.value1.forEach(visitTy);
          break;
        case 'TFun': visitTy(ty.value0); visitTy(ty.value2); break;
        case 'TRecord':
          ty.value0.fields.forEach(pair => visitTy(pair.value1)); break;
        default: break;
      }
    };
    const visit = u => {
      if (reached.has(u)) return;
      reached.add(u);
      if (tables.types[u].sorts.some(s => named(s) === 'RecordSort'))
        ok = false;
      for (const ctor of tables.types[u].ctors)
        tables.ctors[ctor].fields.forEach(visitTy);
    };
    visit(id);
    return ok;
  };
  const admitted = new Set();
  tables.types.forEach((info, id) => {
    if (!expressible.has(id)) expressible.set(id, fieldsOk(id));
    if (info.rowParameters.length === 0
      && !info.sorts.some(s => named(s) === 'RecordSort')
      && !holding.includes(id) && expressible.get(id)) admitted.add(id);
  });
  return admitted;
};

const within = (value, test) => {
  if (Array.isArray(value)) return value.some(item => within(item, test));
  if (value === null || typeof value !== 'object') return false;
  return test(value) || Object.values(value).some(item => within(item, test));
};
// A node's head needs `DataApplication` (record-row heads are
// `DataOverRecords` instead and are not counted here).
const violates = (admitted, tables, node) => {
  const head = node.head.data;
  if (head === undefined) return false; // a handler head: HandlerType
  if (tables.types[head].sorts.some(s => named(s) === 'RecordSort'))
    return false;
  if (!admitted.has(head)) return true;
  return node.args.some(arg => within(arg, v => 'fun' in v
    || 'record' in v
    || ('app' in v && (v.app.head.data === undefined
      || !admitted.has(v.app.head.data)))
    || ('base' in v && typeof v.base === 'object'
      && !admitted.has(v.base.data))));
};
const appNodes = (value, found = []) => {
  if (Array.isArray(value)) value.forEach(item => appNodes(item, found));
  else if (value !== null && typeof value === 'object') {
    if ('app' in value) found.push(value.app);
    Object.values(value).forEach(item => appNodes(item, found));
  }
  return found;
};
const under = (image, ty) => {
  if ('tvar' in ty) {
    const bound = image.get(key(ty.tvar));
    return bound === undefined ? ty : under(image, bound);
  }
  if ('fun' in ty) return { fun: { params: ty.fun.params
    .map(t => under(image, t)), result: under(image, ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(t => under(image, t)) } };
  if ('record' in ty) {
    let fields = ty.record.fields.map(([l, t]) => [l, under(image, t)]);
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
const isType = v => ['tvar', 'fun', 'app', 'record', 'base']
  .some(tag => tag in v);
const underAll = (image, value) => {
  if (Array.isArray(value)) return value.map(item => underAll(image, item));
  if (value === null || typeof value !== 'object') return value;
  if (isType(value)) return under(image, value);
  return Object.fromEntries(Object.entries(value)
    .map(([name, item]) => [name, underAll(image, item)]));
};

const [dumpFile, scopeFile] = process.argv.slice(2);
const dump = JSON.parse(readFileSync(dumpFile, 'utf8')).declarations;
const scope = JSON.parse(readFileSync(scopeFile, 'utf8'));
const inScope = new Set(scope.origins);

const declarations = [];
const programs = [];
for (const source of await sourcesOf()) {
  let program;
  try { program = resolved(source.source); } catch { continue; }
  const { tables } = Inputs.generationInputs(program);
  let found;
  try { found = problemsOf(program); } catch { continue; }
  let allSolved = true;
  let touched = false;
  const seen = new Map();
  for (const { decl, problem } of found) {
    const base = `${source.origin}#${decl.name}`;
    seen.set(base, (seen.get(base) ?? 0) + 1);
    const at = seen.get(base) === 1 ? base : `${base}#${seen.get(base)}`;
    const old = dump[at];
    const kinds = problem.outside.map(entry => entry.value);
    if (!kinds.includes('DataApplication')) {
      if (old && old.r0.verdict !== 'Solved') allSolved = false;
      continue;
    }
    touched = true;
    const admitted = admittedOf(tables, problem.holders.holding);
    const terms = [problem.d, problem.b, problem.bq,
      problem.types.map(pair => pair[1])];
    const keeps = appNodes(terms).some(n => violates(admitted, tables, n));
    let exposed = false;
    if (!keeps) {
      try {
        const candidate = g0.candidateOf(stubs.recorded.problem(
          source.source, decl.name));
        const image = new Map(MapM.toUnfoldable(unfoldableArray)(candidate)
          .map(p => [key(decodeVar(p.value0)), decodeType(p.value1)]));
        exposed = appNodes(underAll(image, terms.slice(0, 3)))
          .some(n => violates(admitted, tables, n));
      } catch { exposed = null; }
    }
    const others = [...new Set(kinds.filter(k => k !== 'DataApplication'))];
    const oldVerdict = old ? old.r0.verdict : null;
    let newVerdict = oldVerdict;
    if (!keeps && exposed === false && oldVerdict !== null) {
      newVerdict = oldVerdict
        .replace(/, Outside DataApplication|Outside DataApplication, /, '')
        .replace(/^Unresolved Unsupported Outside DataApplication$/,
          'Solved (predicted, if nothing else blocks)');
    }
    if (newVerdict !== 'Solved (predicted, if nothing else blocks)')
      allSolved = false;
    declarations.push({ at, keeps, exposed, others, oldVerdict, newVerdict,
      oldBlockers: old ? old.blockers : null, program: source.origin });
  }
  if (touched) programs.push({ origin: source.origin, allSolved });
}
const moving = declarations.filter(d => d.newVerdict !== d.oldVerdict);
const predictedRecovered = programs.filter(p => p.allSolved)
  .map(p => p.origin).sort();
const solvedOutside = moving.filter(d => d.newVerdict.startsWith('Solved')
  && !inScope.has(d.program));
console.log(JSON.stringify({
  declarationsWithMarker: declarations.length,
  moving: moving.length,
  keeps: declarations.filter(d => d.keeps).length,
  exposed: declarations.filter(d => d.exposed === true).map(d => d.at),
  candidateErrors: declarations.filter(d => d.exposed === null)
    .map(d => d.at),
  predictedRecovered: predictedRecovered.length,
  recoveredNotInScope: predictedRecovered.filter(o => !inScope.has(o)),
  inScopeNotRecovered: [...inScope]
    .filter(o => !predictedRecovered.includes(o)),
  solvedOutsideScope: solvedOutside.map(d => d.at),
  movingDeclarations: moving.map(d => ({ at: d.at, old: d.oldVerdict,
    new: d.newVerdict, oldBlockers: d.oldBlockers })),
}, null, 1));
