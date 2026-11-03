// Readers of the evidence for the A2 activation gate
// (test/r0-t2-activation-gate.mjs; docs/plans/2026-11-03-a2-activation-
// gate.md), as files in the working tree: a dossier section by its
// citation, statements §7 and the §0e table, a ruling the gate-status
// file cites, and a key of that file. Each returns null or an unmet
// result for evidence that is absent or of the wrong shape, never a met
// one.
export const statusFile = 'test/fixtures/r0/t2-activation-gate.json';
export const dossierFile =
  'docs/plans/2026-10-20-record-composition-dossier.md';
export const statementsFile = 'docs/plans/r0-amin-statements.md';

// §18.157 recorded the gate's matters as undecided (C6, routing after
// activation, replacement losses, the performance budget), so only a
// later section can rule on them (review I1).
export const lastRuled = [18, 157];

// A citation `§18.157` as its number pair, or null.
const numberOf = cite => {
  const found = /^§(\d+)\.(\d+)$/.exec(String(cite));
  return found === null ? null : [Number(found[1]), Number(found[2])];
};

// The citation's section comes after §18.157, compared as integer
// pairs: §18.158 is later, §18.16 is not.
export const isLater = cite => {
  const number = numberOf(cite);
  return number !== null && (number[0] > lastRuled[0]
    || (number[0] === lastRuled[0] && number[1] > lastRuled[1]));
};

// A citation as the text of its section, from its `### 18.157 ` heading
// to the next heading; null when the citation is not of that form or
// the section does not exist.
export const section = (dossier, cite) => {
  const number = numberOf(cite);
  if (number === null || typeof dossier !== 'string') return null;
  const lines = dossier.split('\n');
  const start = lines.findIndex(line =>
    line.startsWith(`### ${number.join('.')} `));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => /^#{1,3} /.test(line));
  return [lines[start], ...(end < 0 ? rest : rest.slice(0, end))]
    .join('\n');
};

// `text` cites `cite` as a whole number: `§18.15` does not match in
// `§18.155`.
export const citesWhole = (text, cite) => typeof text === 'string'
  && numberOf(cite) !== null
  && new RegExp(`${cite.replace('.', '\\.')}(?![0-9])`).test(text);

// A level-2 statements section by its heading prefix (`## 7. `), to the
// next level-2 heading, or null.
const level2 = (statements, prefix) => {
  if (typeof statements !== 'string') return null;
  const lines = statements.split('\n');
  const start = lines.findIndex(line => line.startsWith(prefix));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(line => line.startsWith('## '));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n');
};

export const statementsSeven = statements => level2(statements, '## 7. ');

// The standing column of the §0e table row whose first cell starts
// with `name` (`U4`, `U6`), or null; rows outside §0e are not read.
export const standing = (statements, name) => {
  const table = level2(statements, '## 0e. ');
  const row = table?.split('\n').find(line => line.startsWith(`| ${name} `));
  const cell = row?.split('|')[3]?.trim();
  return cell === undefined || cell === '' ? null : cell;
};

// A ruling the gate-status file cites: recorded only if the section is
// after §18.157, exists and names `token`. The check reads that the
// section names the matter, not what it decides (the spec's blind
// spots).
export const ruling = (dossier, cite, token) => {
  if (cite === undefined || cite === null)
    return { met: false, line: 'ruling recorded: no' };
  if (!isLater(cite))
    return { met: false,
      line: `ruling recorded: no (${cite} is not after §18.157)` };
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
