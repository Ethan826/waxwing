// Task 4.4b's carry (Ruling): the read-back applies a variable's sort
// only at an expression's instantiation slot, as specialization does
// (Specialize/Values.purs `instantiated`, `slotType`); elsewhere, a
// named rest's type included (Specialize/Body.purs `copyRest`, through
// `typed`), lowering takes a bare hole as `Int`; so does a constructor
// pattern's type (`copyPattern`). No corpus declaration has a bare hole
// at a row-sorted rest (RestBinder.purs `restOf` keeps a record) or as a
// pattern's row argument, so `restReadFrom` plants one in the checked
// body of a real P7 declaration and `slotReadFrom` in a real P4 one (a
// constructor pattern's row-sorted `inst` slot), and each reads the
// variable's value there. It takes a
// loader and the online support built from it, so a regression probe
// reads the clone's output only (`context.compilerPath`).
export const restSource = 'fn f(p: { a: Int, ...r }): { ...r } = '
  + 'match p { { a: _, ...rest } => rest };\nfn main(): Int = 0;\n';

const named = value => value.constructor.name;

export const slotSource = 'type Box(...r) = Box({ ...r });\n'
  + 'fn f(b: Box(...s)): Int = match b { Box(_) => 0 };\n'
  + 'fn main(): Int = 0;\n';

const plantedRead = async (load, online, source, kind, plant) => {
  const Position = await load('Features.Check.Strategy.ReadBack.Position');
  const unslotted = () => () => ({ index: 0, rank: 0 });
  return () => {
    const program = online.programOf(source);
    const problem = online.problemOf(program, 'f');
    const [, info] = online.pairs(problem.vars).find(([, found]) =>
      named(found.position) === kind && named(found.sort) === 'SortRow');
    const body = online.todayOf(program, 'f').value0.function.body;
    plant(body.value0.node.value1[0].pattern.value0);
    return Position.valueAt(body)(unslotted)(info.sort)(info.position);
  };
};

const bareHole = async load => {
  const Checked = await load('Domain.Checked.Internal');
  const Type = await load('Domain.Type');
  return { Checked, hole: () => new Type.TVar(new Checked.Hole(0)) };
};

// P4: the pattern's type is the owner applied to `{ ...s }`; its row
// argument is replaced by a bare hole.
export const slotReadFrom = async (load, online) => {
  const { hole } = await bareHole(load);
  return plantedRead(load, online, slotSource, 'Slot', pattern => {
    pattern.ty.value1[0] = hole();
  });
};

// P7: the named rest's checked type is replaced by a bare hole.
export const restReadFrom = async (load, online) => {
  const { Checked, hole } = await bareHole(load);
  return plantedRead(load, online, restSource, 'RestType', pattern => {
    const rest = pattern.shape.value1;
    if (named(rest) !== 'NamedRest') throw new Error('no rest');
    pattern.shape.value1 = new Checked.NamedRest(rest.value0, hole());
  });
};
