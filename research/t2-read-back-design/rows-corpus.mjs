// Tranche 2 Task 8's corpus check (corpus-observed): `readRows` over the
// corpus loader's candidates (generation and `recheck` both succeed),
// each declaration's outcome: rows read, or the fault with its role.
// Marks are read with a research term function that keeps every mark
// class apart (`J {meta:n}` per store representative), so `Apart` is
// not hidden by least terms. Also: `main`'s entry tail, read from the
// checked row, whose holes `recheck` does not renumber with the body.
//   node research/t2-read-back-design/rows-corpus.mjs
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';

const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const Function = await load('Features.Check.Function');
const { functional } = await load('Features.Check.Functional');
const { fields } = await load('Domain.Recorded');
const { resolveMark } = await load('Features.Check.MarkStore');
const Rows = await load('Features.Check.Strategy.ReadBack.EffectRows');
const P = await load('Domain.Verdict.EffectPackage.Types');
const Sets = await load('Data.Set');
const Maps = await load('Data.Map.Internal');
const { unfoldableArray } = await load('Data.Unfoldable');

const named = value => value.constructor.name;
const shown = 3;
const out = { candidates: 0, read: 0, faults: {}, examples: {},
  unsupported: {}, entry: {} };
const bump = (table, key) => { table[key] = (table[key] ?? 0) + 1; };
const note = (key, at) => {
  out.examples[key] ??= [];
  if (out.examples[key].length < shown) out.examples[key].push(at);
};

const termsOf = store => mark => {
  const found = resolveMark(store)(mark);
  switch (named(found)) {
  case 'NoFail': return P.TermN.value;
  case 'Plain': return P.TermM.value;
  case 'MarkVariable': return new P.TermJ(Sets.singleton(found.value0));
  case 'MarkMeta': return new P.TermJ(Sets.singleton(`meta:${found.value0}`));
  default: return new P.TermJ(Sets.singleton('unmarked'));
  }
};

const roleOf = variable => (named(variable) === 'EffFresh'
  ? named(variable.value1) : named(variable));
const faultKey = fault => {
  const kind = named(fault);
  if (kind === 'Unread' || kind === 'Apart')
    return `${kind} ${roleOf(fault.value0)}`;
  if (kind === 'Clash') return `Clash ${named(fault.value0)}`;
  return kind;
};

// Hole numbers in package rows (tails and label arguments' tails).
const holesOf = (value, found = []) => {
  if (value === null || typeof value !== 'object') return found;
  if (named(value) === 'PTailHole') found.push(value.value0);
  for (const part of Object.values(value)) holesOf(part, found);
  return found;
};

// The entry tail's hole: negative (a raw signature meta), shared with
// another variable's row, or alone in the package.
const entryCheck = (map, at) => {
  const pairs = Maps.toUnfoldable(unfoldableArray)(map);
  const entry = pairs.find(pair => roleOf(pair.value0) === 'EntryTail');
  if (entry === undefined) return;
  const tail = entry.value1.tail;
  if (named(tail) !== 'Just' || named(tail.value0) !== 'PTailHole')
    return bump(out.entry, 'not a hole');
  const hole = tail.value0.value0;
  const others = new Set(pairs.filter(pair => pair !== entry)
    .flatMap(pair => holesOf(pair.value1)));
  const kind = hole < 0 ? 'negative' : others.has(hole)
    ? 'number shared with another row' : 'alone';
  bump(out.entry, kind);
  if (kind !== 'alone') note(`entry tail ${kind}`, at);
};

const declaration = (origin, program, inputs, holders, decl) => {
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return;
  const found = Function.recheck(holders)(program)(decl);
  if (named(found) !== 'Right') return;
  out.candidates += 1;
  const at = `${origin}#${decl.name}`;
  const problem = Elaborating.problem(generated.value0);
  const unsupported = fields(problem).effects.obligations.some(o =>
    named(o.value) === 'Unsupported');
  const { function: checked, state, trace } = found.value0;
  const read = Rows.readRows(termsOf(state.subst.marks))(problem)(checked)(
    trace);
  if (named(read) === 'Right') {
    out.read += 1;
    if (unsupported) bump(out.unsupported, 'read');
    return entryCheck(read.value0, at);
  }
  const key = faultKey(read.value0);
  if (unsupported) return bump(out.unsupported, key);
  bump(out.faults, key);
  note(key, at);
};

const started = Date.now();
for (const { origin, source } of await loadCorpus()) {
  let program;
  try { program = resolved(source); } catch { continue; }
  const inputs = Inputs.generationInputs(program);
  const holders = functional(program.ctors);
  for (const decl of program.functions)
    declaration(origin, program, inputs, holders, decl);
}
out.seconds = Math.round((Date.now() - started) / 1000);
console.log(JSON.stringify(out, null, 1));
