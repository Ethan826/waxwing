// Tranche 2 Task 13 (design §I Task 8; dossier §18.155 (7), (8)): every
// online candidate's honest package through I3 and the trusted A2
// validator (`validate`, non-minting), beside today's G0-only `certify`.
// `honestReport(load)(sources)` gives one row per candidate: `at`
// (origin#declaration), `read` ('package' or the read fault), `i3`
// ('ok', a `Malformed` reason, or null without a package), `validate`
// ('validated', the refusal, or null), `certify` ('accepted' or the
// refusal), `sameG0` (validate's refusal equals certify's, by the
// refusal's own Eq) and `stages` (test/r0-t2-honest-stages.mjs). It
// takes a loader, so a regression probe reads the compiler under test
// only. Corpus-observed when run over the corpus; nothing here is a
// soundness claim.
import { budget, onlineFrom } from './r0-online-support.mjs';
import { stagesCheck } from './r0-t2-honest-stages.mjs';

const named = value => value.constructor.name;

// A PureScript value as JSON, each data constructor named (a nullary
// one as its bare name), so a path's root reads `InBody`, not `{}`.
const tagged = (key, value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || named(value) === 'Object') return value;
  const fields = Object.keys(value);
  return fields.length === 0 ? named(value)
    : { [named(value)]: fields.map(field => value[field]) };
};

const isData = value => value !== null && typeof value === 'object'
  && !Array.isArray(value) && named(value) !== 'Object';

// A data value as `Name arg …`, an argument that is itself data with
// arguments in parentheses, any other argument as tagged JSON.
const shown = (value, nested = false) => {
  if (!isData(value)) return JSON.stringify(value, tagged);
  const fields = Object.keys(value);
  if (fields.length === 0) return named(value);
  const text = [named(value),
    ...fields.map(field => shown(value[field], true))].join(' ');
  return nested ? `(${text})` : text;
};

// A refusal or fault as text, e.g. `Declined UnframedInstall`,
// `Declined (OperationWithRow 1 0)`, `NotCertifiable ForcedTail {…}`.
export const refusalText = refusal => shown(refusal);

export const honestReport = async load => {
  const online = await onlineFrom(load);
  const { parse } = await load('Format.Parse');
  const { resolve } = await load('Features.Resolve');
  const Generate = await load('Features.Check.Generate');
  const Inputs = await load('Features.Check.Generate.Inputs');
  const Elaborating = await load('Domain.Elaborating');
  const Online = await load('Features.Check.Strategy.Online');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const RB = await load('Features.Check.Strategy.ReadBack');
  const Package = await load('Features.Check.Strategy.ReadBack.Package');
  const Malformed = await load('Features.Check.Strategy.Effects.Malformed');
  const Substitution = await load('Features.Check.Strategy.Substitution');
  const Search = await load('Domain.Verdict.Search');
  const stages = await stagesCheck(load);
  const sameRefusal = (left, right) =>
    Search.eqCheckRefusal.eq(left)(right);

  const programOf = source => {
    const parsed = parse(source);
    if (named(parsed) !== 'Right') return null;
    const found = resolve(parsed.value0);
    return named(found) === 'Right' ? found.value0 : null;
  };

  const verdicts = (problem, live, found) => {
    const today = Substitution.certify(problem)(found.unsettled);
    const readBack = RB.readBack(problem)(live.function).value0;
    const read = Package.readEffects(problem)(readBack)(live.function)(
      live.state.subst.marks)(live.trace);
    const row = { read: 'package', i3: null, validate: null,
      certify: named(today) === 'Right' ? 'accepted'
        : refusalText(today.value0),
      sameG0: false, stages: [] };
    if (named(read) === 'Left')
      return { ...row, read: refusalText(read.value0) };
    const pkg = read.value0;
    const bad = Malformed.malformed(problem)(pkg);
    const checked = Substitution.validate(problem)(pkg);
    const validated = named(checked) === 'Right';
    return { ...row,
      i3: named(bad) === 'Just' ? refusalText(bad.value0) : 'ok',
      validate: validated ? 'validated' : refusalText(checked.value0),
      sameG0: !validated && named(today) === 'Left'
        && sameRefusal(checked.value0, today.value0),
      stages: stages(problem, live, pkg,
        validated ? checked.value0.completed : null) };
  };

  return sources => {
    const rows = [];
    for (const { origin, source } of sources) {
      const program = programOf(source);
      if (program === null) continue;
      const inputs = Inputs.generationInputs(program);
      for (const decl of program.functions) {
        const generated = Generate.generate(inputs.tables)(
          inputs.signatures)(decl);
        if (named(generated) !== 'Right') continue;
        const problem = Elaborating.problem(generated.value0);
        const found = Online.onlineSearch(online.contextOf(program))(
          budget)(problem);
        if (named(found) !== 'Candidate') continue;
        const live = Function.recheck(functional(program.ctors))(program)(
          decl).value0;
        rows.push({ at: `${origin}#${decl.name}`, origin,
          ...verdicts(problem, live, found.value0) });
      }
    }
    return rows;
  };
};

// Counts per outcome over some rows: the read-back's, I3's, the
// validator's and certify's, each keyed by its text.
export const outcomeCounts = rows => {
  const tally = key => {
    const out = {};
    for (const row of rows) {
      const value = String(row[key]);
      out[value] = (out[value] ?? 0) + 1;
    }
    return Object.fromEntries(Object.entries(out).sort());
  };
  return { candidates: rows.length, read: tally('read'), i3: tally('i3'),
    validate: tally('validate'), certify: tally('certify'),
    validateKinds: kinds(rows, 'validate'),
    certifyKinds: kinds(rows, 'certify') };
};

// The same, keyed by the verdict's first two words only.
const kinds = (rows, key) => {
  const out = {};
  for (const row of rows) {
    const value = String(row[key]).split(' ').slice(0, 2).join(' ');
    out[value] = (out[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort());
};

// Both denominators (design §A): the effect pin's sources (its 2,832
// candidates) are read once, and the corpus loader's (2,823) are the
// rows whose origin `loadCorpus` holds. Each with its origins, which
// ruling (7)'s admission reads to know which approved entries it holds.
export const pinFile = 'test/fixtures/r0/t2-honest.json';

export const denominators = async load => {
  const { sourcesOf } = await import('./r0-effects-pin-run.mjs');
  const { loadCorpus } = await import('./r0-corpus.mjs');
  const sources = await sourcesOf();
  const corpus = new Set((await loadCorpus()).map(entry => entry.origin));
  const rows = (await honestReport(load))(sources);
  return {
    'corpus loader': { origins: corpus,
      rows: rows.filter(row => corpus.has(row.origin)) },
    'effect pin': { origins: new Set(sources.map(entry => entry.origin)),
      rows }
  };
};
