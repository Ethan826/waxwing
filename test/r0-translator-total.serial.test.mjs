import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { loadCorpus } from './r0-corpus.mjs';
import { translateProgram } from './r0-translator.mjs';
import { entryLists, outOfOrder, stableStringify } from './r0-canonical.mjs';

// RT1's translator over the pinned R0 corpus (Task 3.3): total (RT5,
// G-total), every variable it mentions is in `vars` (RT7's first
// clause), canonical order holds, and every rule of T-R0b §3 that has
// entries emits some. Corpus-wide, hence serial (ruling R11).
const corpus = await loadCorpus();
const resolved = corpus.flatMap(entry => {
  const parsed = parse(entry.source);
  if (parsed.constructor.name !== 'Right') return [];
  const named = resolve(parsed.value0);
  return named.constructor.name === 'Right'
    ? [{ origin: entry.origin, program: named.value0 }] : [];
});
const problems = resolved.flatMap(found => translateProgram(found.program)
  .map(problem => ({ origin: found.origin, problem })));

// Rules whose table rows give no entries: Sig1 (rigid `vars` only),
// Sig2 (Γ₀), Sig9 (`Q` empty), E1, E2, E24 and P1, P2 (types only).
const entryFree = ['Sig1', 'Sig2', 'Sig9', 'E1', 'E2', 'E24', 'P1', 'P2'];
const allRules = [
  ...Array.from({ length: 10 }, (_, at) => `Sig${at + 1}`),
  ...Array.from({ length: 28 }, (_, at) => `E${at + 1}`),
  ...Array.from({ length: 7 }, (_, at) => `P${at + 1}`)];

const mentioned = (value, found = []) => {
  if (Array.isArray(value)) value.forEach(item => mentioned(item, found));
  else if (value && typeof value === 'object') {
    if ('rigid' in value || 'fresh' in value) found.push(value);
    else Object.values(value).forEach(item => mentioned(item, found));
  }
  return found;
};

test('the translator returns for every resolving corpus program', () => {
  assert.ok(resolved.length > 900, `${resolved.length} programs`);
  assert.equal(problems.length, resolved.reduce((sum, found) =>
    sum + found.program.functions.length, 0));
});

test('every variable an entry or type mentions is in vars', () => {
  const missing = problems.flatMap(({ origin, problem }) => {
    const known = new Set(problem.vars.map(([key]) => stableStringify(key)));
    const values = [...entryLists.flatMap(list => problem[list]
      .map(entry => entry.value)), ...problem.types.map(([, type]) => type)];
    return mentioned(values).map(stableStringify)
      .filter(key => !known.has(key)).map(key => `${origin}: ${key}`);
  });
  assert.deepEqual(missing.slice(0, 5), []);
});

test('records, vars and types are in canonical order', () => {
  const unordered = problems.filter(({ problem }) =>
    outOfOrder(problem).length > 0).map(({ origin }) => origin);
  assert.deepEqual(unordered.slice(0, 5), []);
});

test('every rule with entries emits some; the rest emit none', () => {
  const seen = new Set(problems.flatMap(({ problem }) => entryLists
    .flatMap(list => problem[list].map(entry => entry.origin.rule))));
  assert.deepEqual(allRules.filter(rule => !seen.has(rule)), entryFree);
});

// R11: LocalGeneralization is produced by no resolved construct today
// (T-R0b §3.5: lambdas and lets are monomorphic), so no fixture can
// show it; it is exempt from the per-kind check with that reason.
test('every marker kind but LocalGeneralization occurs', () => {
  const kinds = new Set(problems.flatMap(({ problem }) =>
    problem.outside.map(entry => entry.value)));
  assert.deepEqual([...kinds].sort(), ['DataApplication', 'DataOverRecords',
    'Deferred', 'EffectArgument', 'FailFamily', 'HandlerType']);
});
