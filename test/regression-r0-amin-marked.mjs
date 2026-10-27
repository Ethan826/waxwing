// R0 a-min tranche 1 regression probes for Generate.Marked (Tasks 2, 3),
// spread into test/regression-r0-amin.mjs. Each hand-builds a written
// type and reads its marked translation from the compiler under test.
import { fail, passed, shape, toolkit } from './regression-r0-amin-support.mjs';

const tidy = 'fn main(): Unit = ();';
// The marked translation of `ty` under `naming`, shaped.
const markedWith = async context => {
  const { load, tablesOf } = await toolkit(context);
  const Marked = await load('Features.Check.Generate.Marked');
  const Origin = await load('Domain.Recorded.Origin');
  const Type = await load('Domain.Type');
  const Row = await load('Domain.Row');
  const Maybe = await load('Data.Maybe');
  const path = { root: Origin.InParameters.value, steps: [] };
  const tables = tablesOf(tidy);
  const run = (naming, ty) => {
    const result = Marked.marked(tables)(naming)(ty);
    if (result.constructor.name !== 'Right')
      fail(`marked refused: ${JSON.stringify(shape(result.value0))}`);
    return shape(result.value0);
  };
  const unit = Type.TUnit.value;
  const arrowOver = (effect, mark) => Type.TFun.create(unit)(new Row.Row(
    [new Row.Label(effect, [], mark)], Maybe.Nothing.value))(unit);
  // The marks of the single label of the arrow's row.
  const markOf = mty => mty.MArrow[1].labels[0].mark;
  const namings = [['Declared', Marked.Declared.value],
    ['AtUse', Marked.AtUse.create(path)],
    ['InAnnotation', Marked.InAnnotation.create(path)(2)]];
  return { Type, Row, run, arrowOver, markOf, namings, path };
};

export const markedProbes = {
  // Task 2/3: a Fail label is N under every naming, whatever its mark.
  'r0-amin-fail-is-n': async context => {
    const t = await markedWith(context);
    for (const [name, naming] of t.namings) {
      const found = t.markOf(t.run(naming,
        t.arrowOver(t.Row.FailEffect.value, t.Row.Plain.value)));
      if (JSON.stringify(found) !== JSON.stringify(
        { Written: [{ FixedN: [] }] }))
        fail(`a Fail label under ${name} is ${JSON.stringify(found)}, not N`);
    }
    passed(context);
  },
  // Task 3 fix: a Plain mark in an annotation is the position
  // `Annotation p j n`; elsewhere it is M.
  'r0-amin-plain-annotation-position': async context => {
    const t = await markedWith(context);
    const log = new t.Row.UserEffect(0);
    const found = t.markOf(t.run(t.namings[2][1],
      t.arrowOver(log, t.Row.Plain.value)));
    const wanted = { At: [{ Annotation: [shape(t.path), 2, 0] }] };
    if (JSON.stringify(found) !== JSON.stringify(wanted))
      fail(`Plain in an annotation is ${JSON.stringify(found)}, not a `
        + 'position');
    passed(context);
  },
  // Task 2: a use names a type variable as an instance, not rigid.
  'r0-amin-atuse-names-as-instances': async context => {
    const t = await markedWith(context);
    const found = t.run(t.namings[1][1], t.Type.TVar.create(3));
    const wanted = { MVar: [{ FreshVar: [shape(t.path), { Inst: [3] }] }] };
    if (JSON.stringify(found) !== JSON.stringify(wanted))
      fail(`AtUse names a variable ${JSON.stringify(found)}, not an instance`);
    passed(context);
  }
};
