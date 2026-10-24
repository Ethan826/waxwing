import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { Right } from '../output/Data.Either/index.js';
import * as Generate from '../output/Features.Check.Generate/index.js';
import * as Inputs from '../output/Features.Check.Generate.Inputs/index.js';
import { problem } from '../output/Domain.Elaborating/index.js';
import { loadCorpus } from './r0-corpus.mjs';
import { translateProgram } from './r0-translator.mjs';
import { canonicalOf, entryLists, entryMultiset, stableStringify,
  wholeProblem } from './r0-canonical.mjs';

// RT1 (T-R0b §9 item 1; R0 tranche Task 3.3 step 4): the generator
// (Task 3.2) and the independent translator (Task 3.3 steps 1-3)
// compared over the pinned corpus, which holds the fixtures' sources.
// The comparison is equality of the multisets of `(Origin.atom, entry)`
// and of `vars`, after recorder-spec §5.3's normalization on both
// sides; a script checks that every rule id of §3 occurs in both and
// that every Outside constructor maps to a fixture. Corpus-wide, hence
// serial (ruling R11).
const corpus = await loadCorpus();
const programs = corpus.flatMap(({ origin, source }) => {
  const parsed = parse(source);
  if (!(parsed instanceof Right)) return [];
  const named = resolve(parsed.value0);
  return named instanceof Right ? [{ origin, program: named.value0 }] : [];
});

// Both sides of every declaration; `generated` is null where generate
// is not Right (the first test requires it everywhere).
const pairs = programs.flatMap(({ origin, program }) => {
  const { tables, signatures } = Inputs.generationInputs(program);
  const translated = translateProgram(program);
  return program.functions.map(decl => {
    const run = Generate.generate(tables)(signatures)(decl);
    return { origin, name: decl.name, translated: translated[decl.id],
      generated: run instanceof Right ? canonicalOf(problem(run.value0))
        : null };
  });
});

// Recorder-spec §5.3: `eq t t` may be dropped unless `t` holds a record
// with two or more parts or a written label beside a tail.
const composite = type => {
  if (Array.isArray(type)) return type.some(composite);
  if (!type || typeof type !== 'object') return false;
  if (type.record) {
    const { fields, tails } = type.record;
    if (fields.length + tails.length >= 2) return true;
  }
  return Object.values(type).some(composite);
};
const trivial = entry => entry.value.eq !== undefined
  && stableStringify(entry.value.eq[0]) === stableStringify(entry.value.eq[1])
  && !composite(entry.value.eq[0]);
const normalized = problem => ({ ...problem,
  b: problem.b.filter(entry => !trivial(entry)),
  d: problem.d.filter(entry => !trivial(entry)) });

const varsOf = problem => problem.vars.map(stableStringify);
const where = pair => `${pair.origin} ${pair.name}`;

// The first disagreement, if any: [where, which, translator, generator].
const disagreements = (key, limit = 3) => pairs.flatMap(pair => {
  const [mine, theirs] = [key(pair.translated), key(pair.generated)];
  if (stableStringify(mine) === stableStringify(theirs)) return [];
  const only = (a, b) => a.filter(item => !b.includes(item)).slice(0, 2);
  return [[where(pair), only(mine, theirs), only(theirs, mine)]];
}).slice(0, limit);

test('generate is Right on every corpus declaration', () => {
  assert.ok(programs.length > 900, `${programs.length} programs`);
  assert.ok(pairs.length > 2500, `${pairs.length} declarations`);
  assert.deepEqual(pairs.filter(pair => pair.generated === null)
    .map(where), []);
});

test('RT1: the (Origin.atom, entry) multisets agree after §5.3', () => {
  assert.deepEqual(disagreements(problem =>
    entryMultiset(normalized(problem))), []);
});

test('RT1: the vars maps agree', () => {
  assert.deepEqual(disagreements(varsOf), []);
});

// Final review, Minor 4: ReadBack.Type's `holeVar` is a fresh variable at
// the reserved path [Named "hole", Index n]; a generated variable on it
// would be defaulted as a hole. The corpus shows generation never writes
// one, and the check itself sees a planted one.
const holeStep = key => key.fresh !== undefined
  && key.fresh.path.steps.includes('hole');
const holeVars = problem => problem.vars.map(([key]) => key)
  .filter(holeStep).map(stableStringify);

test('no generated variable has a Named "hole" path step', () => {
  const planted = { fresh: { path: { root: 'body', steps: ['hole', 0] } } };
  assert.equal(holeStep(planted), true);
  assert.deepEqual(pairs.flatMap(pair => holeVars(pair.generated)
    .map(found => `${where(pair)} ${found}`)), []);
});

// Beyond RT1's statement: the whole problems agree, origins (rule, row,
// span, kind), `types` and the rigid arrays, with every array whose order
// is recorded, not canonical, sorted: entry lists and the flexible
// variables (`wholeProblem`).
test('the whole canonical problems agree, recorded orders sorted', () => {
  assert.deepEqual(disagreements(problem => [wholeProblem(problem)], 1), []);
});

const allRules = [
  ...Array.from({ length: 10 }, (_, at) => `Sig${at + 1}`),
  ...Array.from({ length: 28 }, (_, at) => `E${at + 1}`),
  ...Array.from({ length: 7 }, (_, at) => `P${at + 1}`)];
// T-R0b §3's rows give these no entry and no variable.
const silent = ['Sig2', 'Sig9', 'E1', 'E2', 'E24', 'P1', 'P2'];
const rulesOf = side => new Set(pairs.flatMap(pair => [
  ...entryLists.flatMap(list => pair[side][list]
    .map(entry => entry.origin.rule)),
  ...pair[side].vars.map(([, info]) => info.origin.rule)]));

test('every rule id of §3 occurs in both, but the silent ones', () => {
  for (const side of ['translated', 'generated'])
    assert.deepEqual(allRules.filter(rule => !rulesOf(side).has(rule)),
      silent, side);
});

// R11: LocalGeneralization is produced by no resolved construct (T-R0b
// §3.5), so no fixture can show it; it is exempt.
test('every Outside constructor but LocalGeneralization has a fixture',
  () => {
    const kinds = ['EffectArgument', 'DataOverRecords', 'DataApplication',
      'HandlerType', 'FailFamily', 'Deferred'];
    for (const kind of kinds) for (const side of ['translated', 'generated'])
      assert.ok(pairs.some(pair => pair[side].outside.some(entry =>
        entry.value === kind)), `${kind} on the ${side} side`);
  });

// B13 (T-R0b §11 item 2): P5-P7 give each record pattern its own
// equation and no PatternGrowth marker; the count shows the evidence.
test('B13: record patterns agree and carry no growth marker', () => {
  const patterns = side => pairs.flatMap(pair => pair[side].b
    .filter(entry => ['P5', 'P6', 'P7'].includes(entry.origin.rule))
    .map(entry => `${where(pair)} ${stableStringify(entry)}`)).sort();
  const mine = patterns('translated');
  assert.ok(mine.length > 2000, `${mine.length} record-pattern atoms`);
  assert.deepEqual(mine, patterns('generated'));
});
