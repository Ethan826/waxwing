// R036 (2) (dossier §18.161 (2)): a seeded generator of `Ty Open` for the
// rename-agreement check of Domain.Type.Traverse, shared by
// test/r0-type-traverse.test.mjs and the restored-defect probes. The
// grammar is fixed before running: arrows to depth 6, records with up to
// 3 tails, handlers with label arguments and with and without a clause
// row, data with type and row arguments, rows with label arguments and
// open or closed tails; leaves are the base types and variables (holes
// and rigids). `traverseCases(load)` takes a module loader, so a probe
// reads the compiler under test only.
export const grammar = { depth: 6, tails: 3, labels: 2, arguments: 2,
  fields: 3, spine: 3 };
export const seeds = [1, 2, 3];
export const samples = 2000;

// mulberry32, a small seeded PRNG (Tommy Ettinger, public domain).
const random = seed => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const traverseCases = async load => {
  const Core = await load('Domain.Type.Core');
  const Row = await load('Domain.Row');
  const Checked = await load('Domain.Checked.Internal');
  const { Just, Nothing } = await load('Data.Maybe');
  const Either = await load('Data.Either');
  const Traverse = await load('Domain.Type.Traverse');
  const Tuple = await load('Data.Tuple');
  const eqTy = Core.eqTy(Checked.eqOpen);

  const generator = seed => {
    const next = random(seed);
    const pick = count => Math.floor(next() * count);
    const variable = () => (pick(2) === 0 ? new Checked.Hole(pick(9))
      : new Checked.Rigid(pick(3)));
    const many = (count, make) => Array.from({ length: pick(count + 1) },
      make);
    const effect = () => [new Row.UserEffect(pick(3)), Row.FailEffect.value,
      Row.ConsoleEffect.value][pick(3)];
    const mark = () => [Row.Plain.value, Row.NoFail.value,
      new Row.MarkMeta(pick(4))][pick(3)];
    const label = depth => new Row.Label(effect(),
      many(grammar.arguments, () => ty(depth - 1)), mark());
    const row = depth => new Row.Row(many(grammar.labels, () =>
      label(depth)), pick(2) === 0 ? Nothing.value : new Just(variable()));
    const leaf = () => [Core.TInt.value, Core.TBool.value, Core.TUnit.value,
      Core.TText.value, new Core.TVar(variable())][pick(5)];
    const spine = depth => {
      let result = ty(depth - 1);
      for (let at = pick(grammar.spine) + 1; at > 0; at -= 1)
        result = new Core.TFun(ty(depth - 1), row(depth), result);
      return result;
    };
    const record = depth => new Core.TRecord({
      fields: many(grammar.fields, (_, at) => new Tuple.Tuple(
        `f${(at * 7 + pick(3)) % 5}`, ty(depth - 1))),
      tails: many(grammar.tails, variable) });
    const handler = depth => new Core.THandler(label(depth), {
      inference: row(depth),
      clauses: pick(2) === 0 ? Nothing.value : new Just(row(depth)) });
    const data = depth => new Core.TData(pick(3),
      many(grammar.arguments, () => ty(depth - 1)),
      many(grammar.arguments, () => row(depth)));
    const ty = depth => (depth <= 0 ? leaf()
      : [leaf, spine, record, handler, data][pick(5)](depth));
    return () => ty(grammar.depth);
  };

  // A total renaming: every hole and rigid moved, so a skipped variable
  // shows.
  const moved = open => (open instanceof Checked.Hole
    ? new Checked.Hole(open.value0 * 7 + 3)
    : new Checked.Rigid(open.value0 + 1));
  const renamed = ty => Core.rename(Checked.ordOpen)(moved)(ty);
  const traversed = ty => Traverse.traverseTy(Either.applicativeEither)(
    Checked.ordOpen)(open => new Either.Right(moved(open)))(ty);
  // Whether a traversal agrees with `rename` on `ty`.
  const agrees = (traversal, ty) => {
    const found = traversal(ty);
    return found instanceof Either.Right && eqTy.eq(found.value0)(
      renamed(ty));
  };
  // The generated types on which `traversal` disagrees with `rename`.
  const disagreements = traversal => seeds.flatMap(seed => {
    const make = generator(seed);
    return Array.from({ length: samples }, make).filter(ty =>
      !agrees(traversal, ty));
  });
  return { Core, Row, Checked, Either, Traverse, Just, Nothing,
    Tuple: Tuple.Tuple, generator,
    moved, renamed, traversed, agrees, disagreements, eqTy };
};
