// The A2 activation gate (docs/plans/2026-11-03-a2-activation-gate.md;
// the seven criteria of dossier §18.156's report, §18.157), as pure
// functions over evidence in the working tree: `evaluate(evidence)` gives seven
// results, each `{ id, title, met, state }`, `state` the measured lines.
// `evidence` holds the gate-status file (`status`), Task 13's pin
// (`pin`), the dossier's and the statements' text, the regression
// registry's row names (`rows`, a Set) and the files the status cites
// (`files`, path to parsed JSON or null). Nothing here decides: a
// criterion that needs the author is met only when the status cites a
// dossier section after §18.157 that exists and names the matter.
// Absent or misshapen evidence is unmet, never assumed met; a measure
// that throws is unmet with its message.
// scripts/r0-t2-activation-gate.mjs gathers the evidence and prints
// `reportText`; it runs neither corpus nor compiler.
import { citesWhole, missing, result, ruling, standing, statementsSeven,
  statusKey } from './r0-t2-activation-evidence.mjs';
import { acceptance, pinApproved } from './r0-t2-activation-pin.mjs';

// Each R034 item with the tag its regression row's name must carry, so
// an unrelated row, or one row for both, does not count (BACKLOG itself
// is not read).
export const landedItems = [['R034 (2)', 'r034-2'],
  ['R034 (10)', 'r034-10']];
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

const tagged = (row, tag) => new RegExp(`(^|-)${tag}(-|$)`).test(row);

// One item's row: recorded, tagged for the item, in the registry.
const landedLine = (evidence, [item, tag], row) => {
  if (typeof row !== 'string') return [false, `${item}: not landed `
    + '(no regression row recorded)'];
  if (!tagged(row, tag))
    return [false, `${item}: row ${row} does not carry the tag ${tag}`];
  return evidence.rows.has(row) ? [true, `${item}: landed, row ${row}`]
    : [false, `${item}: row ${row} not in the regression registry`];
};

// 4. BACKLOG R034 (2) and (10) landed: each names its own regression
// row, which the registry holds (a fix lands with its restored-defect
// row).
const landed = evidence => {
  const items = statusKey(evidence, 'landed');
  if (!isObject(items)) return missing('landed');
  const rows = landedItems.map(([item]) => items[item]);
  const lines = [...landedItems.map((item, index) =>
    landedLine(evidence, item, rows[index])),
  ...(typeof rows[0] === 'string' && rows[0] === rows[1]
    ? [[false, `one row for both items: ${rows[0]}`]] : [])];
  return result(lines.filter(([met]) => !met).map(([, line]) => line),
    lines.filter(([met]) => met).map(([, line]) => line));
};

// 5. The scratch-build comparison with the validator minting: a
// committed file naming its build, every moved row per comparison.
const comparison = evidence => {
  const path = statusKey(evidence, 'comparison');
  if (path === undefined) return missing('comparison');
  if (path === null) return result(['not run (no comparison recorded)'], []);
  const file = evidence.files[path] ?? null;
  if (file === null) return result([`${path} missing`], []);
  const problems = [
    ...(typeof file.build === 'string' ? [] : [`${path}: no build`]),
    ...comparisonKeys.filter(key => !Array.isArray(file[key]?.moved))
      .map(key => `${path}: no ${key} moved list`)];
  return result(problems, problems.length > 0 ? [] : [`run at `
    + `${file.build}: ${comparisonKeys.map(key =>
      `${key} ${file[key].moved.length} moved`).join(', ')} (${path})`]);
};

// One part's measurements, each within the status file's budget for
// it; budgets in the measurement file are not read (review I4).
const partProblems = (perf, path, file, part) =>
  perfMetrics.flatMap(metric => {
    const budget = perf.budget?.[part]?.[metric];
    const measured = file[part]?.[metric]?.measured;
    if (!Number.isFinite(budget))
      return [`gate status lacks the ${part} ${metric} budget`];
    if (!Number.isFinite(measured))
      return [`${path}: ${part} lacks a ${metric} measurement`];
    return measured <= budget ? []
      : [`${path}: ${part} ${metric} ${measured} over ${budget}`];
  });

// 6. Performance qualification (BACKLOG R035): a budget ruled after
// §18.157 with its figures in the status, and a recorded measurement
// within them, read-back and validator apart.
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
      ...perfParts.flatMap(part =>
        partProblems(perf, path, file, part))])];
  return result(problems, problems.length > 0 ? []
    : [`budget ${budget.line}; measured within it (${path})`]);
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

export const criteria = [
  { id: 1, title: 'Task 13\'s pin approved; no unexpected refusal',
    measure: pinApproved },
  { id: 2, title: 'A1: each gap list\'s loss on replacement ruled',
    measure: acceptance },
  { id: 3, title: 'the author\'s C6 decision', measure: c6 },
  { id: 4, title: 'BACKLOG R034 (2) and (10) landed', measure: landed },
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
  unmet(results).length === 0 ? 'gate: met'
    : `gate: not met (${unmet(results).join(', ')})`].join('\n');
