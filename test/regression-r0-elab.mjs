// R0 Task 7.1a's regression probes (D1 spec §10), imported through
// test/regression-probes.mjs; the rows are in scripts/regression-r0-elab.mjs.
// Each loads modules from the compiler under test only, through
// `context.compilerPath`; the role probe compiles T3c's fixtures against
// that tree's sources and output.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';
import { compileScope } from './r0-elab-scope-support.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// The checks of test/r0-elaborate.test.mjs, through the tree's output.
const elaborating = async context => {
  const load = loader(context);
  const t = await elabFrom(load);
  const Elaborate = await load('Features.Check.Elaborate');
  const Verdict = await load('Domain.Verdict');
  const Internal = await load('Domain.Verdict.Internal');
  const recon = t.m.Set.empty;
  const judged = (e, w, problem = t.m.Elaborating.problem(e)) => ({ problem,
    solution: { strategy: Verdict.OnlineSolver.value,
      validity: Internal.Valid.create([]),
      assurance: new Verdict.Pending('Test.pending'),
      compilation: new Verdict.Witnessed(w) } });
  const elaborate = (e, j) => Elaborate.elaborate(recon)(e)(j);
  return { t, judged, elaborate };
};

export const r0ElabProbes = {
  // T4a: a binding outside `requests` never changes `build`.
  'r0-elab-untracked-read': async context => {
    const { t } = await elaborating(context);
    const e = t.sealed(t.gen.seq([() => t.gen.fresh(['r'], t.sort.row)],
      r => t.gen.pure(t.m.Elab.readRow(t.site.node([]))(r))));
    const r = t.fresh(['r']);
    const requested = t.requested(e).some(v => t.m.Atom.eqVar.eq(v)(r));
    const one = t.build(e, t.witness([[r, t.inline(t.recordOf([]))]]));
    const other = t.build(e, t.witness([[r, t.free(3)]]));
    if (!requested && JSON.stringify(one) !== JSON.stringify(other))
      fail('a binding outside requests changed build');
    passed(context);
  },
  // §9: `Free i` is the hole `i`.
  'r0-elab-free-not-hole': async context => {
    const { t } = await elaborating(context);
    const e = t.sealed(t.gen.seq([() => t.gen.fresh(['a'])],
      a => t.gen.pure(t.m.Elab.readType(t.site.node([]))(a))));
    const found = t.build(e, t.witness([[t.fresh(['a']), t.free(5)]]));
    const ty = found.value0;
    if (ty.constructor.name !== 'TVar' || ty.value0.value0 !== 5)
      fail(`Free 5 elaborated as ${ty.constructor.name}`);
    passed(context);
  },
  // T7: an injected build fault stops the run.
  'r0-elab-fault-continues': async context => {
    const { t, judged, elaborate } = await elaborating(context);
    const a = t.fresh(['a']);
    const read = t.m.Elab.readType(t.site.node([]))(a);
    const forged = { uses: read.uses,
      run: () => new t.m.Either.Left(new t.m.Types.Unbound(a)) };
    const e = t.sealed(t.gen.seq([() => t.gen.fresh(['a'])],
      () => t.gen.pure(forged)));
    const w = t.witness([[a, t.inline(t.base.int)]]);
    const result = elaborate(e, judged(e, w));
    if (result.constructor.name !== 'Broken')
      fail(`an injected Unbound did not stop: ${result.constructor.name}`);
    passed(context);
  },
  // T11: another declaration's solution is Broken.
  'r0-elab-wrong-problem': async context => {
    const { t, judged, elaborate } = await elaborating(context);
    const generator = t.gen.seq([() => t.gen.fresh(['a'])],
      a => t.gen.positioned(t.site.node([]), t.ty.flex(a)));
    const f = t.sealed(generator, 0);
    const g = t.sealed(generator, 1);
    const w = t.witness([[t.fresh(['a']), t.inline(t.base.int)]]);
    const result = elaborate(f, judged(g, w, t.m.Elaborating.problem(g)));
    if (result.constructor.name !== 'Broken')
      fail('another declaration\'s solution elaborated: '
        + `${result.constructor.name}`);
    passed(context);
  },
  // T3c (iv): `coerce` cannot change a handle's or an `Elab`'s scope.
  'r0-elab-phantom-role': async context => {
    const root = resolve(dirname(context.compilerPath), '..', '..');
    const { errors } = compileScope(root, ['Common.purs.txt',
      'CoerceHandle.purs.txt', 'CoerceElab.purs.txt']);
    const compiled = ['Test.ElabScope.CoerceElab',
      'Test.ElabScope.CoerceHandle'].filter(name => errors[name]
      === undefined);
    if (compiled.length > 0) fail(`coerce compiled: ${compiled.join(', ')}`);
    passed(context);
  }
};
