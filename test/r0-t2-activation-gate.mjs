// The A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md;
// the seven criteria of dossier §18.156's report, §18.157), as pure
// functions over evidence in the working tree: `evaluate(evidence)` gives seven
// results, each `{ id, title, met, state }`, `state` the measured lines.
// `evidence` holds the gate-status file (`status`), Task 13's pin
// (`pin`), the gap-verdict file (`verdicts`, test/fixtures/r0/
// t2-gap-verdicts.json), the dossier's and the statements' text, the
// regression registry's row names (`rows`, a Set) and the files the
// status cites (`files`, path to parsed JSON or null) and the src trees
// (`src`: `head`, HEAD's; `at`, each cited record's `commit`'s; see
// `staleness`). Nothing here decides: a
// criterion that needs the author is met only when the status cites a
// dossier section after §18.157 that exists and names the matter.
// Absent or misshapen evidence is unmet, never assumed met; a measure
// that throws is unmet with its message.
// scripts/r0-t2-activation-gate.mjs gathers the evidence and prints
// `reportText`; it runs neither corpus nor compiler.
import { citesWhole, missing, result, ruling, staleness, standing,
  statementsSeven, statusKey, tagged } from './r0-t2-activation-evidence.mjs';
import { acceptance, pinApproved } from './r0-t2-activation-pin.mjs';
import { programLosses } from './r0-t2-replacement-losses.mjs';
import { separatedLive } from './r0-t2-shadow-gate.mjs';

// Each activation prerequisite with the tag its regression row's name
// must carry, so an unrelated row, or one row for several items, does
// not count (BACKLOG itself is not read). Dossier §18.161 (5) added
// R036 (1)-(3) and T6 to R034 (2) and (10).
export const landedItems = [['R034 (2)', 'r034-2'],
  ['R034 (10)', 'r034-10'], ['R036 (1)', 'r036-1'],
  ['R036 (2)', 'r036-2'], ['R036 (3)', 'r036-3'], ['T6', 't6']];
export const comparisonKeys = ['census', 'window', 'rt8', 'shadow'];
export const perfParts = ['readBack', 'validator'];
export const perfMetrics = ['compileTime', 'peakMemory'];

const isObject = value => value !== null && typeof value === 'object';

const ruled = (evidence, key, token) => {
  const cite = statusKey(evidence, key);
  if (cite === undefined) return missing(key);
  const found = ruling(evidence.dossier, cite, token);
  return result(found.met ? [] : [found.line], found.met ? [found.line] : []);
};

// 3. The author's C6 decision (A2 spec §12 C6: open until replacement).
const c6 = evidence => ruled(evidence, 'c6', 'C6');

// One item's row: recorded, tagged for the item, in the registry.
const landedLine = (evidence, [item, tag], row) => {
  if (typeof row !== 'string') return [false, `${item}: not landed `
    + '(no regression row recorded)'];
  if (!tagged(row, tag))
    return [false, `${item}: row ${row} does not carry the tag ${tag}`];
  return evidence.rows.has(row) ? [true, `${item}: landed, row ${row}`]
    : [false, `${item}: row ${row} not in the regression registry`];
};

const notLicense = 'met: the evidence exists; not permission to activate'
  + ' (§18.161 (5))';

// Each row recorded for more than one item, with its items.
const sharedLines = rows => [...new Set(rows.filter(row =>
  typeof row === 'string' && rows.indexOf(row) !== rows.lastIndexOf(row)))]
  .map(row => [false, `one row for several items: ${row} (${landedItems
    .filter((item, index) => rows[index] === row).map(([name]) => name)
    .join(', ')})`]);

// 4. The activation prerequisites landed (BACKLOG R034 (2), (10),
// R036 (1)-(3), T6): each names its own regression row, which the
// registry holds (a fix lands with its restored-defect row). Met means
// the evidence exists, not permission to activate (§18.161 (5)).
const landed = evidence => {
  const items = statusKey(evidence, 'landed');
  if (!isObject(items)) return missing('landed');
  const rows = landedItems.map(([item]) => items[item]);
  const lines = [...landedItems.map((item, index) =>
    landedLine(evidence, item, rows[index])), ...sharedLines(rows)];
  const problems = lines.filter(([met]) => !met).map(([, line]) => line);
  return result(problems, [...lines.filter(([met]) => met)
    .map(([, line]) => line), ...(problems.length > 0 ? [] : [notLicense])]);
};

// 5. The scratch-build comparison with the validator minting: a
// committed file naming its build and its commit, whose src tree is
// HEAD's, and every moved row per comparison.
const comparison = evidence => {
  const path = statusKey(evidence, 'comparison');
  if (path === undefined) return missing('comparison');
  if (path === null) return result(['not run (no comparison recorded)'], []);
  const file = evidence.files[path] ?? null;
  if (file === null) return result([`${path} missing`], []);
  const problems = [
    ...(typeof file.build === 'string' ? [] : [`${path}: no build`]),
    ...staleness(evidence, path, file),
    ...comparisonKeys.filter(key => !Array.isArray(file[key]?.moved))
      .map(key => `${path}: no ${key} moved list`)];
  return result(problems, problems.length > 0 ? [] : [`run at `
    + `${file.build}: ${comparisonKeys.map(key =>
      `${key} ${file[key].moved.length} moved`).join(', ')} (${path})`,
  `src unchanged since ${file.commit}`]);
};

