// Scope A's checks (dossier §18.198-§18.200; implementation proposal §8
// task 4), shared by test/r0-scope-a.test.mjs and the restored-defect
// probes (test/regression-r0-scope-a.mjs). Each returns the cases that
// fail, so a probe can name them. `load` loads a compiled module.
import { choose, generator } from './coverage-oracle.mjs';
import { tablesChecks } from './r0-scope-a-tables.mjs';
import { boundaryChecks } from './r0-scope-a-boundary.mjs';

const named = value => value.constructor.name;

export const scopeAChecks = async load => {
  const Atom = await load('Domain.Recorded.Atom');
  const Hole = await load('Domain.Recorded.Hole');
  const Maps = await load('Data.Map.Internal');
  const { Tuple } = await load('Data.Tuple');
  const { under } = await load('Features.Check.Strategy.Candidate');
  const ordVar = Atom.ordVar;

  // ---- `under` is canonicalization after one substitution (design
  // §17.6): a JS reference splices bound tails after the record's own
  // fields, replaces bound variables, then sorts fields by label (code
  // units, stable) and tails by the derived Ord Var, at every depth.
  const int = new Atom.Base(Atom.IntBase.value);
  const bool = new Atom.Base(Atom.BoolBase.value);
  const rigid = n => new Atom.RigidVar(n);
  const flexTy = [Hole.holeVar(1), Hole.holeVar(2)];
  const flexRow = [Hole.holeVar(11), Hole.holeVar(12)];
  const rigidTy = [rigid(0)];
  const rigidRow = [rigid(5)];
  const labels = ['b', 'a', 'c'];
  const pick = (next, items) => items[choose(next, items.length)];
  const typeOf = (next, depth, vars, tails) => {
    const k = choose(next, depth > 2 ? 3 : 6);
    if (k === 0) return pick(next, [int, bool]);
    if (k === 1 || k === 2) return new Atom.TVar(pick(next, vars));
    if (k === 3) return new Atom.Arrow(typeOf(next, depth + 1, vars, tails),
      typeOf(next, depth + 1, vars, tails));
    if (k === 4) return new Atom.App(new Atom.DataHead(choose(next, 2)),
      [typeOf(next, depth + 1, vars, tails)]);
    const fields = Array.from({ length: choose(next, 3) }, () =>
      new Tuple(pick(next, labels), typeOf(next, depth + 1, vars, tails)));
    const rows = [...new Set(Array.from({ length: choose(next, 3) }, () =>
      pick(next, tails)))];
    return new Atom.Record(fields, rows);
  };
  const isRecord = ty => ty instanceof Atom.Record;
  const reference = (image, ty) => {
    if (ty instanceof Atom.TVar) {
      const bound = image.get(ty.value0);
      return bound === undefined ? ty : reference(new Map(), bound);
    }
    if (ty instanceof Atom.Arrow) return new Atom.Arrow(
      reference(image, ty.value0), reference(image, ty.value1));
    if (ty instanceof Atom.App) return new Atom.App(ty.value0,
      ty.value1.map(arg => reference(image, arg)));
    if (!isRecord(ty)) return ty;
    let fields = ty.value0.map(pair =>
      new Tuple(pair.value0, reference(image, pair.value1)));
    let tails = [];
    for (const tail of ty.value1) {
      const bound = image.get(tail);
      if (bound === undefined) { tails.push(tail); continue; }
      const row = reference(new Map(), bound);
      fields = fields.concat(row.value0);
      tails = tails.concat(row.value1);
    }
    const byLabel = (x, y) => (x.value0 < y.value0 ? -1
      : x.value0 > y.value0 ? 1 : 0);
    const byVar = (x, y) => ({ LT: -1, EQ: 0, GT: 1 })[
      named(ordVar.compare(x)(y))];
    return new Atom.Record([...fields].sort(byLabel), [...tails].sort(byVar));
  };
  const same = (x, y) => Atom.eqRTExpr.eq(x)(y);
  const canonicalWrong = (cases = 400) => {
    const next = generator(0x5ca);
    const wrong = [];
    for (let index = 0; index < cases; index += 1) {
      // Generic: keys flexible, images mention no key, a row's image a
      // record (Candidate.purs `generic`).
      const image = new Map();
      for (const v of flexTy) if (choose(next, 2) === 0)
        image.set(v, typeOf(next, 1, rigidTy, rigidRow));
      for (const v of flexRow) if (choose(next, 2) === 0) {
        const fields = Array.from({ length: 1 + choose(next, 2) }, () =>
          new Tuple(pick(next, labels), typeOf(next, 2, rigidTy, rigidRow)));
        image.set(v, new Atom.Record(fields,
          choose(next, 2) === 0 ? [] : rigidRow));
      }
      let candidate = Maps.empty;
      for (const [k, v] of image) candidate = Maps.insert(ordVar)(k)(v)(
        candidate);
      const ty = typeOf(next, 0, [...flexTy, ...rigidTy],
        [...flexRow, ...rigidRow]);
      const found = under(candidate)(ty);
      if (!same(found, reference(image, ty)))
        wrong.push(`under ${index}`);
      if (!same(under(Maps.empty)(found), found))
        wrong.push(`idempotent ${index}`);
    }
    return wrong;
  };

  return { canonicalWrong, ...await tablesChecks(load),
    ...await boundaryChecks(load) };
};
