// Oracle O-A, grammar A2 (docs/plans/2026-11-13-scope-a-free-constructor-
// design.md §17.3, fixed before any run), with D6 as amended (§4, 4′ and
// 8, read on the terms after the candidate). Reuses A1's structure and
// evaluator (research/r0-scope-a/oracle.mjs). P2's readings H-a, H-b, H-c
// and the holder set are transcribed from
// research/composition-proofs/Composition/App/Statements.lean (`ReqHa`,
// `ReqHb` with `Reach` and `instFT`, `ReqHc`, `Holder`/`HoldsFn`).
// Bounded evidence only.
//
// usage: node research/r0-scope-a/oracle-a2.mjs [--out FILE] [--sample N]
//        [--no-pr1-filter]
//        [--broken-evaluator=never-equal-apps|all-apps-equal]
// The broken-evaluator flag (default off) is a sanity check that the
// evaluator can produce P1 failures; it is not part of the oracle.
// Amendment A2.1 (labelled; an interpretation fixed after the first run,
// design §17.5): P2 checks a reading only under assignments whose rigid
// values satisfy it (Pr-1's hypothesis `Q_imp`). `--no-pr1-filter`
// checks every assignment (Pr-2); both runs are reported.
import { writeFileSync } from 'node:fs';

const W = new URL('../../test/', import.meta.url).href;
const { decodeType, decodeVar } = await import(W + 'r0-canonical-decode.mjs');
const { load, problemsOf, resolved } =
  await import(W + 'r0-generate-support.mjs');
const { stubsFrom } = await import(W + 'r0-stubs.mjs');
const { g0From } = await import(W + 'r0-g0-support.mjs');

const args = process.argv.slice(2);
const flag = name => {
  const found = args.find(a => a === name || a.startsWith(`${name}=`));
  if (found === undefined) return undefined;
  const at = found.indexOf('=');
  return at < 0 ? args[args.indexOf(found) + 1] ?? true : found.slice(at + 1);
};
const outPath = flag('--out')
  ?? '.build/evidence/2026-11-14-scope-a-stage0/oracle-a2.json';
const pr1Filter = flag('--no-pr1-filter') === undefined;
const sample = flag('--sample') === undefined ? Infinity
  : Number(flag('--sample'));
const broken = flag('--broken-evaluator') ?? null;

const stubs = await stubsFrom(load);
const g0 = await g0From(load, stubs);
const MapM = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');
const named = value => value.constructor.name;

// ---- The grammar (§17.3), verbatim.
// `--grammar=a3` adds amendment A3 (§17.7, fixed before it ran).
const a3 = flag('--grammar') === 'a3';
const decls = 'type L(a) = N | C(a, L(a)); type P(a, b) = P(a, b);'
  + ' type T(a) = T(Int); type Box(a) = Box(a -> a);'
  + ' type F = F(Unit -> Unit); fn idL(y: L(c)): L(c) = y;'
  + (a3 ? ' fn idR(y: { x: c, ...s }): { x: c, ...s } = y;' : '')
  + ' fn main(): Int = 0;';
const params = ['Int', 'a', 'b', 'L(Int)', 'L(a)', 'L(L(a))', 'P(a, a)',
  'P(a, b)', 'T(Bool)', 'Box(Int)', 'L(F)', 'L({ x: Int })',
  'L({ x: Int, ...r })', '{ x: L(a), ...r }'];
const results = ['Text', 'Bool', 'Int', 'a', 'L(a)', 'L(L(a))', 'P(a, a)',
  ...(a3 ? ['{ a: Bool, x: Int }', '{ x: L(a), ...r }'] : [])];
const bodies = ['show(p)', 'p == q', 'p', 'C(p, N)', 'C(C(p, N), N)',
  'idL(p)', 'P(p, q)', 'match p { N => q, C(h, t) => h }',
  'match p { P(x, y) => x }',
  ...(a3 ? ['show(C(p, N))', 'show(idL(p))', 'show(P(p, q))', 'show(N)',
    'C(p, N) == C(q, N)', 'idR({ a: true, x: 1 })'] : [])];

