// Scope A's generated-table checks (holder set, admitted set, S7,
// TableBases, D6.5), split from test/r0-scope-a-checks.mjs, which
// aggregates them. `load` loads a compiled module.
import { choose, generator } from './coverage-oracle.mjs';

const named = value => value.constructor.name;

export const tablesChecks = async load => {
  const pick = (next, items) => items[choose(next, items.length)];

  // ---- Generated declaration tables (§8 task 4): the holder set,
  // the admitted set and S7, each against a literal JS reference over
  // the generator's own declarations, never the compiler's tables.
  // Generation through `load`, so a probe reads the compiler under test;
  // recorded terms as JSON by constructor name.
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const { generationInputs } = await load('Features.Check.Generate.Inputs');
  const { generate } = await load('Features.Check.Generate');
  const Elaborating = await load('Domain.Elaborating');
  const Recorded = await load('Domain.Recorded');
  const Sets = await load('Data.Set');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const ids = set => Sets.toUnfoldable(unfoldableArray)(set);
  const termJson = ty => {
    switch (named(ty)) {
    case 'Base': return { base: named(ty.value0) === 'DataBase'
      ? { data: ty.value0.value0 } : named(ty.value0) };
    case 'Arrow': return { fun: [termJson(ty.value0), termJson(ty.value1)] };
    case 'TVar': return { tvar: true };
    case 'Record': return { record: { fields: ty.value0.map(pair =>
      [pair.value0, termJson(pair.value1)]), tails: ty.value1.length } };
    default: return { app: { head: named(ty.value0) === 'DataHead'
      ? { data: ty.value0.value0 } : { handler: true },
    args: ty.value1.map(termJson) } };
    }
  };
  const atomJson = atom => named(atom) === 'Equal'
    ? { eq: [termJson(atom.value0), termJson(atom.value1)] }
    : named(atom) === 'Printable' || named(atom) === 'Comparable'
      ? { req: termJson(atom.value0) } : { other: named(atom) };
  const problemsOf = source => {
    const program = resolve(parse(source).value0);
    if (named(program) !== 'Right') throw new Error('refused');
    const { tables, signatures } = generationInputs(program.value0);
    return program.value0.functions.map(decl => {
      const made = generate(tables)(signatures)(decl);
      if (named(made) !== 'Right') throw new Error('generation');
      const f = Recorded.fields(Elaborating.problem(made.value0));
      const terms = list => list.map(entry => atomJson(entry.value));
      return { decl, problem: { holders: { holding: ids(f.holders.holding),
        admitted: ids(f.holders.admitted) },
      outside: f.outside.map(entry => ({ value: named(entry.value) })),
      b: terms(f.b), d: terms(f.d), bq: terms(f.bq) } };
    });
  };
  const declsOf = next => {
    const count = 2 + choose(next, 4);
    const decls = Array.from({ length: count }, (_, id) =>
      ({ id, recrow: choose(next, 6) === 0, params: choose(next, 3) }));
    const field = (d, depth) => {
      const k = choose(next, depth > 1 ? 3 : 8);
      if (k === 0) return { base: pick(next, ['Int', 'Bool']) };
      if (k === 1 && d.params > 0 && !d.recrow)
        return { param: choose(next, d.params) };
      if (k === 1 || k === 2) return { base: 'Int' };
      if (k === 3) return { arrow: true };
      if (k === 4) return { handler: true };
      if (k === 5) return { record: field(d, depth + 1) };
      const target = pick(next, decls);
      return { data: target.id, args: target.recrow
        ? [{ record: field(d, depth + 1) }]
        : Array.from({ length: target.params }, () => field(d, depth + 1)) };
    };
    for (const d of decls) d.ctors = Array.from(
      { length: 1 + choose(next, 2) }, () => d.recrow ? [{ tailed: true }]
        : Array.from({ length: choose(next, 3) }, () => field(d, 0)));
    return decls;
  };
  const paramNames = ['a', 'b'];
  const write = ft => {
    if (ft.base) return ft.base;
    if (ft.param !== undefined) return paramNames[ft.param];
    if (ft.tvar !== undefined) return ft.tvar;
    if (ft.arrow) return 'Unit -> Unit';
    if (ft.handler) return 'Handler(Console)';
    if (ft.tailed) return '{ x: Int, ...r }';
    if (ft.record) return `{ f: ${write(ft.record)} }`;
    return ft.args.length === 0 ? `T${ft.data}`
      : `T${ft.data}(${ft.args.map(write).join(', ')})`;
  };
  const sourceOf = (decls, probes) => decls.map(d => {
    const params = d.recrow ? '(...r)' : d.params === 0 ? ''
      : `(${paramNames.slice(0, d.params).join(', ')})`;
    const ctors = d.ctors.map((fields, c) => fields.length === 0
      ? `K${d.id}x${c}` : `K${d.id}x${c}(${fields.map(write).join(', ')})`);
    return `type T${d.id}${params} = ${ctors.join(' | ')};`;
  }).concat(probes.map((ty, i) => `fn p${i}(x: ${write(ty)}): ${write(ty)}`
    + ' = x;'), ['fn main(): Int = 0;']).join('\n');
  const referenceOf = decls => {
    const fieldsOf = d => d.ctors.flat();
    const holder = new Set();
    const holds = ft => ft.arrow || ft.handler
      || (ft.record !== undefined && holds(ft.record))
      || (ft.data !== undefined
        && (holder.has(ft.data) || ft.args.some(holds)));
    for (let changed = true; changed;) {
      changed = false;
      for (const d of decls) if (!holder.has(d.id)
        && fieldsOf(d).some(holds)) { holder.add(d.id); changed = true; }
    }
    const mentions = ft => ft.record ? mentions(ft.record)
      : ft.data !== undefined ? [ft.data, ...ft.args.flatMap(mentions)] : [];
    const reach = id => {
      const seen = new Set([id]);
      const todo = [id];
      while (todo.length > 0) for (const u of fieldsOf(decls[todo.pop()])
        .flatMap(mentions)) if (!seen.has(u)) { seen.add(u); todo.push(u); }
      return seen;
    };
    const admitted = new Set(decls.filter(d => !d.recrow && !holder.has(d.id)
      && ![...reach(d.id)].some(u => decls[u].recrow)).map(d => d.id));
    return { holder, admitted };
  };
  // The kinds the written type's `app` nodes need, in pre-order.
  const kindsOf = (decls, ref, ft) => {
    if (ft.handler) return ['HandlerType'];
    if (ft.data === undefined) return ft.record
      ? kindsOf(decls, ref, ft.record) : [];
    const inner = ft.args.flatMap(arg => kindsOf(decls, ref, arg));
    if (ft.args.length === 0) return inner;
    const plain = arg => arg.base !== undefined || arg.tvar !== undefined
      || (arg.data !== undefined
      && ref.admitted.has(arg.data) && arg.args.every(plain));
    const kind = decls[ft.data].recrow ? ['DataOverRecords']
      : ref.admitted.has(ft.data) && ft.args.every(plain) ? []
        : ['DataApplication'];
    return [...kind, ...inner];
  };
  const coverage = { resolved: 0, refused: 0, holders: 0, transitive: 0,
    probes: 0, unmarked: 0, marked: 0 };
  const tablesWrong = (programs = 150) => {
    const next = generator(0x7ab);
    const wrong = [];
    for (let index = 0; index < programs; index += 1) {
      const decls = declsOf(next);
      const probes = Array.from({ length: 3 }, () => {
        const d = pick(next, decls);
        return { data: d.id, args: d.recrow ? [{ record: { base: 'Int' } }]
          : Array.from({ length: d.params }, () => pick(next, [{ base: 'Int' },
            { data: pick(next, decls).id, args: [] }, { tvar: 'a' },
            { arrow: true }, { record: { base: 'Int' } }, { handler: true }]))
        };
      }).filter(ft => ft.args.every(arg => arg.data === undefined
        || decls[arg.data].params === 0 && !decls[arg.data].recrow));
      let found;
      try { found = problemsOf(sourceOf(decls, probes)); }
      catch { coverage.refused += 1; continue; }
      coverage.resolved += 1;
      const ref = referenceOf(decls);
      if (ref.holder.size > 0) coverage.holders += 1;
      if (decls.some(d => !d.recrow && !ref.holder.has(d.id)
        && !ref.admitted.has(d.id))) coverage.transitive += 1;
      const ids = set => [...set].sort((x, y) => x - y);
      for (const { decl, problem } of found) {
        const at = `${index}#${decl.name}`;
        if (JSON.stringify(problem.holders.holding) !==
          JSON.stringify(ids(ref.holder))) wrong.push(`holders ${at}`);
        if (JSON.stringify(problem.holders.admitted) !==
          JSON.stringify(ids(ref.admitted))) wrong.push(`admitted ${at}`);
        const text = JSON.stringify(problem);
        // D6.5: `D` holds no equation, so no `app` node.
        if (problem.d.some(atom => atom.eq !== undefined))
          wrong.push(`D equation ${at}`);
        for (const [, u] of text.matchAll(/"base":\{"data":(\d+)\}/g))
          if (decls[u].params !== 0 || decls[u].recrow)
            wrong.push(`TableBases ${at}`);
        const probe = /^p(\d+)$/.exec(decl.name);
        if (probe === null) continue;
        const ft = probes[Number(probe[1])];
        const kinds = problem.outside.map(entry => entry.value);
        const wanted = kindsOf(decls, ref, ft);
        coverage.probes += 1;
        coverage[wanted.length === 0 ? 'unmarked' : 'marked'] += 1;
        if (JSON.stringify(kinds) !== JSON.stringify([...wanted, ...wanted]))
          wrong.push(`S7 markers ${at}`);
        const nodes = (value, found = []) => {
          if (Array.isArray(value)) value.forEach(item => nodes(item, found));
          else if (value !== null && typeof value === 'object') {
            if (value.app !== undefined && value.app.head.data !== undefined)
              found.push(value.app);
            Object.values(value).forEach(item => nodes(item, found));
          }
          return found;
        };
        for (const node of nodes(problem))
          if (!decls[node.head.data].recrow && node.args.length > 0
            && decls[node.head.data].params !== node.args.length)
            wrong.push(`S7 args ${at}`);
      }
    }
    return wrong;
  };

  return { tablesWrong, coverage };
};
