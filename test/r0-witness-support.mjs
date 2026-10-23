// Support for Task 4.4's witness tests (W §1.5, §1.6, §4 Cov): the
// production `substitutionWitness` and `coverage`, problems from
// source, candidate substitutions built by hand, and a witness's
// bindings read as [canonical variable, binding] pairs. `witnessFrom`
// takes a loader and loads nothing itself, so a regression probe reads
// the clone's output only (`context.compilerPath`).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stableStringify } from './r0-canonical.mjs';
import { decodeType, decodeVar } from './r0-canonical-decode.mjs';
import { onlineFrom } from './r0-online-support.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// W §1.5's example (ground-check.md §3): `route`'s `u`, inst slot 0 of
// its call of `divide`.
export const routeSource = readFileSync(join(root,
  'research/division-campaign/source/examples/p11-route.wxw'), 'utf8');
// RT7's field access: `p.a` records auxiliaries (T-R0b §5.2).
export const fieldSource = 'fn field(p: { a: Int, ...r }): Int = p.a;\n'
  + 'fn main(): Int = 0;\n';

export const witnessFrom = async load => {
  const online = await onlineFrom(load);
  const Witness = await load('Features.Check.Strategy.Witness');
  const Atom = await load('Domain.Recorded.Atom');
  const Bound = await load('Domain.Verdict.Witness');
  const { holeVar } = await load('Features.Check.Strategy.ReadBack.Type');
  const { Tuple } = await load('Data.Tuple');
  const Map = online.Map;
  const key = variable => stableStringify(decodeVar(variable));

  const variables = problem => online.pairs(problem.vars);
  const flexible = problem => variables(problem)
    .filter(([, info]) => info.quant instanceof Atom.Exists);
  // The problem's variable whose canonical text is `text`.
  const variableAt = (problem, text) => {
    const found = variables(problem).find(([variable]) =>
      key(variable) === stableStringify(text));
    if (found === undefined) throw new Error(`no variable ${text}`);
    return found[0];
  };
  const substitution = pairs => pairs.reduce((made, [variable, image]) =>
    Map.insert(Atom.ordVar)(variable)(image)(made), Map.empty);
  const without = (map, variable) => Map['delete'](Atom.ordVar)(variable)(map);
  const rigidRow = index => new Atom.Record([], [new Atom.RigidVar(index)]);
  const holeRow = index => new Atom.Record([], [holeVar(index)]);
  const holeType = index => new Atom.TVar(holeVar(index));
  const int = new Atom.Base(Atom.IntBase.value);
  const witnessOf = (problem, sigma) =>
    Witness.substitutionWitness(problem)(sigma);
  const coverage = (problem, witness) => Witness.coverage(problem)(witness);
  // A binding as data: ['inline', canonical type] or ['free', hole].
  const bindingOf = binding => binding instanceof Bound.Free
    ? ['free', binding.value0] : ['inline', decodeType(binding.value0)];
  const bindings = witness => online.pairs(witness.bindings)
    .map(([variable, binding]) => [key(variable), bindingOf(binding)]);
  // By constructor name, then the variable a reason names; the names
  // alone in a probe, where decoding reads the main output's classes.
  const reasonName = compilation =>
    compilation.constructor.name === 'NoWitness'
      ? compilation.value0.constructor.name : compilation.constructor.name;
  const reason = compilation => compilation.constructor.name === 'NoWitness'
    ? [reasonName(compilation), key(compilation.value0.value0)]
    : [reasonName(compilation)];
  return { online, Witness, Atom, Bound, Tuple, Map, key, flexible,
    variableAt, substitution, without, rigidRow, holeRow, holeType, int,
    witnessOf, coverage, bindings, reason, reasonName, decodeType };
};
