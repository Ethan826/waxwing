import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { sigmaPackageFrom } from './r0-sigma-package.mjs';
import { loadCorpus } from './r0-corpus.mjs';
import { load, resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';

// A2 Task 15 (docs/plans/2026-10-31-a2-validator-plan.md), spec §11's
// owed corpus checks: "hole numerals" (§2.4) and the type part of A3's
// completeness impact. Today's candidates are the online search's
// certificates over the pinned corpus, as test/r0-elab-corpus-run.mjs
// observes them; each σ is lifted to an input package here (types and
// record rows only: an arrow's row closed, a handler's mark N, a data
// type's rows none), which `erase` maps back to σ (counted). The lift
// has no effect rows, so it holds no effect hole: the effect part of
// both checks waits for tranche 2's read-back. Corpus-observed results,
// not properties of every program. Corpus-wide, hence serial.
const online = await onlineFrom(load);
const P = await load('Domain.Verdict.EffectPackage');
const Atom = await load('Domain.Recorded.Atom');
const Package = await load('Features.Check.Strategy.Effects.Package');
const Complete = await load('Features.Check.Strategy.Effects.Complete');
const Witness = await load('Features.Check.Strategy.Witness');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Decide = await load('Features.Check.Decide');
const Shadow = await load('Features.Check.Decide.Shadow');
const Online = await load('Features.Check.Strategy.Online');
const Elaborating = await load('Domain.Elaborating');
const { fields } = await load('Domain.Recorded');
const Maps = await load('Data.Map.Internal');
const { Tuple } = await load('Data.Tuple');
const { Nothing } = await load('Data.Maybe');
const { unfoldableArray } = await load('Data.Unfoldable');

const named = value => value.constructor.name;
const pairs = map => Maps.toUnfoldable(unfoldableArray)(map)
  .map(pair => [pair.value0, pair.value1]);
// σ as an input package: each key at its recorded sort.
const packageOf = await sigmaPackageFrom(load);

// Every certificate the online search offers, with `decide`'s verdict.
const candidatesOf = ({ origin, source }) => {
  let program;
  try { program = resolved(source); } catch { return []; }
  const searched = new Map();
  const search = Online.onlineSearch(online.contextOf(program));
  const observed = given => problem => {
    const found = search(given)(problem);
    if (named(found) === 'Candidate') searched.set(problem, found.value0);
    return found;
  };
  const checking = { ...Shadow.shadowChecking(online.legacyText)(budget)(
    program), strategies: [Online.onlineWith(observed)], shadows: [] };
  const inputs = Inputs.generationInputs(program);
  return program.functions.flatMap(decl => {
    const generated = Generate.generate(inputs.tables)(inputs.signatures)(
      decl);
    if (named(generated) !== 'Right') return [];
    const problem = Elaborating.problem(generated.value0);
    const decided = Decide.judgedDecision(checking)(problem);
    const certificate = searched.get(problem);
    if (certificate === undefined) return [];
    const solved = named(decided) === 'Right'
      && named(decided.value0.judged) === 'Just';
    return [{ at: `${origin}#${decl.name}`, problem, solved,
      sigma: certificate.unsettled }];
  });
};
const candidates = (await loadCorpus()).flatMap(candidatesOf);

// Record fields by label, at every depth: `erase` writes records so
// (spec §2.5); today's σ need not. Tails keep their order: the author
// approved field order only (§18.148 (5); spec §11).
const canonical = ty => {
  if (ty instanceof Atom.Arrow)
    return new Atom.Arrow(canonical(ty.value0), canonical(ty.value1));
  if (ty instanceof Atom.App)
    return new Atom.App(ty.value0, ty.value1.map(canonical));
  if (!(ty instanceof Atom.Record)) return ty;
  const fields = ty.value0.map(field => new Tuple(field.value0,
    canonical(field.value1))).sort((one, other) =>
    one.value0 < other.value0 ? -1 : Number(one.value0 > other.value0));
  return new Atom.Record(fields, ty.value1);
};
const sameImage = order => (one, other) => Atom.eqRTExpr.eq(order(one))(
  order(other));
const sameMaps = (same, one, other) => one.length === other.length
  && one.every(([key, value], index) => Atom.eqVar.eq(key)(other[index][0])
    && same(value, other[index][1]));
const sameBinding = (one, other) => named(one) === named(other)
  && (named(one) === 'Free' ? one.value0 === other.value0
    : sameImage(canonical)(one.value0, other.value0));
// bindingsOf's numbering against completion's, on σ as an input package.
const numbering = (found, at, problem, sigma) => {
  const input = packageOf(problem, sigma);
  const erased = pairs(Package.erase(input));
  if (!sameMaps(sameImage(ty => ty), erased, pairs(sigma)))
    found.reordered.push(at);
  if (!sameMaps(sameImage(canonical), erased, pairs(sigma)))
    return found.unlifted.push(at);
  const today = pairs(Witness.bindingsOf(problem)(sigma));
  const completed = pairs(Complete.witnessOf(problem)(
    Complete.complete(problem)(input)).bindings);
  if (today.some(([key]) => !Maps.member(Atom.ordVar)(key)(sigma)))
    found.fresh += 1;
  if (!sameMaps(sameBinding, today, completed)) found.differ.push(at);
};
const tally = () => ({ runs: 0, reordered: [], unlifted: [], fresh: 0,
  differ: [] });
const report = found => `${found.runs} runs, ${found.reordered.length}`
  + ' with record fields out of label order (erase sorts them),'
  + ` ${found.unlifted.length} not lifted up to that order, ${found.fresh}`
  + ` with a variable σ leaves out, ${found.differ.length} numbered apart`;

test('hole numerals: completion numbers as bindingsOf (no effect hole)',
  t => {
    const found = tally();
    // Each candidate, then it less its first and its last variable in
    // `Ord Var` order (a bound: every variable of every candidate is
    // quadratic on the largest), so bindingsOf's own numbering runs.
    const less = tally();
    for (const { at, problem, sigma } of candidates) {
      found.runs += 1;
      numbering(found, at, problem, sigma);
      const keys = pairs(sigma).map(([key]) => key);
      for (const key of new Set([keys[0], keys.at(-1)].filter(Boolean))) {
        less.runs += 1;
        numbering(less, at, problem, Maps.delete(Atom.ordVar)(key)(sigma));
      }
    }
    t.diagnostic(`corpus-observed, candidates: ${report(found)}`);
    t.diagnostic('corpus-derived, less its first or last variable: '
      + report(less));
    // Observed 2026-11-01: 2820 candidates (14 reordered), none leaving a
    // variable out; 3642 derived runs (25 reordered), each leaving one.
    // The recorded field-order finding: today's σ is not always sorted.
    assert.equal(found.reordered.length, 14, found.reordered.join('; '));
    assert.ok(less.reordered.length > 0);
    for (const each of [found, less]) {
      assert.deepEqual(each.unlifted.slice(0, 10), []);
      assert.deepEqual(each.differ.slice(0, 10), []);
    }
    assert.ok(less.fresh > 0);
  });

// No pinned fixture records a witness binding; the `Free n` numerals in
// tests are listed (hand-built witnesses, not a numbering's output). The
// scan is lexical: a witness pinned only through a hash or a generated
// output (no literal `Free`) would not show here.
const filesUnder = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? filesUnder(join(dir, entry.name))
    : [join(dir, entry.name)]);
