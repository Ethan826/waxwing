import test from 'node:test';
import assert from 'node:assert/strict';
import { healthyBuild, sourcesOf } from './r0-effects-pin-run.mjs';
import { load } from './r0-generate-support.mjs';

// A2 Task 2, "erase matches recordedWith": over the effect pin's corpus,
// each node's recorded marked type (`effects.nodes`), lifted to a `PTy`
// here, erases (`eraseTy`, spec §2.5) to the `RTExpr` generation recorded
// at the same path (`types`, Elab/Recorded.purs `recordedWith`). Lifted
// only when every mark is `Written` (an `At` mark needs a package) and
// every effect-row tail is rigid or absent: a fresh tail has no `PTail`
// form without choosing one, so those nodes are counted, not lifted.
// Corpus-wide, hence serial.
const Package = await load('Features.Check.Strategy.Effects.Package');
const Types = await load('Domain.Verdict.EffectPackage');
const Atom = await load('Domain.Recorded.Atom');
const Effect = await load('Domain.Recorded.Effect');
const Origin = await load('Domain.Recorded.Origin');
const Maps = await load('Data.Map.Internal');
const Sets = await load('Data.Set');
const { Just, Nothing } = await load('Data.Maybe');
const { Tuple } = await load('Data.Tuple');
const { unfoldableArray } = await load('Data.Unfoldable');

const unliftable = new Error('unliftable');
const term = fixed => {
  if (fixed instanceof Effect.FixedN) return Types.TermN.value;
  if (fixed instanceof Effect.FixedM) return Types.TermM.value;
  return new Types.TermJ(Sets.singleton(fixed.value0));
};
const label = value => {
  if (!(value.mark instanceof Effect.Written)) throw unliftable;
  return { effect: value.effect, args: value.args.map(lift),
    mark: term(value.mark.value0) };
};
const tail = maybe => {
  if (maybe instanceof Nothing) return maybe;
  if (!(maybe.value0 instanceof Effect.EffRigid)) throw unliftable;
  return new Just(new Types.PTailRigid(maybe.value0.value0));
};
const row = value => ({ labels: value.labels.map(label),
  tail: tail(value.tail) });
const lift = mty => {
  if (mty instanceof Effect.MBase) return new Types.PBase(mty.value0);
  if (mty instanceof Effect.MVar) return new Types.PVar(mty.value0);
  if (mty instanceof Effect.MArrow) return new Types.PArrow(
    lift(mty.value0), row(mty.value1), lift(mty.value2));
  if (mty instanceof Effect.MRecord) return new Types.PRecord({
    fields: mty.value0.map(field => new Tuple(field.value0,
      lift(field.value1))), tails: mty.value1 });
  if (mty instanceof Effect.MData) return new Types.PData(mty.value0,
    mty.value1.map(lift), mty.value2.map(row));
  return new Types.PHandler(label(mty.value0), {
    inference: row(mty.value1.inference),
    clauses: mty.value1.clauses instanceof Nothing ? mty.value1.clauses
      : new Just(row(mty.value1.clauses.value0)) });
};
const lifted = mty => {
  try { return lift(mty); } catch (error) {
    if (error === unliftable) return null;
    throw error;
  }
};

const nodesOf = fields => Maps.toUnfoldable(unfoldableArray)(
  fields.effects.nodes);

const tally = async () => {
  const build = await healthyBuild();
  const found = { nodes: 0, compared: 0, skipped: 0, wrong: [] };
  for (const { origin, source } of await sourcesOf()) {
    const program = build.program(source);
    if (program === null) continue;
    const { tables, signatures } = build.Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const result = build.Generate.generate(tables)(signatures)(decl);
      if (result.constructor.name !== 'Right') continue;
      const fields = build.Recorded.fields(
        build.Elaborating.problem(result.value0));
      for (const { value0: path, value1: mty } of nodesOf(fields)) {
        found.nodes += 1;
        const recorded = Maps.lookup(Origin.ordPath)(path)(fields.types);
        const type = lifted(mty);
        if (type === null) { found.skipped += 1; continue; }
        found.compared += 1;
        if (recorded instanceof Nothing || !Atom.eqRTExpr.eq(
          Package.eraseTy(type))(recorded.value0))
          found.wrong.push(`${origin}#${decl.name}`);
      }
    }
  }
  return found;
};

test('erase matches recordedWith', async () => {
  const found = await tally();
  // Observed 2026-11-01: 140959 nodes, 138600 lifted.
  assert.ok(found.compared > 130000, JSON.stringify(found));
  assert.ok(found.skipped < found.nodes / 50, JSON.stringify(found));
  assert.deepEqual(found.wrong.slice(0, 10), []);
});
