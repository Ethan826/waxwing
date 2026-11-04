// Criterion 2's losses (docs/plans/2026-11-03-a2-activation-gate.md;
// dossier §18.159 criterion 2): a gap entry whose recorded verdict is
// that today's `certify` already refuses it is an existing refusal and
// needs no loss ruling; an entry today accepts is a loss, and its
// list needs a ruling after §18.157. The verdict file
// (test/fixtures/r0/t2-gap-verdicts.json) is the evidence: absent, or
// not backing the pin entry for entry (`verdictProblems`), no list is
// read from it and criterion 2 is unmet. Listing a loss approves
// nothing; whether a ruling approves it is the author's, and this
// check only reads that one is cited (the spec's blind spots).
import { ruling, statusKey } from './r0-t2-activation-evidence.mjs';
import { listed, verdictProblems, verdictsFile }
  from './r0-t2-gap-verdicts.mjs';

// One list's line part per denominator: its losses and existing
// refusals.
const countOf = (name, entries) => {
  const losses = entries.filter(entry => entry.loss === 'yes').length;
  return `${name}: losses ${losses}, existing refusals `
    + `${entries.length - losses}`;
};

const lossNames = entries => [...new Set(entries
  .filter(entry => entry.loss === 'yes').map(entry => entry.at))].sort();

// One list: no ruling needed with no loss; else its ruling's line.
const listLine = (evidence, file, found, list, problems) => {
  const entries = found.map(([name]) => listed(file, name, list.key));
  const counts = found.map(([name], index) =>
    countOf(name, entries[index])).join('; ');
  const losses = lossNames(entries.flat());
  const head = `loss on replacement, ${list.label} (${counts})`;
  if (losses.length === 0)
    return [`${head}: existing refusals only, no loss ruling needed `
      + `(${verdictsFile})`];
  const cite = statusKey(evidence, 'losses');
  const got = cite === null || typeof cite !== 'object'
    ? { met: false, line: 'gate status lacks "losses"' }
    : ruling(evidence.dossier, cite[list.key], list.token);
  const line = `${head}: ${got.line}; losses: ${losses.join(', ')}`;
  if (got.met) return [line];
  problems.push(line);
  return [];
};

// Each nonempty gap list's losses, from the verdict file, each list
// with losses ruled after §18.157.
export const lossRulings = (evidence, found, lists, problems) => {
  const file = evidence.verdicts ?? null;
  const backing = verdictProblems(file, evidence.pin);
  if (backing.length > 0) {
    problems.push(...backing.map(line => `loss evidence: ${line}`));
    return [];
  }
  return lists.filter(list => found.some(([, d]) =>
    d[list.key].length > 0)).flatMap(list =>
    listLine(evidence, file, found, list, problems));
};