test('hole numerals: pinned fixtures and tests', t => {
  const pinned = filesUnder('test/fixtures').filter(file =>
    /\bFree\b/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(pinned, []);
  const numerals = readdirSync('test').filter(name => name.endsWith('.mjs'))
    .flatMap(name => [...readFileSync(join('test', name), 'utf8')
      .matchAll(/\b[Ff]ree\((\d+)\)|`?Free (\d+)`?/g)]
      .map(match => `${name}: ${match[1] ?? match[2]}`));
  t.diagnostic(`test Free numerals: ${numerals.join('; ')}`);
  assert.ok(numerals.length > 0);
});

test('A3 impact, type part: unsolvedKey over Solved candidates', t => {
  const solved = candidates.filter(item => item.solved);
  const refused = solved.filter(({ problem, sigma }) => named(
    Witness.unsolvedKey(problem)(packageOf(problem, sigma))) === 'Just');
  t.diagnostic(`corpus-observed: ${solved.length} Solved candidates,`
    + ` ${refused.length} refused by unsolvedKey (types and rows only)`);
  // Observed 2026-11-01 (corpus-observed): 2030 Solved candidates, 0
  // refused; 2028 since the minting switch (the two `statsEvidence` read
  // faults, §18.170). The floor is that count, so a shrinking corpus fails.
  assert.ok(solved.length >= 2028, `${solved.length} Solved candidates`);
  assert.deepEqual(refused.map(item => item.at).slice(0, 10), []);
});
