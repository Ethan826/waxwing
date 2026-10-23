// RT8 over the pinned corpus (Task 4.3; test/r0-corpus.mjs), shared by
// the serial test and the pin script. For every declaration of every
// program that resolves: today's checker result (Features.Check.Outcomes),
// the shadow run's decision (`shadowDecisions`), its class
// (test/r0-rt8-account.mjs) and, where today accepts, the read-back's
// position findings (criterion 2: σ(types(p)) is the checked node's
// type at every body path) and the holes its candidate bound.
// `rt8Table` is what test/fixtures/r0/rt8.json pins: the count of
// declarations per class, each defect and each bound hole.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCorpus, repoRoot } from './r0-corpus.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { decodeVar } from './r0-canonical-decode.mjs';
import { load } from './r0-generate-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';
import { accountFor, isDefect, witnessFor } from './r0-rt8-account.mjs';
import { r022Probes } from './r0-r022-probes.mjs';

export const rt8File = 'test/fixtures/r0/rt8.json';
export const pinCommand = 'node scripts/r0-rt8-pin.mjs';

const online = await onlineFrom(load);
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { checkProgram } = await load('Features.Check.Outcomes');

const programOf = source => {
  const parsed = parse(source);
  if (parsed.constructor.name !== 'Right') return null;
  const named = resolve(parsed.value0);
  return named.constructor.name === 'Right' ? named.value0 : null;
};

// Where today accepts: the read-back's candidate, its position findings
// and the holes it bound (ReadBack step 4, provisional).
const candidateFacts = (program, decl, today) => {
  const none = { positions: [], holes: [] };
  if (today.constructor.name !== 'Right') return none;
  const problem = online.problemOf(program, decl.name);
  const found = online.search(program, problem);
  if (found.constructor.name !== 'Candidate') return none;
  return { positions: online.typeFindings(problem, found.value0),
    holes: found.value0.holes };
};

const declarationsOf = ({ origin, source }) => {
  const program = programOf(source);
  if (program === null) return [];
  const today = checkProgram(program).outcomes;
  const decided = online.decisions(program);
  return program.functions.map((decl, index) => {
    const facts = candidateFacts(program, decl, today[index].today);
    return { at: `${origin}#${decl.name}`, ...facts,
      class: accountFor(today[index].today, decided[index], facts.holes),
      witness: witnessFor(decided[index]) };
  });
};

// The pinned corpus, then inline probes kept out of it (R022), so the
// corpus manifest and the first-diagnostic snapshot stay as they are.
export const rt8Rows = async () => [...await loadCorpus(), ...r022Probes]
  .flatMap(declarationsOf);

const variableText = variable => variable === null ? ''
  : stableStringify(decodeVar(variable));

const tally = names => {
  const counts = {};
  for (const name of names) counts[name] = (counts[name] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort());
};

export const rt8Table = rows => ({
    declarations: rows.length,
    classes: tally(rows.map(row => row.class)),
    defects: rows.filter(row => isDefect(row.class))
      .map(row => `${row.at}: ${row.class}`),
    positions: rows.filter(row => row.positions.length > 0)
      .map(row => `${row.at}: ${row.positions[0]}`),
    // Every declaration whose accepted candidate bound a hole, whatever
    // its class, so Task 4.5's window can move them when the author rules.
    boundHoles: rows.filter(row => row.holes.length > 0)
      .map(row => `${row.at}: ${row.class}`),
    // Task 4.4: every accepted candidate's compilation (Cov and the hole
    // contract), and each one without a witness.
    witnesses: tally(rows.filter(row => row.witness !== null)
      .map(row => row.witness.class)),
    noWitness: rows.filter(row => row.witness !== null
      && row.witness.class !== 'Witnessed').map(row => `${row.at}: `
      + `${row.witness.class} ${variableText(row.witness.variable)}`)
});

export const pinnedRt8 = () =>
  JSON.parse(readFileSync(join(repoRoot, rt8File), 'utf8'));
