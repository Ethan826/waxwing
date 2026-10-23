// Task 4.4b's carry (Ruling): the read-back applies a variable's sort
// only at an expression's instantiation slot, as specialization does
// (Specialize/Values.purs `instantiated`, `slotType`); elsewhere, a
// named rest's type included (Specialize/Body.purs `copyRest`, through
// `typed`), lowering takes a bare hole as `Int`. No corpus declaration
// has a bare hole at a row-sorted rest (RestBinder.purs `restOf` keeps a
// record), so `restReadFrom` plants one in the checked body of a real P7
// declaration and reads the rest variable's value there. It takes a
// loader and the online support built from it, so a regression probe
// reads the clone's output only (`context.compilerPath`).
export const restSource = 'fn f(p: { a: Int, ...r }): { ...r } = '
  + 'match p { { a: _, ...rest } => rest };\nfn main(): Int = 0;\n';

const named = value => value.constructor.name;

export const restReadFrom = async (load, online) => {
  const Position = await load('Features.Check.Strategy.ReadBack.Position');
  const Checked = await load('Domain.Checked.Internal');
  const Type = await load('Domain.Type');
  const unslotted = () => () => ({ index: 0, rank: 0 });
  return () => {
    const program = online.programOf(restSource);
    const problem = online.problemOf(program, 'f');
    const [, info] = online.pairs(problem.vars).find(([, found]) =>
      named(found.position) === 'RestType');
    if (named(info.sort) !== 'SortRow') throw new Error('rest not a row');
    const body = online.todayOf(program, 'f').value0.function.body;
    const shape = body.value0.node.value1[0].pattern.value0.shape;
    if (named(shape.value1) !== 'NamedRest') throw new Error('no rest');
    shape.value1 = new Checked.NamedRest(shape.value1.value0,
      new Type.TVar(new Checked.Hole(0)));
    return Position.valueAt(body)(unslotted)(info.sort)(info.position);
  };
};