// A3's exercise measures: a term with every bound variable replaced and
// tails spliced (fields before tails, as `under`), unsorted; and the
// same with records sorted by label and tails sorted, as `canonical`.
const hasVar = ty => JSON.stringify(ty).includes('"tvar"')
  || JSON.stringify(ty).match(/"tails":\[[^\]]/) !== null;
const spliced = (image, ty) => {
  if ('tvar' in ty) {
    const bound = image.get(JSON.stringify(ty.tvar));
    return bound === undefined ? ty : spliced(image, bound);
  }
  if ('fun' in ty) return { fun: { params: ty.fun.params
    .map(t => spliced(image, t)), result: spliced(image, ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(t => spliced(image, t)) } };
  if ('record' in ty) {
    let fields = ty.record.fields.map(([l, t]) => [l, spliced(image, t)]);
    let tails = [];
    for (const tail of ty.record.tails) {
      const bound = image.get(JSON.stringify(tail));
      if (bound === undefined) { tails.push(tail); continue; }
      const row = spliced(image, bound).record;
      fields = fields.concat(row.fields);
      tails = tails.concat(row.tails);
    }
    return { record: { fields, tails } };
  }
  return ty;
};
const sorted = ty => {
  if ('fun' in ty) return { fun: { params: ty.fun.params.map(sorted),
    result: sorted(ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(sorted) } };
  if ('record' in ty) return { record: {
    fields: ty.record.fields.map(([l, t]) => [l, sorted(t)])
      .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)),
    tails: [...ty.record.tails].sort((x, y) => (JSON.stringify(x)
      < JSON.stringify(y) ? -1 : 1)) } };
  return ty;
};
const bqTypes = new Map();

// ---- The declarations as a table (type ids in declaration order,
// checked against the problem's `holders.declared`). Field types follow
// Statements.lean's FT: base, param, arrow, record, data, handler.
const L = 0;
const P = 1;
const T = 2;
const BOX = 3;
const F = 4;
const ft = {
  base: b => ({ k: 'base', b }), param: i => ({ k: 'param', i }),
  arrow: (a, c) => ({ k: 'arrow', a, c }),
  data: (u, as) => ({ k: 'data', u, as }), handler: { k: 'handler' },
  record: fs => ({ k: 'record', fs }) };
const table = new Map([
  [L, { params: 1, rows: 0, ctors: [[], [ft.param(0),
    ft.data(L, [ft.param(0)])]] }],
  [P, { params: 2, rows: 0, ctors: [[ft.param(0), ft.param(1)]] }],
  [T, { params: 1, rows: 0, ctors: [[ft.base('Int')]] }],
  [BOX, { params: 1, rows: 0, ctors: [[ft.arrow(ft.param(0),
    ft.param(0))]] }],
  [F, { params: 0, rows: 0, ctors: [[ft.arrow(ft.base('Unit'),
    ft.base('Unit'))]] }]]);

// Holder / HoldsFn: the least fixpoint of the inductive definitions.
const holderSet = (() => {
  const holder = new Set();
  const holdsFn = f => {
    switch (f.k) {
    case 'arrow': case 'handler': return true;
    case 'data': return holder.has(f.u) || f.as.some(holdsFn);
    case 'record': return f.fs.some(([, g]) => holdsFn(g));
    default: return false;
    }
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const [t, d] of table)
      if (!holder.has(t) && d.ctors.some(c => c.some(holdsFn))) {
        holder.add(t);
        changed = true;
      }
  }
  return holder;
})();

// ---- Values of GA as JSON (A1's encoding): { base }, { fun: [..] },
// { app: [head, args] }, { record: { label: value } }. A declared type of
// no parameters is the base `data<id>`.
const prim = new Set(['Int', 'Bool', 'Text', 'Unit']);
const kindOf = b => (prim.has(b) ? { prim: true }
  : /^data\d+$/.test(b) ? { data: Number(b.slice(4)) } : { fresh: true });
const dataB = u => ({ base: `data${u}` });

