// Today's live checker on one declaration, with the body before
// `holes` renumbers it, so that body rows, `State.restricted` and the
// mark store share one meta namespace (`holes` renumbers only the
// body). `recheck` (Check/Function.purs) keeps only the renumbered
// body; `checkFunction`'s first steps are repeated here from the
// exported parts (infer, require, settleRestricted, `settle`'s retype,
// markConstraints), and the repetition is checked: `holes` of the body
// built here must equal `recheck`'s body and the mark store `recheck`'s,
// key for key, or the declaration is reported as `rebuiltApart`.
// Research only; nothing here is production code.
import { load } from '../../test/r0-generate-support.mjs';
import { keyOf, named } from './shape.mjs';

const Function = await load('Features.Check.Function');
const { infer } = await load('Features.Check.Infer');
const { require: requireType } = await load('Features.Check.Require');
const { settleRestricted } = await load('Features.Check.Settle');
const Seed = await load('Features.Check.Seed');
const Scheme = await load('Features.Check.Scheme');
const Unify = await load('Features.Check.Unify');
const Checked = await load('Domain.Checked.Internal');
const Type = await load('Domain.Type.Core');
const Walk = await load('Features.Check.Walk');
const Holes = await load('Features.Check.Holes');
const { markConstraints } = await load('Features.Check.Frames');
const { violation } = await load('Features.Check.Mark');

const rigidOf = Checked.rigid;
const ownState = (env, decl) => {
  const signature = [...decl.parameters.map(p => rigidOf(p.ty)),
    rigidOf(decl.result),
    rigidOf(new Type.TFun(Type.TUnit.value, decl.row, Type.TUnit.value))];
  const first = { ...Scheme.start, next: decl.variables.length };
  const seeded = Seed.seeded(env)(decl.sorts)(signature)(first);
  const joined = Seed.joined(Unify.Rigid.create)(decl.variables)(
    decl.joined)(seeded);
  return Seed.required(Unify.Rigid.create)(decl.constraints)(joined);
};

const right = value => (value.constructor.name === 'Right'
  ? value.value0 : null);

// The raw settled body and the marked state, or null when a step
// refuses (the declaration is then a live refusal, as `recheck` says).
// `violation` is Mark.purs's verdict on that state, which
// `checkFunction` reaches only when the earlier checks pass.
const rawBody = (program, decl) => {
  const env = Function.environment(program)(decl);
  const body = right(infer(env)(ownState(env, decl))(decl.body));
  if (body === null) return null;
  const finished = right(requireType(env)(body.state)(
    rigidOf(decl.result))(body.value));
  if (finished === null) return null;
  const settledState = right(settleRestricted(env)(finished)(body.value));
  if (settledState === null) return null;
  const subst = settledState.subst;
  const marked = markConstraints(env.variables)({ ...finished, subst });
  return { marked, violates: named(violation(env.markVariables)(
    marked.subst)) === 'Just', body: Unify.isEmpty(subst) ? body.value
    : Walk.retype(Scheme.resolved(subst))(body.value) };
};

// For any declaration: Mark.purs's verdict and the marked state, when
// the reconstruction reaches it (live refusals included), else null.
export const markedOf = (program, decl) => {
  const made = rawBody(program, decl);
  return made === null ? null : { store: made.marked.subst.marks,
    violates: made.violates };
};

// `{ refused }` or `{ checked, state, raw, rebuiltApart }`.
export const liveOf = (holders, program, decl) => {
  const today = Function.recheck(holders)(program)(decl);
  if (today.constructor.name !== 'Right')
    return { refused: today.value0 };
  const { function: checked, state } = today.value0;
  const made = rawBody(program, decl);
  const raw = made?.body ?? null;
  const rebuiltApart = raw === null
    || keyOf(Holes.holes(raw)) !== keyOf(checked.body)
    || keyOf(made.marked.subst.marks) !== keyOf(state.subst.marks);
  return { checked, state, raw, rebuiltApart };
};
