// A2 fixtures (docs/plans/2026-10-31-a2-validator-plan.md, Task 1):
// `packageOf` builds an `EffectPackage` (spec §2.2) from compact JSON, and
// `problemOf` generates one declaration's recorded problem.
//
// A package spec is `{ types, rows, effects, marks }`, each optional and
// a list of [key, value] pairs. A key is a PureScript value (a `Var`,
// `EVar` or `Position`, typically read from `problemOf`'s problem), or a
// compact variable: `{ rigid: n }` (`RigidVar (VarId n)`), `{ hole: n }`
// (`holeVar n`), `{ effRigid: n }` (`EffRigid (VarId n)`). Values:
//   type   "Int" | "Bool" | "Text" | "Unit" | { var } | { arrow: [t, r, t] }
//          | { record } | { data: [id, [t], [r]] }
//          | { handler: [label, { inference: r, clauses: r | null }] }
//   record { fields: [[name, t]], tails: [var] }
//   label  { effect: "Fail" | "Console" | n, args: [t], mark: term }
//   row    { labels: [label], tail: null | { rigid: n } | { hole: n } }
//   term   "N" | "M" | ["J", ...names]
import { load, resolved, generatedOrThrow } from './r0-generate-support.mjs';

const Package = await load('Domain.Verdict.EffectPackage');
const Atom = await load('Domain.Recorded.Atom');
const Effect = await load('Domain.Recorded.Effect');
const Row = await load('Domain.Row');
const Hole = await load('Domain.Recorded.Hole');
const Maps = await load('Data.Map.Internal');
const Sets = await load('Data.Set');
const { Just, Nothing } = await load('Data.Maybe');
const { Tuple } = await load('Data.Tuple');
const { foldableArray } = await load('Data.Foldable');
const { ordString } = await load('Data.Ord');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const bases = { Int: Atom.IntBase, Bool: Atom.BoolBase,
  Text: Atom.TextBase, Unit: Atom.UnitBase };
const clausesOf = value => value === null ? Nothing.value
  : new Just(row(value));
const compact = value => value !== null && typeof value === 'object'
  && value.constructor === Object;

const variable = value => {
  if (!compact(value)) return value;
  if ('rigid' in value) return new Atom.RigidVar(value.rigid);
  if ('hole' in value) return Hole.holeVar(value.hole);
  if ('effRigid' in value) return new Effect.EffRigid(value.effRigid);
  throw new Error(`no variable form: ${JSON.stringify(value)}`);
};

const term = value => {
  if (value === 'N') return Package.TermN.value;
  if (value === 'M') return Package.TermM.value;
  if (Array.isArray(value) && value[0] === 'J')
    return new Package.TermJ(Sets.fromFoldable(foldableArray)(ordString)(
      value.slice(1)));
  throw new Error(`no term form: ${JSON.stringify(value)}`);
};

const effectRef = value => value === 'Fail' ? Row.FailEffect.value
  : value === 'Console' ? Row.ConsoleEffect.value
    : new Row.UserEffect(value);

const label = value => ({ effect: effectRef(value.effect),
  args: value.args.map(type), mark: term(value.mark) });

const tail = value => value === null ? Nothing.value
  : new Just('rigid' in value ? new Package.PTailRigid(value.rigid)
    : new Package.PTailHole(value.hole));

const row = value => ({ labels: value.labels.map(label),
  tail: tail(value.tail) });

const recordRow = value => ({ fields: value.fields.map(([name, field]) =>
  new Tuple(name, type(field))), tails: value.tails.map(variable) });

const type = value => {
  if (typeof value === 'string') return new Package.PBase(bases[value].value);
  if ('var' in value) return new Package.PVar(variable(value.var));
  if ('arrow' in value) return new Package.PArrow(type(value.arrow[0]),
    row(value.arrow[1]), type(value.arrow[2]));
  if ('record' in value) return new Package.PRecord(recordRow(value.record));
  if ('data' in value) return new Package.PData(value.data[0],
    value.data[1].map(type), value.data[2].map(row));
  if ('handler' in value) return new Package.PHandler(label(value.handler[0]),
    { inference: row(value.handler[1].inference),
      clauses: clausesOf(value.handler[1].clauses) });
  throw new Error(`no type form: ${JSON.stringify(value)}`);
};

const mapOf = (ord, pairs, key, image) => Maps.fromFoldable(ord)(
  foldableArray)((pairs ?? []).map(([k, v]) => new Tuple(key(k), image(v))));

export const packageOf = spec => ({
  types: mapOf(Atom.ordVar, spec.types, variable, type),
  rows: mapOf(Atom.ordVar, spec.rows, variable, recordRow),
  effects: mapOf(Effect.ordEVar, spec.effects, variable, row),
  marks: mapOf(Effect.ordPosition, spec.marks, key => key, term)
});

// The named declaration's recorded problem (a `RecordedProblem` value).
export const problemOf = (source, name) => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  const decl = program.functions.find(item => item.name === name);
  if (decl === undefined) throw new Error(`no declaration ${name}`);
  return generatedOrThrow(Generate.generate(tables)(signatures)(decl), name);
};