// instFT, instFields, instArgs.
const instFT = (vs, f) => {
  switch (f.k) {
  case 'base': return { base: f.b };
  case 'param': return vs[f.i] ?? { record: {} };
  case 'arrow': return { fun: [instFT(vs, f.a), instFT(vs, f.c)] };
  case 'record': return { record: Object.fromEntries(f.fs.map(([l, g]) =>
    [l, instFT(vs, g)])) };
  case 'data': return f.as.length === 0 ? dataB(f.u)
    : { app: [f.u, f.as.map(g => instFT(vs, g))] };
  case 'handler': return { fun: [{ record: {} }, { record: {} }] };
  default: throw new Error(`field type ${JSON.stringify(f)}`);
  }
};

const key = variable => JSON.stringify(variable);
const canonical = value => JSON.stringify(value, (_, v) =>
  (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).sort()) : v));

// ReqHa: prim; data base outside the holder set; record of ReqHa
// fields; app at a head outside the holder set with ReqHa arguments.
const reqHa = v => {
  if ('base' in v) {
    const k = kindOf(v.base);
    return k.prim === true || (k.data !== undefined && !holderSet.has(k.data));
  }
  if ('record' in v) return Object.values(v.record).every(reqHa);
  if ('app' in v) return !holderSet.has(v.app[0]) && v.app[1].every(reqHa);
  return false;
};
// ReqHc: as ReqHa with the holder set ignored.
const reqHc = v => {
  if ('base' in v) {
    const k = kindOf(v.base);
    return k.prim === true || k.data !== undefined;
  }
  if ('record' in v) return Object.values(v.record).every(reqHc);
  if ('app' in v) return v.app[1].every(reqHc);
  return false;
};
// Reach: refl, record fields, constructor fields of an applied head at
// its arguments, constructor fields of a nullary data base at [].
const reach = v => {
  const seen = new Map();
  const todo = [v];
  while (todo.length > 0) {
    const w = todo.pop();
    const k = canonical(w);
    if (seen.has(k)) continue;
    seen.set(k, w);
    if ('record' in w) todo.push(...Object.values(w.record));
    else if ('app' in w) {
      const d = table.get(w.app[0]);
      if (d) for (const c of d.ctors) for (const fl of c)
        todo.push(instFT(w.app[1], fl));
    } else if ('base' in w) {
      const kd = kindOf(w.base);
      const d = kd.data === undefined ? undefined : table.get(kd.data);
      if (d) for (const c of d.ctors) for (const fl of c)
        todo.push(instFT([], fl));
    }
  }
  return [...seen.values()];
};
// ReqHb: nothing reachable is an arrow or a base outside Waxwing's.
const reqHb = v => reach(v).every(w => !('fun' in w)
  && !('base' in w && kindOf(w.base).fresh === true));
const readings = { Ha: reqHa, Hb: reqHb, Hc: reqHc };

// ---- Sanity check (1): H-a rejects Box(Int) and L(F).
const sanity = {
  holderSet: [...holderSet].sort(),
  HaRejectsBoxInt: !reqHa({ app: [BOX, [{ base: 'Int' }]] }),
  HaRejectsLF: !reqHa({ app: [L, [dataB(F)]] }),
  HaAcceptsLInt: reqHa({ app: [L, [{ base: 'Int' }]] }),
  HbRejectsBoxInt: !reqHb({ app: [BOX, [{ base: 'Int' }]] }),
  HbRejectsLF: !reqHb({ app: [L, [dataB(F)]] }),
  HcAcceptsBoxInt: reqHc({ app: [BOX, [{ base: 'Int' }]] }) };
if (!(sanity.HaRejectsBoxInt && sanity.HaRejectsLF && sanity.HaAcceptsLInt))
  throw new Error(`sanity (1) failed: ${JSON.stringify(sanity)}`);

