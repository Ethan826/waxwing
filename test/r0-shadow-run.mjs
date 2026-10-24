// Task 4.5: the shadow run's window table over the pinned corpus, RT8's
// inline probes and the defect probes (test/r0-shadow-known.mjs). It
// reads RT8's run (`declarationsOf`, test/r0-rt8-run.mjs: today's
// checker and `shadowDecisions` once per program) rather than deciding
// again. The one `Checking` is `shadowChecking` (Decide/Shadow.purs),
// so Task 5.2's `shadows: [cx]` lands there and this table must not
// move (AT17). Rows carry no `source` (test/r0-corpus.mjs would take
// window.json into the corpus); each names its origin and the SHA-256
// of its program's source.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { declarationsOf, rt8Sources } from './r0-rt8-run.mjs';
import { erasedSources } from './r0-census-erased.mjs';
import { requirementsOf } from './r0-census-classify.mjs';
import { defectProbes, defects, falseContradictions, falseEvidence,
  knownValid } from './r0-shadow-known.mjs';
import { windowClassOf, windowClasses } from './r0-shadow-classes.mjs';
import { summaryOf } from './r0-shadow-summary.mjs';

export const windowFile = 'test/fixtures/r0/window.json';
export const pinCommand = 'node scripts/r0-shadow-pin.mjs';

const { compile } = await load('Program.Compile');
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { wire } = await load('Format.Diagnostic');
const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { generate, staticRules } = await load('Features.Check.Generate');
const { problem } = await load('Domain.Elaborating');
const Problem = await load('Domain.Problem');

const named = value => value.constructor.name;
const digest = source => createHash('sha256').update(source).digest('hex');

const right = (result, what) => {
  if (named(result) !== 'Right') throw new Error(`${what} refused`);
  return result.value0;
};

const todayOf = today => (named(today) === 'Right' ? null
  : { code: wire(today.value0).code, text: wire(today.value0).message });

// `g0Guard`'s reasons, read only where RT8 says it declined.
const guardOf = (row, inputs) => (!row.class.includes('declined by g0Guard')
  ? [] : requirementsOf(problem(right(generate(inputs.tables)(
    inputs.signatures)(row.decl), `generation of ${row.at}`))).reasons);

const factsOf = (row, inputs) => {
  const described = describe(row.decision);
  if (described.fault !== undefined) throw new Error(`${row.at} faulted`);
  return { at: row.at, rt8: row.class, today: todayOf(row.today),
    r0: { verdict: described.verdict, attempt: described.attempts[0] },
    staticRefusals: right(staticRules(inputs.tables)(inputs.signatures)(
      row.decl), `static rules of ${row.at}`).map(found =>
      `${named(found)} ${named(found.value0)}`),
    erased: erasedSources(row.program, row.decl),
    guard: guardOf(row, inputs) };
};

const kindsOf = verdict => (verdict.match(/Outside \w+/g) ?? [])
  .map(kind => kind.slice('Outside '.length)).sort();

const evidenceOf = at => (at in falseContradictions
  ? { evidence: falseEvidence } : at in knownValid
    ? { evidence: knownValid[at].evidence } : {});

// One window row, or `null` where today's class and R0's agree. The
// class's focus, target and dependency are in the summary's class table.
const windowRow = (facts, hash, compiles) => {
  const name = windowClassOf(facts);
  if (name === null) return { agreement: facts, row: null };
  const kinds = kindsOf(facts.r0.verdict);
  const blockers = [...kinds, ...(facts.erased.length > 0 ? ['ErasedRow']
    : [])];
  return { agreement: null, row: { at: facts.at, hash,
    today: facts.today ?? 'compiles', r0: facts.r0, rt8: facts.rt8,
    class: name, section: windowClasses[name].section, blockers,
    programCompiles: compiles, ...evidenceOf(facts.at),
    ...(name === 'defect' ? { defect: defects[facts.at] } : {}) } };
};

const secondSpread = source => {
  const parsed = parse(source);
  if (named(parsed) !== 'Right') return false;
  const found = resolve(parsed.value0);
  return named(found) === 'Left'
    && found.value0.problem instanceof Problem.SecondSpread;
};

// Each program: its declarations' facts and rows, and whether it
// compiles today (whole-program `compile`, as the census reads it).
// `rows` is RT8's run of the program, when the caller already has it.
const programOf = (entry, rows = declarationsOf(entry)) => {
  const compiles = named(compile(entry.source)) === 'Right';
  if (rows.length === 0) return { origin: entry.origin, compiles,
    secondSpread: secondSpread(entry.source), results: [] };
  const inputs = generationInputs(rows[0].program);
  const hash = digest(entry.source);
  return { origin: entry.origin, compiles, secondSpread: false,
    results: rows.map(row => windowRow(factsOf(row, inputs), hash,
      compiles)) };
};

export const windowPrograms = async () => (await shadowRun()).programs;

// BACKLOG R025: one run for RT8 and the window. RT8's rows (its
// sources: the corpus and R022's probes) and the window's programs
// (those sources, then the defect probes), each program decided once.
export const shadowRun = async () => {
  const decided = (await rt8Sources()).map(entry =>
    ({ entry, rows: declarationsOf(entry) }));
  return { rt8Rows: decided.flatMap(found => found.rows),
    programs: [...decided.map(found => programOf(found.entry, found.rows)),
      ...defectProbes.map(entry => programOf(entry))] };
};

export const windowTable = programs => ({
  summary: summaryOf(programs),
  rows: programs.flatMap(program => program.results)
    .filter(result => result.row !== null).map(result => result.row)
});

// window.json writes one row per line, so a moved class is a one-line
// diff.
export const windowText = table => `{\n "summary": ${JSON.stringify(
  table.summary, null, 1).replace(/\n/g, '\n ')},\n "rows": [\n${table.rows
  .map(row => `  ${JSON.stringify(row)}`).join(',\n')}\n ]\n}\n`;

export const pinnedWindow = () =>
  JSON.parse(readFileSync(join(repoRoot, windowFile), 'utf8'));
