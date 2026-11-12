// Whole-program losses under `decide` (dossier §18.186; the activation
// gate's criterion 2). Replacement's rule is the census's
// (docs/plans/r0-census.md): if R0's verdict were live, one declaration
// `decide` does not solve stops its program. The programs assessed are
// the census union (test/fixtures/r0/census.json) and the programs of
// the gap lists (test/fixtures/r0/t2-gap-verdicts.json), together,
// deduplicated by program, with any other program `decide` would lose.
// Pure functions, shared by the serial test, the writer
// (scripts/r0-t2-replacement-losses-pin.mjs) and the gate.
//
// The file's `programs`, one entry per origin, sorted: `origin`,
// `named` (which of `census` and the gap lists name it), `today`
// (`compiles` or `refused`, the whole program's `compile`), `blockers`
// (each declaration `decide` leaves unsolved: `name`, `decide`,
// `reason`) and `class`, which `classOf` derives:
// - `existingRefusal`: refused today, so replacement loses nothing;
// - `notLost`: compiles today and `decide` solves every declaration;
// - `knownDefect`: compiles today, and every blocker is a known defect
//   the gate status registers with a ruling (`knownDefects`);
// - `lost`: compiles today and some other declaration is unsolved.
import { isLater, missing, result, ruling, section, statusKey }
  from './r0-t2-activation-evidence.mjs';

export const lossesFile = 'test/fixtures/r0/t2-replacement-losses.json';
export const censusFile = 'test/fixtures/r0/census.json';
export const lossesRuling = 'dossier §18.186';
export const classes = ['lost', 'knownDefect', 'existingRefusal',
  'notLost'];
const liveToken = 'live replacement';

const isObject = value => value !== null && typeof value === 'object';
const originOf = at => at.slice(0, at.lastIndexOf('#'));

// Which sources name each origin: `census`, then each gap list.
export const namesOf = (census, verdicts) => {
  const names = new Map();
  const add = (origin, name) => {
    const found = names.get(origin) ?? [];
    if (!found.includes(name)) names.set(origin, [...found, name]);
  };
  for (const origin of census?.union?.origins ?? []) add(origin, 'census');
  for (const entry of Object.values(verdicts?.denominators ?? {}).flat())
    add(entry.origin ?? originOf(entry.at), entry.list);
  return names;
};

// A program's class from its facts and the registered known defects
// (declaration `origin#name` to `{ id, ruling }`).
export const classOf = (program, known) => {
  if (program.today !== 'compiles') return 'existingRefusal';
  if (program.blockers.length === 0) return 'notLost';
  return program.blockers.every(blocker =>
    Object.hasOwn(known, `${program.origin}#${blocker.name}`))
    ? 'knownDefect' : 'lost';
};

// The file from observed programs (`origin`, `today`, `blockers`): every
// named program, and every other program `decide` would lose.
export const lossesFileOf = (observed, census, verdicts, known) => {
  const names = namesOf(census, verdicts);
  const kept = observed.filter(program => names.has(program.origin)
    || (program.today === 'compiles' && program.blockers.length > 0));
  return { ruling: lossesRuling, census: censusFile,
    programs: kept.map(program => ({ origin: program.origin,
      named: names.get(program.origin) ?? [], today: program.today,
      blockers: program.blockers, class: classOf(program, known) }))
      .sort((a, b) => (a.origin < b.origin ? -1 : 1)) };
};

const knownProblems = (evidence, known, byOrigin) =>
  Object.entries(known).flatMap(([at, defect]) => {
    const found = ruling(evidence.dossier, defect?.ruling, defect?.id ?? '');
    const program = byOrigin.get(originOf(at));
    return [
      ...(typeof defect?.id === 'string' && found.met ? []
        : [`known defect ${at}: ${found.line}`]),
      ...(program?.blockers.some(blocker =>
        `${program.origin}#${blocker.name}` === at) ? []
        : [`known defect ${at} blocks no recorded program`])];
  });

// Each accepted loss: a ruling after §18.157 naming the program and
// live replacement.
const acceptedProblems = (evidence, accepted) =>
  Object.entries(accepted).flatMap(([origin, cite]) => {
    const text = isLater(cite) ? section(evidence.dossier, cite) : null;
    return text !== null && text.includes(origin)
      && text.toLowerCase().includes(liveToken) ? []
      : [`accepted loss ${origin}: ${cite} is no live-replacement ruling`
        + ' naming it'];
  });

// The file against the census, the gap lists and the registry: none
// omitted, none repeated, each named as its sources name it and in the
// class its facts give.
export const fileProblems = (file, census, verdicts, known) => {
  if (!isObject(file) || !Array.isArray(file.programs))
    return [`${lossesFile} missing or unreadable`];
  if (!Array.isArray(census?.union?.origins))
    return [`${censusFile} missing or unreadable`];
  const names = namesOf(census, verdicts);
  const seen = new Map();
  const problems = [];
  for (const program of file.programs) {
    if (seen.has(program.origin))
      problems.push(`program repeated: ${program.origin}`);
    seen.set(program.origin, program);
    const named = names.get(program.origin) ?? [];
    if (JSON.stringify(program.named) !== JSON.stringify(named))
      problems.push(`${program.origin}: named ${JSON.stringify(
        program.named)}, but its sources name ${JSON.stringify(named)}`);
    if (!Array.isArray(program.blockers))
      problems.push(`${program.origin}: no blockers recorded`);
    else if (program.class !== classOf(program, known))
      problems.push(`${program.origin}: class ${program.class}, but its`
        + ` facts give ${classOf(program, known)}`);
  }
  for (const [origin, named] of names)
    if (!seen.has(origin))
      problems.push(`omitted: ${origin} (${named.join(', ')})`);
  return problems;
};

const countOf = (programs, name) =>
  programs.filter(program => program.class === name).length;

// Criterion 2's whole-program measure. Met only when the file is
// consistent and every lost program is accepted for live replacement.
export const programLosses = evidence => {
  const known = statusKey(evidence, 'knownDefects');
  const accepted = statusKey(evidence, 'acceptedLosses');
  if (!isObject(known)) return missing('knownDefects');
  if (!isObject(accepted)) return missing('acceptedLosses');
  const file = evidence.losses;
  const problems = fileProblems(file, evidence.census, evidence.verdicts,
    known);
  if (problems.length > 0 && !Array.isArray(file?.programs))
    return result(problems, []);
  const programs = file.programs;
  const byOrigin = new Map(programs.map(program =>
    [program.origin, program]));
  problems.push(...knownProblems(evidence, known, byOrigin),
    ...acceptedProblems(evidence, accepted));
  const lost = programs.filter(program => program.class === 'lost');
  const unaccepted = lost.filter(program =>
    !Object.hasOwn(accepted, program.origin));
  if (unaccepted.length > 0)
    problems.push(`${unaccepted.length} programs lost under decide, not `
      + `accepted for live replacement (${lossesFile})`);
  const defects = programs.filter(program =>
    program.class === 'knownDefect').map(program => program.origin);
  return result(problems, [
    `whole programs under decide (${lossesFile}): assessed `
      + `${programs.length}; lost ${countOf(programs, 'lost')} `
      + `(accepted ${lost.length - unaccepted.length}); known defects `
      + `correctly refused ${defects.length}; existing refusals `
      + `${countOf(programs, 'existingRefusal')}; named but not lost `
      + `${countOf(programs, 'notLost')}`,
    ...defects.map(origin => `known defect correctly refused: ${origin}`),
    ...lost.filter(program => program.named.some(name => name !== 'census'))
      .map(program => `lost, on a gap list: ${program.origin}`)]);
};