// ---- A1's evaluator, with named rigid variables.
let nonce = 0;
const evaluate = (env, ty, depth = 0) => {
  if (depth > 64) return undefined;
  if ('base' in ty) return { base: typeof ty.base === 'string' ? ty.base
    : `data${ty.base.data}` };
  if ('tvar' in ty) return env.ty(ty.tvar, depth);
  if ('fun' in ty) {
    const parts = [...ty.fun.params, ty.fun.result]
      .map(part => evaluate(env, part, depth + 1));
    return parts.includes(undefined) ? undefined : { fun: parts };
  }
  if ('app' in ty) {
    const args = ty.app.args.map(arg => evaluate(env, arg, depth + 1));
    if (args.includes(undefined)) return undefined;
    const head = ty.app.head.data ?? ty.app.head;
    if (broken === 'never-equal-apps') return { app: [head, args, nonce++] };
    if (broken === 'all-apps-equal') return { app: 'APP' };
    return { app: [head, args] };
  }
  if ('record' in ty) {
    const row = {};
    const add = (label, value) => {
      if (value === undefined || label in row) return false;
      row[label] = value;
      return true;
    };
    for (const [label, field] of ty.record.fields)
      if (!add(label, evaluate(env, field, depth + 1))) return undefined;
    for (const tail of ty.record.tails) {
      const more = env.row(tail, depth);
      if (more === undefined) return undefined;
      for (const [label, value] of Object.entries(more))
        if (!add(label, value)) return undefined;
    }
    return { record: row };
  }
  throw new Error(`type ${JSON.stringify(ty)}`);
};

const holds = (env, atom) => {
  if (atom === 'ff') return false;
  if ('eq' in atom) {
    const [one, other] = atom.eq.map(ty => evaluate(env, ty));
    return one !== undefined && other !== undefined
      && canonical(one) === canonical(other);
  }
  if ('lacks' in atom) {
    const row = env.row(atom.lacks[0]);
    return row !== undefined && !(atom.lacks[1] in row);
  }
  if ('disjoint' in atom) {
    const [one, other] = atom.disjoint.map(v => env.row(v));
    return one !== undefined && other !== undefined
      && Object.keys(one).every(label => !(label in other));
  }
  throw new Error(`atom ${JSON.stringify(atom)}`);
};
const reqType = atom => atom.pr ?? atom.cmp;

// ---- Rigid assignments (§17.3): `a` from A1's list plus L(L(Int)) and
// Int -> Int; `b` from {Int, Bool, L(Int)}; `r` from A1's four rows.
const I = { base: 'Int' };
const Bo = { base: 'Bool' };
const rigidA = [I, Bo, { base: 'β' }, { app: [L, [I]] },
  { app: [P, [Bo, I]] }, { app: [T, [I]] }, { record: { x: I } },
  { app: [L, [{ app: [L, [I]] }]] }, { fun: [I, I] }];
const rigidB = [I, Bo, { app: [L, [I]] }];
const rigidR = [{}, { y: I }, { y: { app: [L, [Bo]] } }, { x: I }];
const choices = { a: rigidA, b: rigidB, r: rigidR };

// ---- Substitution of the candidate into the terms (for D6 after it).
const substitute = (image, ty, depth = 0) => {
  if (depth > 64) throw new Error('substitution depth');
  const go = t => substitute(image, t, depth + 1);
  if ('base' in ty) return ty;
  if ('tvar' in ty) return image.has(key(ty.tvar))
    ? go(image.get(key(ty.tvar))) : ty;
  if ('fun' in ty) return { fun: { params: ty.fun.params.map(go),
    result: go(ty.fun.result) } };
  if ('app' in ty) return { app: { head: ty.app.head,
    args: ty.app.args.map(go) } };
  if ('record' in ty) {
    const fields = ty.record.fields.map(([l, t]) => [l, go(t)]);
    const tails = [];
    for (const tail of ty.record.tails) {
      if (!image.has(key(tail))) { tails.push(tail); continue; }
      const more = go(image.get(key(tail)));
      if ('record' in more) {
        fields.push(...more.record.fields);
        tails.push(...more.record.tails);
      } else fields.push(['<tail-not-record>', more]);
    }
    return { record: { fields, tails } };
  }
  throw new Error(`type ${JSON.stringify(ty)}`);
};
const typesOfAtom = atom => (atom === 'ff' ? [] : 'eq' in atom ? atom.eq
  : 'pr' in atom ? [atom.pr] : 'cmp' in atom ? [atom.cmp] : []);