// One part's measurements, each within the status file's budget for
// it; budgets in the measurement file are not read (review I4).
const partProblems = (perf, path, file, part) =>
  perfMetrics.flatMap(metric => {
    const budget = perf.budget?.[part]?.[metric];
    const measured = file[part]?.[metric]?.measured;
    if (!Number.isFinite(budget))
      return [`gate status lacks the ${part} ${metric} budget`];
    if (measured === undefined || measured === null)
      return [`${path}: ${part} lacks a ${metric} measurement`];
    if (!Number.isFinite(measured))
      return [`${path}: ${part} ${metric} measurement is not a finite `
        + `number (${typeof measured} ${String(measured)})`];
    if (measured < 0)
      return [`${path}: ${part} ${metric} measurement ${measured} is `
        + 'negative'];
    return measured <= budget ? []
      : [`${path}: ${part} ${metric} ${measured} over ${budget}`];
  });

// 6. Performance qualification (BACKLOG R035): a budget ruled after
// §18.157 with its figures in the status, and a recorded measurement
// within them, read-back and validator apart, whose commit's src tree
// is HEAD's.
const performance = evidence => {
  const perf = statusKey(evidence, 'performance');
  if (!isObject(perf)) return missing('performance');
  const budget = ruling(evidence.dossier, perf.ruling, 'R035');
  const path = perf.measurement;
  const file = typeof path === 'string' ? evidence.files[path] ?? null
    : null;
  const problems = [...(budget.met ? [] : [`budget ${budget.line}`]),
    ...(isObject(perf.budget) ? [] : ['no budget figures recorded']),
    ...(file === null ? ['not measured (no measurement recorded)']
      : [...(typeof file.conditions === 'string' ? []
        : [`${path}: no conditions`]),
      ...staleness(evidence, path, file),
      ...perfParts.flatMap(part =>
        partProblems(perf, path, file, part))])];
  return result(problems, problems.length > 0 ? []
    : [`budget ${budget.line}; measured within it (${path})`,
      `src unchanged since ${file.commit}`]);
};

// 7. Statements §7's routing after activation (a ruling §7 cites), and
// U4's and U6's standing as the statements' §0e table gives it.
const routing = evidence => {
  const decided = ruled(evidence, 'routing', 'routing');
  const seven = statementsSeven(evidence.statements);
  const cite = statusKey(evidence, 'routing');
  const cited = decided.met && citesWhole(seven, cite);
  const held = ['U4', 'U6'].map(name =>
    [name, standing(evidence.statements, name)]);
  return result([
    ...(decided.met ? [] : decided.state),
    ...(decided.met && !cited ? [`statements §7 does not cite ${cite}`]
      : []),
    ...held.filter(([, found]) => found === null)
      .map(([name]) => `statements table has no ${name} row`)],
  [...(decided.met ? decided.state : []), ...held
    .filter(([, found]) => found !== null)
    .map(([name, found]) => `${name}: ${found}`)]);
};

// 2. Whole-program losses under `decide` (dossier §18.186), with the
// certification losses (§18.159) kept as supporting evidence: both are
// measured, and the criterion is met only when both are.
const replacementLosses = evidence => {
  const programs = programLosses(evidence);
  const certification = separatedLive(acceptance, evidence);
  return { met: programs.met && certification.met,
    state: [...programs.state,
      ...certification.state.map(line => `supporting: ${line}`)] };
};

export const criteria = [
  { id: 1, title: 'Task 13\'s pin approved; no unexpected refusal',
    measure: pinApproved },
  { id: 2, title: 'A1: whole-program losses under decide ruled',
    measure: replacementLosses },
  { id: 3, title: 'the author\'s C6 decision', measure: c6 },
  { id: 4, title: 'BACKLOG R034 (2), (10), R036 (1)-(3) and T6 landed',
    measure: landed },
  { id: 5, title: 'scratch-build comparison with the validator minting',
    measure: comparison },
  { id: 6, title: 'performance qualified, read-back and validator apart',
    measure: performance },
  { id: 7, title: 'routing after activation; U4 and U6 standing',
    measure: routing }
];

const measured = (criterion, evidence) => {
  try {
    return criterion.measure(evidence);
  } catch (error) {
    return result([`evidence unreadable: ${error.message}`], []);
  }
};

export const evaluate = evidence => criteria.map(criterion =>
  ({ id: criterion.id, title: criterion.title,
    ...measured(criterion, evidence) }));

export const unmet = results => results.filter(found => !found.met)
  .map(found => found.id);

export const reportText = results => [
  'A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md)',
  ...results.flatMap(found => [
    `${found.id} ${found.met ? 'met' : 'NOT MET'}: ${found.title}`,
    ...found.state.map(line => `    ${line}`)]),
  unmet(results).length === 0 ? 'criteria 1-7: met'
    : `criteria 1-7: not met (${unmet(results).join(', ')})`].join('\n');
