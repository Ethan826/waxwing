// A2 Task 14's regression probes (the differential reporter, spec C6),
// spread into r0A2Probes (test/regression-r0-a2.mjs); the rows are in
// scripts/regression-r0-a2-report.mjs. Each row edits the reporter
// test/r0-a2-differential.mjs (tree: 'test'), so the probes import it
// from their own copy of test/. `reportCases` builds the fixtures for the
// probes and for test/r0-a2-differential.test.mjs.
import { fail, passed } from './regression-r0-amin-support.mjs';

const kSource = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let go = fn(r) => Fail.fail(r.e); () }; fn main(): Int = 0;';
// Two lambdas, so two recorded FailConcretes: obligations 1 and 4.
const twoSource = 'type E = E; fn k(): Unit with Fail(E) = '
  + '{ let a = fn(r) => Fail.fail(r.e); let b = fn(s) => Fail.fail(s.e); '
  + '() }; fn main(): Int = 0;';
export const hole = { var: { hole: 7 } };
const failOf = payload => ({ labels: [{ effect: 'Fail', args: [payload],
  mark: 'N' }], tail: null });
const empty = { fields: [], tails: [] };
const record = payload => ({ record: { fields: [['e', payload]],
  tails: [] } });

export const reportCases = async load => {
  const { validateCases } = await import('./regression-r0-a2-validate.mjs');
  const { packageOf } = await import('./r0-a2-package.mjs');
  const cases = await validateCases(load);
  const { problemOf, honest } = cases;
  const k = problemOf(kSource, 'k');
  // Flexible types: Param (the lambda's record), Res, Field (r.e's
  // payload), Rest (a tail). The lambda's row is `Fail(payload)`, so the
  // consumption lines up; the field variable is bound to `image`, or
  // left out when that is null.
  const kInput = (image, payload = hole) => {
    const [param, res, field, rest] = cases.flexTypes(k);
    const given = packageOf({ types: [[res, 'Unit'],
      [param, record(payload)], ...(image === null ? [] : [[field, image]])],
    rows: [[rest, empty]],
    effects: [[k.effects.flexEff[0], failOf(payload)]] });
    return { ...honest(k), types: given.types, rows: given.rows,
      effects: given.effects };
  };
  // The first lambda's payload is `Int`, the second's a hole.
  const two = problemOf(twoSource, 'k');
  const [pa, ra, fa, ta, pb, rb, fb, tb] = cases.flexTypes(two);
  const [ea, eb] = two.effects.flexEff;
  const made = packageOf({ types: [[ra, 'Unit'], [rb, 'Unit'],
    [pa, record('Int')], [fa, 'Int'], [pb, record(hole)], [fb, hole]],
  rows: [[ta, empty], [tb, empty]],
  effects: [[ea, failOf('Int')], [eb, failOf(hole)]] });
  const twoInput = { ...honest(two), types: made.types, rows: made.rows,
    effects: made.effects };
  return { cases, k, kInput, two, twoInput };
};

const refuses = (refusal, at) => ({ accepts: false, refusal, at });
const need = (actual, expected, label) => {
  if (actual !== expected)
    fail(`${label}: expected ${expected}, got ${actual}`);
};

const probe = check => async context => {
  const { load } = await import('./r0-generate-support.mjs');
  const differential = await import('./r0-a2-differential.mjs');
  check(differential, await reportCases(load));
  passed(context);
};
const row = (differential, name, item) => differential.classify({
  name, evidence: 'fixture', ...item });

export const a2ReportProbes = {
  // C6 needs the hole: a concrete payload is a plain widening.
  'r0-a2-c6-hole-settled': probe((differential, { k, kInput }) => {
    const concrete = kInput('Int', 'Int');
    need(row(differential, 'c', { today: refuses('FailNeedsConcrete', 1),
      problem: k, input: concrete }).category, 'ValidatorWider',
    'C6 with a concrete payload');
  }),
  // C6 needs today's refusal to be FailNeedsConcrete.
  'r0-a2-c6-needs-concrete': probe((differential, { k, kInput }) => {
    need(row(differential, 'c', { today: refuses('NofailOnFail', 1),
      problem: k, input: kInput(hole) }).category, 'ValidatorWider',
    'C6 under another refusal');
  }),
  // C6 needs the hole at the obligation today refuses at.
  'r0-a2-c6-site-tie': probe((differential, { two, twoInput }) => {
    const at = index => row(differential, 'c', {
      today: refuses('FailNeedsConcrete', index), problem: two,
      input: twoInput }).category;
    need(at(1), 'ValidatorWider', 'C6 at the concrete payload');
    need(at(4), 'C6-expected-divergence', 'C6 at the hole payload');
  }),
  'r0-a2-evidence-render': probe((differential, { k, kInput }) => {
    const item = { today: { accepts: true }, problem: k,
      input: kInput(hole) };
    const rows = [differential.classify({ name: 'near', evidence: 'fixture',
      ...item }), differential.classify({ name: 'far', evidence: 'corpus',
      ...item })];
    const [first, second] = differential.render(rows).split('corpus evidence:');
    if (second === undefined || first.includes('far') || !second.includes(
      'far')) fail('render merged the fixture and corpus rows');
  }),
  'r0-a2-evidence-basis': probe((differential, { k, kInput }) => {
    const item = { today: { accepts: true }, problem: k,
      input: kInput(hole) };
    need(differential.classify({ name: 'far', evidence: 'corpus', ...item })
      .basis, 'observed', 'a corpus row\'s basis');
  })
};