// Amended D6 conditions 1-4′, 5, 8 on substituted terms; returns the
// list of violated shapes (empty when in scope). 6 and 7 are the judged
// filter, applied before.
const shapeViolations = (canon, image) => {
  const declared = new Set(canon.holders.declared);
  const H = new Set(canon.holders.holding);
  const found = new Set();
  const visit = (ty, inArg) => {
    if ('base' in ty) {
      if (inArg && typeof ty.base === 'object' && H.has(ty.base.data))
        found.add('4′ holder base in app argument');
      return;
    }
    if ('tvar' in ty) return;
    if ('fun' in ty) {
      if (inArg) found.add('4′ arrow in app argument');
      [...ty.fun.params, ty.fun.result].forEach(t => visit(t, inArg));
      return;
    }
    if ('record' in ty) {
      if (inArg) found.add('8 record in app argument');
      ty.record.fields.forEach(([, t]) => visit(t, inArg));
      return;
    }
    if ('app' in ty) {
      const head = ty.app.head;
      if (head.data === undefined) {
        found.add(inArg ? '4′ handler head in app argument'
          : '1 handler head');
      } else {
        if (!declared.has(head.data) || !table.has(head.data))
          found.add('1 undeclared head');
        else if (table.get(head.data).rows > 0)
          found.add('2 row parameter');
        if (H.has(head.data))
          found.add(inArg ? '3/4′ holder head in app argument'
            : '3 holder head');
      }
      ty.app.args.forEach(t => visit(t, true));
      return;
    }
    throw new Error(`type ${JSON.stringify(ty)}`);
  };
  const subst = t => substitute(image, t);
  for (const list of ['b', 'bq', 'q'])
    for (const entry of canon[list])
      typesOfAtom(entry.value).forEach(t => visit(subst(t), false));
  for (const entry of canon.d) {
    const before = found.size;
    typesOfAtom(entry.value).forEach(t => {
      const s = subst(t);
      if (JSON.stringify(s).includes('"app"')) found.add('5 app in D');
      visit(s, false);
    });
    void before;
  }
  return [...found].sort();
};
const nestedLL = (canon, image) => {
  const hit = ty => {
    if ('app' in ty) {
      if (ty.app.head.data === L && ty.app.args.some(a => 'app' in a
        && a.app.head.data === L)) return true;
      return ty.app.args.some(hit);
    }
    if ('fun' in ty) return [...ty.fun.params, ty.fun.result].some(hit);
    if ('record' in ty) return ty.record.fields.some(([, t]) => hit(t));
    return false;
  };
  return ['b', 'bq', 'd'].some(list => canon[list].some(entry =>
    typesOfAtom(entry.value).some(t => hit(substitute(image, t)))));
};

// ---- The run.
const counts = { programs: 0, refused: 0, judged: 0, outOfScope: 0,
  outOfScopeMarkers: 0, outOfScopeOpen: 0, noCandidate: 0,
  excludedShape: 0, excludedShapeWithEvaluatorFailures: 0,
  excludedShapeRefused: 0, valid: 0, notValid: 0, assignments: 0,
  p1Failures: 0, p1FailingProblems: 0,
  p2: { undefinedValue: 0, Ha: 0, Hb: 0, Hc: 0, holderSetMismatch: 0,
    failingProblems: 0 },
  controlProblems: 0, controlFailing: 0, controlNotFailing: 0,
  validInScopeWithBQ: 0, validInScopeBQAtoms: 0,
  validInScopeBQAssignmentsChecked: { Ha: 0, Hb: 0, Hc: 0 },
  validInScopeFromMatch: 0, validInScopeNestedLL: 0,
  exerciseBQWithVariable: 0, exerciseRecordWithTail: 0,
  exerciseSortChanges: 0,
  unknownRigidName: 0 };
const excludedShapes = {};
const examples = { p1: [], p2undefined: [], p2Ha: [], p2Hb: [], p2Hc: [],
  holderSetMismatch: [], excludedShapeFailures: [], controlNotFailing: [],
  noCandidate: [] };
const note = (list, item) => { if (list.length < 5) list.push(item); };
const holderMismatchSeen = new Set();

