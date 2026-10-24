// R0 Task 7.1b's regression probes (D1's generator port), imported
// through test/regression-probes.mjs; the rows are in
// scripts/regression-r0-port.mjs. Each loads modules from the compiler
// under test only, through `context.compilerPath`.
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { elabFrom } from './r0-elab-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';
import { plain } from './r0-elab-erase.mjs';
import { stubsFrom } from './r0-stubs.mjs';

const fail = message => {
  console.error(message);
  process.exit(1);
};
const passed = context =>
  console.log(`${context.probe} regression detects the defect`);
const loader = context => name => import(pathToFileURL(
  resolve(dirname(context.compilerPath), '..', name, 'index.js')));

// The named declaration's checked body from `build` under the online
// certificate's witness, its bindings changed by `rebind` (given the
// bindings, the `Elaborating` and the loader).
const built = async (context, source, name, rebind = found => found) => {
  const load = loader(context);
  const online = await onlineFrom(load);
  const { generate } = await load('Features.Check.Generate');
  const { generationInputs } = await load('Features.Check.Generate.Inputs');
  const { problem } = await load('Domain.Elaborating');
  const { build } = await load('Domain.Elaborating.Build');
  const { substitutionWitness } = await load(
    'Features.Check.Strategy.Witness');
  const program = online.programOf(`${source}fn main(): Int = 0;\n`);
  const inputs = generationInputs(program);
  const e = generate(inputs.tables)(inputs.signatures)(
    online.declOf(program, name)).value0;
  const certificate = online.search(program, problem(e)).value0;
  const witness = substitutionWitness(problem(e))(certificate.unsettled)
    .value0;
  const bindings = await rebind(witness.bindings, e, load);
  return build(e)({ bindings, names: [] }).value0.body;
};

// The lambda parameter's binding replaced by `Free 7`.
const freeSeven = async (bindings, e, load) => {
  const MapM = await load('Data.Map.Internal');
  const SetM = await load('Data.Set');
  const { unfoldableArray } = await load('Data.Unfoldable');
  const { ordVar } = await load('Domain.Recorded.Atom');
  const { requests } = await load('Domain.Elaborating');
  const { Free } = await load('Domain.Verdict.Witness');
  const parameter = SetM.toUnfoldable(unfoldableArray)(requests(e)).find(
    variable => variable.value1.constructor.name === 'Param');
  return MapM.insert(ordVar)(parameter)(new Free(7))(bindings);
};

export const r0PortProbes = {
  // T3a's harness half: a seal fault never reaches `decide`.
  'r0-port-seal-unchecked': async context => {
    const load = loader(context);
    const t = await elabFrom(load);
    const stubs = await stubsFrom(load);
    const Shadow = await load('Features.Check.Decide.Shadow');
    const a = t.fresh(['a']);
    const forged = { uses: t.m.Elab.readType(t.site.node([]))(a).uses,
      run: () => new t.m.Either.Right(t.m.Core.TInt.value) };
    const e = t.sealed(t.gen.seq([() => t.gen.fresh(['a']),
      () => t.gen.fresh(['a'])], () => t.gen.pure(forged)));
    const strategy = stubs.behaviours.accepting();
    Shadow.shadowDecision(stubs.checking({ strategies: [strategy] }))(
      () => new t.m.Either.Right(e))({ name: 'f' });
    if (strategy.calls > 0)
      fail(`a seal fault reached decide: ${strategy.calls} search`);
    passed(context);
  },
  // T2: `Apply (Call id θ [add]) [1, 2]`, its `Call` typed `Int → Int →
  // Int` (B1's arrow of the rest), as today's checker types it.
  'r0-port-over-applied': async context => {
    const body = await built(context, 'fn add(a: Int, b: Int): Int'
      + ' = a + b;\nfn id(x: a): a = x;\nfn over(): Int = id(add, 1, 2);\n',
    'over');
    const saturated = body.value0.node.value0.value0.ty;
    if (saturated.constructor.name !== 'TFun')
      fail('the saturated node of id(add, 1, 2) was typed '
        + `${saturated.constructor.name}`);
    passed(context);
  },
  // §9: `build`'s body is as `holes` numbers it, whatever the witness's
  // hole numbers (the parameter bound `Free 7` here).
  'r0-port-holes-unnumbered': async context => {
    const body = await built(context,
      'fn f(): Int = { let g = fn(x) => 1; 1 };\n', 'f', freeSeven);
    const { holes } = await loader(context)('Features.Check.Holes');
    if (JSON.stringify(plain(body, null))
      !== JSON.stringify(plain(holes(body), null)))
      fail('build left hole 7 unnumbered');
    passed(context);
  }
};
