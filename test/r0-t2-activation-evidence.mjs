// Readers of committed evidence for the A2 activation gate
// (test/r0-t2-activation-gate.mjs; docs/plans/2026-11-03-a2-activation-
// gate.md): a dossier section by its citation, statements §7, a
// statements §0e table row's standing, a ruling the gate-status file
// cites, and a key of that file. Each returns null or an unmet result
// for evidence that is absent or of the wrong shape, never a met one.
export const statusFile = 'test/fixtures/r0/t2-activation-gate.json';
export const dossierFile =
  'docs/plans/2026-10-20-record-composition-dossier.md';
export const statementsFile = 'docs/plans/r0-amin-statements.md';

// A dossier citation `§18.157` as the text of its section, from its
// `### 18.157 ` heading to the next heading; null when the citation is
// not of that form or the section does not exist.
export const section = (dossier, cite) => {
  const number = /^§(\d+\.\d+)$/.exec(String(cite))?.[1];
  if (number === undefined || typeof dossier !== 'string') return null;
  const lines = dossier.split('\n');
  const start = lines.findIndex(line => line.startsWith(`### ${number} `));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^#{1,3} /.test(line));
  return [lines[start], ...(end < 0 ? rest : rest.slice(0, end))]
    .join('\n');
};

// Statements §7 ("## 7. " to the next level-2 heading), or null.
export const statementsSeven = statements => {
  if (typeof statements !== 'string') return null;
  const lines = statements.split('\n');
  const start = lines.findIndex(line => line.startsWith('## 7. '));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
};

// The standing column of the statements §0e table row whose first cell
// starts with `name` (`U4`, `U6`), or null.
export const standing = (statements, name) => {
  if (typeof statements !== 'string') return null;
  const row = statements.split('\n').find(line =>
    line.startsWith(`| ${name} `));
  const cell = row?.split('|')[3]?.trim();
  return cell === undefined || cell === '' ? null : cell;
};

// A ruling the gate-status file cites: recorded only if the dossier
// section exists and names `token`. The check reads that the section
// names the matter, not what it decides (the spec's blind spots).
export const ruling = (dossier, cite, token) => {
  if (cite === undefined || cite === null)
    return { met: false, line: 'ruling recorded: no' };
  const text = section(dossier, cite);
  if (text === null)
    return { met: false,
      line: `ruling recorded: no (${cite} is not a dossier section)` };
  if (!text.includes(token))
    return { met: false,
      line: `ruling recorded: no (${cite} does not mention ${token})` };
  return { met: true, line: `ruling recorded: yes, dossier ${cite}` };
};

// A criterion's result: met only with no problem; the problems are
// listed after the measured state.
export const result = (problems, state) =>
  ({ met: problems.length === 0, state: [...state, ...problems] });

// A gate-status key; undefined when the file or the key is absent.
export const statusKey = (evidence, key) => (evidence.status === null
  || typeof evidence.status !== 'object'
  || !Object.hasOwn(evidence.status, key) ? undefined
  : evidence.status[key]);

export const missing = key => result([`gate status lacks "${key}"`], []);
