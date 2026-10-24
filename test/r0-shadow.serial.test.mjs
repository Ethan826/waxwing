import test from 'node:test';
import assert from 'node:assert/strict';
import { pinCommand, pinnedWindow, windowFile, windowPrograms, windowTable }
  from './r0-shadow-run.mjs';
import { summaryOf } from './r0-shadow-summary.mjs';
import { windowClasses } from './r0-shadow-classes.mjs';
import { defectProbes, defects, falseContradictions, knownValid }
  from './r0-shadow-known.mjs';
import { pinnedCensus } from './r0-census-run.mjs';
import { pinnedRt8 } from './r0-rt8-run.mjs';
import { outsideKinds } from './r0-census-classify.mjs';

// Task 4.5: the shadow run and the window table (G-switch evidence;
// plan §3.1, §3.2, Review Focus 1). Every declaration's class today and
// under R0 as decided in shadow (`shadowChecking`: `online` alone, no
// refuter, rule or shadow), and a row for each difference, pinned in
// test/fixtures/r0/window.json, so a class that moves fails here. It
// decides nothing and changes no acceptance. Corpus-wide, so serial.
const programs = await windowPrograms();
const table = windowTable(programs);
const rows = table.rows;
const rowAt = at => rows.find(row => row.at === at);

test('the window equals its pinned table', () => {
  assert.deepEqual(table, pinnedWindow(),
    `${windowFile} is stale; re-pin with \`${pinCommand}\` and review`);
});

test('every row has a known class, its label, and no source', () => {
  assert.ok(rows.length > 1000);
  for (const row of rows) {
    const known = windowClasses[row.class];
    assert.ok(known !== undefined, row.class);
    assert.deepEqual(table.summary.classes[row.class].target, known.target);
    assert.equal(row.section, known.section, row.at);
    assert.equal(row.section === null, row.class === 'defect', row.at);
    assert.equal(row.source, undefined, row.at);
    assert.match(row.hash, /^[0-9a-f]{64}$/);
  }
});

const textOf = row => (row.today === 'compiles' ? null : row.today.text);
test('each hand-labelled declaration is in the run as listed', () => {
  for (const [at, text] of Object.entries(falseContradictions)) {
    assert.equal(rowAt(at)?.class,
      'false contradiction (D6) becomes Unresolved', at);
    assert.equal(textOf(rowAt(at)), text, at);
  }
  for (const [at, { text, evidence }] of Object.entries(knownValid)) {
    assert.equal(rowAt(at)?.class,
      'known-valid program; current solver cannot decide', at);
    assert.equal(textOf(rowAt(at)), text, at);
    assert.equal(rowAt(at).evidence, evidence, at);
  }
  for (const [at, { today }] of Object.entries(defects)) {
    assert.equal(rowAt(at)?.class, 'defect', at);
    assert.equal(textOf(rowAt(at)), today, at);
  }
});

// §3.1 option C: listed, not adopted. Each listed row is a D6 or
// known-valid refusal, refused both today and under R0 (acceptance
// unchanged), with no blocker.
// Fix round 2: f03's validity depends on the open comparability policy
// (refusal-audit.md:411-415), so it is not known-valid.
test('f03 stays undetermined', () => {
  const row = rowAt(
    'research/division-campaign/r0/probes/f03-compare-split.wxw#main');
  assert.equal(row.class,
    'today refuses, outside the unitary fragment: online declines');
  assert.equal(table.summary.classes[row.class].target,
    'undetermined pending classification');
});

test('option C lists only rows refused both ways, with no blocker', () => {
  assert.deepEqual([...table.summary.optionC].sort(),
    [...Object.keys(falseContradictions), ...Object.keys(knownValid)]
      .sort());
  for (const at of table.summary.optionC) {
    const row = rowAt(at);
    assert.equal(row.programCompiles, false, at);
    assert.match(row.r0.verdict, /^Unresolved /, at);
    assert.deepEqual(row.blockers, [], at);
  }
});

// Reconciliation with the census (test/fixtures/r0/census.json), over
// the pinned corpus alone: the inline probes are not in it.
const corpus = programs.filter(program =>
  !program.origin.startsWith('inline:'));
const census = pinnedCensus();
test('the window reconciles with the census', () => {
  const found = summaryOf(corpus);
  assert.equal(found.programs.all, census.corpus.programs);
  assert.equal(found.programs.compiling, census.corpus.accepted);
  assert.equal(found.programs.secondSpreadAtResolve,
    census.secondSpreadAtResolve);
  for (const name of [...outsideKinds, 'ErasedRow'])
    assert.deepEqual(found.blockers[name], {
      declarations: census.categories[name].declarations,
      compilingPrograms: census.categories[name].programs }, name);
  assert.equal(found.stops.underShadowDecisions,
    census.union.programsWithoutErasedRow);
  assert.equal(found.stops.underShadowDecisions
    + found.stops.additionalIfErasedRowAdopted, census.union.programs);
  // Scenario 3 has no census counterpart: the corpus's three compiling
  // bound-hole programs (C001 a1 and a2, erased/form.show-reference) add
  // to it; the pinned summary's two more are R022's inline probes.
  assert.equal(found.stops.additionalIfBoundHolesRejected, 3);
  assert.equal(table.summary.stops.additionalIfBoundHolesRejected
    - found.stops.additionalIfBoundHolesRejected, 2);
  const classes = found.classes;
  assert.equal(classes['erased row: compiles today, census detector fires']
    .declarations, census.erased.markedWithoutOutsideKind);
  assert.equal(classes['BQ at a rigid variable: online declines']
    .declarations, census.guard.rigid);
  assert.equal(classes['BQ pending G-ValidR: compiles today'].declarations,
    census.categories.BQPendingValidR.declarations);
});

// Reconciliation with RT8 (test/fixtures/r0/rt8.json), whose run this
// reads: each RT8 class's count is its rows plus its agreements, over
// RT8's sources (the corpus and R022's probes, not the defect probes).
const defectOrigins = new Set(defectProbes.map(probe => probe.origin));
test('the window reconciles with RT8', () => {
  const counts = {};
  for (const program of programs.filter(found =>
    !defectOrigins.has(found.origin)))
    for (const result of program.results) {
      const rt8 = (result.row ?? result.agreement).rt8;
      counts[rt8] = (counts[rt8] ?? 0) + 1;
    }
  assert.deepEqual(counts, pinnedRt8().classes);
});