const started = Date.now();
outer:
for (const t1 of params) for (const t2 of params) for (const t3 of results)
  for (const body of bodies) {
    if (counts.programs >= sample) break outer;
    counts.programs += 1;
    const source = `fn f(p: ${t1}, q: ${t2}): ${t3} = ${body}; ${decls}`;
    let canon;
    let problem;
    let decl;
    try {
      const found = problemsOf(resolved(source))
        .find(x => x.decl.name === 'f');
      canon = found.problem;
      decl = found.decl;
      problem = stubs.recorded.problem(source, 'f');
    } catch {
      counts.refused += 1;
      continue;
    }
    counts.judged += 1;
    // Holder-set agreement (P2): the problem's against the JS reference.
    const holding = canon.holders.holding.join(',');
    const declared = canon.holders.declared.join(',');
    if (holding !== [...holderSet].sort().join(',')
      || declared !== [...table.keys()].sort().join(',')) {
      counts.p2.holderSetMismatch += 1;
      if (!holderMismatchSeen.has(holding + '|' + declared)) {
        holderMismatchSeen.add(holding + '|' + declared);
        note(examples.holderSetMismatch, { source,
          holders: canon.holders, reference: [...holderSet] });
      }
    }
    const markers = canon.outside.some(e => e.value !== 'DataApplication');
    const open = g0.open(problem).length > 0;
    if (markers || open) {
      counts.outOfScope += 1;
      if (markers) counts.outOfScopeMarkers += 1;
      if (open) counts.outOfScopeOpen += 1;
      continue;
    }
    let candidate;
    try {
      candidate = g0.candidateOf(problem);
    } catch (e) {
      counts.noCandidate += 1;
      note(examples.noCandidate, { source, error: String(e).slice(0, 200) });
      continue;
    }
    const valid = named(g0.check(problem, candidate)) === 'Right';
    const image = new Map(MapM.toUnfoldable(unfoldableArray)(candidate)
      .map(pair => [key(decodeVar(pair.value0)), decodeType(pair.value1)]));
    const violations = shapeViolations(canon, image);
    const inScope = violations.length === 0;

    // Rigid variables by name (decl.variables[i] for rigid i).
    const rigidVars = [...canon.rigidTy, ...canon.rigidRow];
    const nameOf = v => decl.variables[v.rigid];
    if (rigidVars.some(v => !(nameOf(v) in choices))) {
      counts.unknownRigidName += 1;
      continue;
    }
    const names = [...new Set(rigidVars.map(nameOf))].sort();
    const assignments = names.reduce((acc, n) => acc.flatMap(partial =>
      choices[n].map(value => ({ ...partial, [n]: value }))), [{}]);

    const fail = { p1: 0, undefinedValue: 0, Ha: 0, Hb: 0, Hc: 0 };
    let controlFails = false;
    let assignmentCount = 0;
    for (const rigid of assignments) {
      const env = {
        ty: (variable, depth = 0) => ('rigid' in variable
          ? rigid[nameOf(variable)]
          : image.has(key(variable))
            ? evaluate(env, image.get(key(variable)), depth + 1) : I),
        row: (variable, depth = 0) => {
          if ('rigid' in variable) return rigid[nameOf(variable)];
          if (!image.has(key(variable))) return {};
          const value = evaluate(env, image.get(key(variable)), depth + 1);
          return value?.record;
        } };
      if (!canon.d.every(entry => holds(env, entry.value))) continue;
      assignmentCount += 1;
      const brokenB = canon.b.filter(entry => !holds(env, entry.value));
      const bqValues = canon.bq.map(entry =>
        [entry.value, evaluate(env, reqType(entry.value))]);
      // Q under Pr-1 (Q_imp plus `q`), per reading.
      const qValues = [
        ...canon.rigidTy.map(v => rigid[nameOf(v)]),
        ...canon.rigidRow.map(v => ({ record: rigid[nameOf(v)] })),
        ...canon.q.map(entry => evaluate(env, reqType(entry.value)))];
      const p2 = { undefinedValue: [], Ha: [], Hb: [], Hc: [] };
      for (const [atom, value] of bqValues) {
        if (value === undefined) { p2.undefinedValue.push(atom); continue; }
        for (const [x, req] of Object.entries(readings)) {
          if (pr1Filter && !qValues.every(v => v !== undefined && req(v)))
            continue;
          if (valid && inScope)
            counts.validInScopeBQAssignmentsChecked[x] += 1;
          if (!req(value)) p2[x].push({ atom, value });
        }
      }
      if (!valid) {
        if (brokenB.length > 0 || p2.undefinedValue.length > 0
          || bqValues.some(([, v]) => v !== undefined && !reqHa(v)))
          controlFails = true;
        continue;
      }
      const record = { source, rigid };
      if (brokenB.length > 0) {
        fail.p1 += 1;
        if (inScope) note(examples.p1, { ...record,
          broken: brokenB.map(e => e.value) });
      }
      for (const kind of ['undefinedValue', 'Ha', 'Hb', 'Hc'])
        if (p2[kind].length > 0) {
          fail[kind] += 1;
          if (inScope) note(examples[kind === 'undefinedValue'
            ? 'p2undefined' : `p2${kind}`], { ...record, failing: p2[kind] });
        }
    }
    const anyFail = Object.values(fail).some(n => n > 0);
    if (!inScope) {
      if (!valid) { counts.excludedShapeRefused += 1; continue; }
      counts.excludedShape += 1;
      for (const v of violations) {
        excludedShapes[v] ??= { problems: 0, withEvaluatorFailures: 0 };
        excludedShapes[v].problems += 1;
        if (anyFail) excludedShapes[v].withEvaluatorFailures += 1;
      }
      if (anyFail) {
        counts.excludedShapeWithEvaluatorFailures += 1;
        note(examples.excludedShapeFailures, { source, violations, fail });
      }
      continue;
    }
    if (!valid) {
      counts.notValid += 1;
      counts.controlProblems += 1;
      if (controlFails) counts.controlFailing += 1;
      else {
        counts.controlNotFailing += 1;
        note(examples.controlNotFailing, { source,
          b: canon.b.map(e => e.value), bq: canon.bq.map(e => e.value) });
      }
      continue;
    }
    counts.valid += 1;
    counts.assignments += assignmentCount;
    counts.p1Failures += fail.p1;
    if (fail.p1 > 0) counts.p1FailingProblems += 1;
    counts.p2.undefinedValue += fail.undefinedValue;
    counts.p2.Ha += fail.Ha;
    counts.p2.Hb += fail.Hb;
    counts.p2.Hc += fail.Hc;
    if (fail.undefinedValue + fail.Ha + fail.Hb + fail.Hc > 0)
      counts.p2.failingProblems += 1;
    if (canon.bq.length > 0) {
      counts.validInScopeWithBQ += 1;
      counts.validInScopeBQAtoms += canon.bq.length;
    }
    if (body.startsWith('match')) counts.validInScopeFromMatch += 1;
    for (const entry of canon.bq) {
      const ty = reqType(entry.value);
      if (hasVar(ty)) counts.exerciseBQWithVariable += 1;
      const shown = JSON.stringify(spliced(image, ty));
      bqTypes.set(shown, (bqTypes.get(shown) ?? 0) + 1);
    }
    for (const entry of canon.b) for (const ty of typesOfAtom(entry.value)) {
      if (JSON.stringify(ty).match(/"tails":\[[^\]]/))
        counts.exerciseRecordWithTail += 1;
      const raw = spliced(image, ty);
      if (JSON.stringify(raw) !== JSON.stringify(sorted(raw)))
        counts.exerciseSortChanges += 1;
    }
    if (nestedLL(canon, image)) counts.validInScopeNestedLL += 1;
  }
const seconds = (Date.now() - started) / 1000;
const p2Total = counts.p2.undefinedValue + counts.p2.Ha + counts.p2.Hb
  + counts.p2.Hc + counts.p2.holderSetMismatch;
const exercised = !a3 || (counts.exerciseBQWithVariable > 0
  && counts.exerciseRecordWithTail > 0 && counts.exerciseSortChanges > 0);
const pass = counts.p1Failures === 0 && p2Total === 0
  && counts.controlFailing > 0 && exercised;
const output = { grammar: a3 ? 'A2 + A3 (§17.3, §17.7)' : 'A2 (§17.3)',
  exercised, bqTypes: Object.fromEntries(bqTypes), broken,
  sample: Number.isFinite(sample) ? sample : null, seconds, pass, sanity,
  counts, excludedShapes, examples };
writeFileSync(outPath, JSON.stringify(output, null, 1));
console.log(JSON.stringify({ seconds, pass, counts, excludedShapes }, null,
  1));
process.exitCode = pass ? 0 : 1;
