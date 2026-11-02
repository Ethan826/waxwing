// Tranche 2 Task 11 (design §C.3, §C.6, §C.7, Task 6; dossier §18.155
// (3), (5), (6)): the package assembly's fixtures and helpers, shared by
// test/r0-t2-package.test.mjs and the restored-defect probes
// (test/regression-r0-t2-package.mjs). `packageCases(load)` takes a
// module loader, so a probe reads the compiler under test only.
// Fixture-level.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources as rowSources } from './r0-t2-rows-cases.mjs';
import { sources as traceSources, traceCases }
  from './r0-t2-trace-cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const named = value => value.constructor.name;
const right = (result, phase) => {
  if (named(result) !== 'Right')
    throw new Error(`${phase} refused: ${named(result.value0)}`);
  return result.value0;
};

export const sources = {
  ...rowSources,
  holes: traceSources.holes,
  slots: traceSources.slots,
  // A `with` whose handler is not a handler type when installed: its
  // problem records `Unsupported UnframedInstall` (spec §4.1 check 4).
  unframed: readFileSync(join(root, 'test/fx008-probes/rigid.wxw'), 'utf8'),
  // `w`: Nil's element hole and the handler's open row, each one meta,
  // met in a slot's image (types) and in effect rows (effects); `y`: two
  // partial uses, two metas.
  numbering: `type List(a) = Nil | Cons(a, List(a));
effect Log { fn log(n: Int): Unit; };
fn id(x: a): a = x;
fn add(x: Int, y: Int): Int = x + y;
fn w(): Unit = { let v = id(handler Log { log(n) => Fail.fail(Nil) }); () };
fn y(): Unit = { let f = id(add(1)); let g = id(add(2)); () };
fn z(): Unit = { let v = handler Log { log(n) => Fail.fail(Nil) }; () };
fn main(): Unit with Console = Console.print(1);
`
};

// Every declaration of the fixture programs, each reading a package.
export const fixtures = [['uses', ['call', 'made', 'part', 'applied',
  'piped', 'logged', 'lam']], ['handlers', ['handled', 'deferred',
  'annotated', 'failing', 'job']], ['lone', ['main']], ['holes', ['f',
  'e']], ['slots', ['f', 'g', 'part', 'piped']], ['numbering', ['w', 'y',
  'z']], ['services', ['main']]];

export const packageCases = async load => {
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const RB = await load('Features.Check.Strategy.ReadBack');
  const Assembly = await load('Features.Check.Strategy.ReadBack.Package');
  const Least = await load('Features.Check.Strategy.ReadBack.Least');
  const Hole = await load('Domain.Recorded.Hole');
  const Maps = await load('Data.Map.Internal');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const trace = await traceCases(load);

  // The named declaration's problem, checked declaration, trace and final
  // mark store, and its trace as Task 6's helpers read it.
  const live = (source, name) => {
    const program = right(resolve(right(parse(source), 'parse')),
      'resolve');
    const decl = program.functions.find(item => item.name === name);
    const { tables, signatures } = Inputs.generationInputs(program);
    const problem = Elaborating.problem(right(Generate.generate(tables)(
      signatures)(decl), 'generate'));
    const found = right(Function.recheck(functional(program.ctors))(
      program)(decl), 'recheck');
    return { source, name, problem, checked: found.function,
      trace: found.trace, store: found.state.subst.marks,
      readBack: right(RB.readBack(problem)(found.function), 'read-back') };
  };
  const effectsOf = (item, readBack = item.readBack) => Assembly.readEffects(
    item.problem)(readBack)(item.checked)(item.store)(item.trace);
  const packageOf = item => right(effectsOf(item), `${item.name}'s package`);
  const faultOf = found => (named(found) === 'Left'
    ? named(found.value0) : 'Right');

  // Every hole a package names, with the map, key and sort it is met at:
  // `type` a `PVar`, `record` a record tail, `effect` a `PTailHole`.
  const holesOf = pkg => {
    const found = [];
    const index = variable => {
      const at = Hole.holeIndex(variable);
      return named(at) === 'Just' ? at.value0 : null;
    };
    const seen = (map, key, sort, n) => {
      if (n !== null) found.push({ map, key, sort, n });
    };
    const ty = (map, key) => value => {
      const kind = named(value);
      if (kind === 'PVar') seen(map, key, 'type', index(value.value0));
      else if (kind === 'PArrow') {
        ty(map, key)(value.value0);
        row(map, key)(value.value1);
        ty(map, key)(value.value2);
      } else if (kind === 'PRecord') record(map, key)(value.value0);
      else if (kind === 'PData') {
        value.value1.forEach(ty(map, key));
        value.value2.forEach(row(map, key));
      } else if (kind === 'PHandler') {
        value.value0.args.forEach(ty(map, key));
        row(map, key)(value.value1.inference);
        if (named(value.value1.clauses) === 'Just')
          row(map, key)(value.value1.clauses.value0);
      }
    };
    const record = (map, key) => value => {
      value.fields.forEach(field => ty(map, key)(field.value1));
      value.tails.forEach(tail => seen(map, key, 'record', index(tail)));
    };
    const row = (map, key) => value => {
      value.labels.forEach(label => label.args.forEach(ty(map, key)));
      if (named(value.tail) === 'Just'
        && named(value.tail.value0) === 'PTailHole')
        seen(map, key, 'effect', value.tail.value0.value0);
    };
    pairs(pkg.types).forEach(([key, value]) => ty('types', key)(value));
    pairs(pkg.rows).forEach(([key, value]) => record('rows', key)(value));
    pairs(pkg.effects).forEach(([key, value]) => row('effects', key)(value));
    return found;
  };
  // Hole numbers met at two sorts anywhere in one package.
  const sortClashes = pkg => {
    const sorts = new Map();
    for (const { sort, n } of holesOf(pkg))
      sorts.set(n, new Set([...sorts.get(n) ?? [], sort]));
    return [...sorts].filter(([, each]) => each.size > 1).map(([n]) => n);
  };
  // The maps a hole number is met in.
  const mapsOf = (pkg, n) => [...new Set(holesOf(pkg)
    .filter(each => each.n === n).map(each => each.map))].sort();
  // Extension numbers (not the body's) out of the stated order: each must
  // be a trace meta at or past the body's count, and in the package they
  // must keep the trace's first-occurrence order.
  const extensionWrong = item => {
    const traced = trace.traced(item.source, item.name);
    const count = trace.bodyHoleCount(traced);
    const order = [...new Set(trace.metasInOrder(traced))];
    const used = [...new Set(holesOf(packageOf(item)).map(each => each.n))]
      .filter(n => n >= count);
    const ranks = used.map(n => order.indexOf(n));
    if (ranks.includes(-1)) return `not traced: ${used}`;
    const sorted = [...used].sort((a, b) => a - b);
    const byTrace = [...used].sort((a, b) => order.indexOf(a)
      - order.indexOf(b));
    return JSON.stringify(sorted) === JSON.stringify(byTrace) ? null
      : `order ${sorted} vs ${byTrace}`;
  };
  // A read-back with a planted θ binding hole `n` to `value`, its σ
  // given as ReadBack step 2's `under theta` would leave it.
  const planted = (item, n, value, unsettled) => ({ ...item.readBack,
    unsettled, holeBindings: Maps.singleton(n)(value) });
  const every = () => fixtures.flatMap(([source, names]) =>
    names.map(name => live(sources[source], name)));
  return { every, live, effectsOf, packageOf, faultOf, holesOf, sortClashes,
    mapsOf, extensionWrong, planted, pairs, named, Maps, Least, Assembly,
    Hole, RB };
};
