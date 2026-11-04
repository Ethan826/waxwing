// The gap-verdict file (dossier §18.159 criterion 2): for every
// declaration on the honest pin's gap lists (test/fixtures/r0/
// t2-honest.json: read faults, RequirementUnjudged, ForcedTail), on
// each denominator, today's verdicts as test/r0-t2-gap-verdicts-run.mjs
// observes them, and whether replacing the minter loses it. Pure
// functions, shared by the serial test, the writer
// (scripts/r0-t2-gap-verdicts-pin.mjs) and the activation gate's
// criterion 2 (test/r0-t2-activation-verdicts.mjs).
//
// An entry: `at`, `origin`, `list` (the pin's list key), `pinned` (the
// pin's fault or refusal, so a stale file shows), `decide` (the shadow
// `decide`'s verdict class), `reason` (its verdict as described),
// `checker` (today's whole checker: `compiles` or its diagnostic),
// `certify` (the substitution-only `certify`, minting under F14:
// `accepted` or its refusal), `shadow` (the shadow differential's
// window class, or the agreement a row-less declaration stands for)
// and `loss`.
export const verdictsFile = 'test/fixtures/r0/t2-gap-verdicts.json';
export const honestPinFile = 'test/fixtures/r0/t2-honest.json';
export const gapKeys = ['faults', 'refusals', 'forcedTail'];
export const minter = 'Features.Check.Strategy.Substitution.certify, '
  + 'substitution-only, minting under F14';
const textFields = ['origin', 'decide', 'reason', 'checker', 'certify',
  'shadow'];

// Loss on replacement. Every listed declaration is one the new path
// does not validate (the pin lists exactly those), so it is a loss
// when today's minter accepts it, and an existing refusal when
// `certify` already refuses it (§18.159 criterion 2). Today's checker
// is recorded beside it, not read here.
export const lossOf = verdict => (verdict.certify === 'accepted'
  ? 'yes' : 'no');

const pinnedOf = entry => entry.fault ?? entry.refusal;

// The constructors of `CheckRefusal` (src/Domain/Verdict/Search.purs),
// the only refusals `certify` can give, as the honest report renders
// them (`Name …`; `NotGeneric` bare). Copied by hand: a constructor
// added there and observed here makes the file unmet until it is
// listed (fails closed).
const refusalKinds = ['RequirementOpen', 'Unsatisfied', 'Undefined',
  'NotEntailed', 'RequirementFails', 'RequirementUnjudged', 'NotGeneric',
  'RecordDefect', 'Malformed', 'NotCertifiable', 'ObligationFailed'];

// A `certify` verdict the honest report can produce: `accepted`, or
// a refusal by its whole constructor name.
export const isCertifyVerdict = text => text === 'accepted'
  || refusalKinds.some(kind => text === kind
    || String(text).startsWith(`${kind} `));

// The `certify` verdict the pin fixes for an entry, or null where it
// fixes none: a RequirementUnjudged entry was pinned with certify's
// own refusal, and a ForcedTail entry only where certify accepts
// (test/r0-t2-honest-gate.mjs `admission`). A read fault's is not
// pinned; only the serial test checks it against the checker.
const pinnedCertify = entry => ({ refusals: entry.pinned,
  forcedTail: 'accepted' })[entry.list] ?? null;

// The pin's gap entries per denominator, in the pin's order.
export const gapEntriesOf = pin => Object.fromEntries(
  Object.entries(pin.denominators).map(([name, d]) => [name,
    gapKeys.flatMap(list => d[list].map(entry =>
      ({ at: entry.at, list, pinned: pinnedOf(entry) })))]));

const originOf = at => at.slice(0, at.lastIndexOf('#'));

// The verdict file for `pin`, from `observed` (declaration to its
// verdicts); a listed declaration with no verdict throws.
export const verdictFileOf = (pin, observed) => ({
  ruling: 'dossier §18.159 criterion 2', pin: honestPinFile, minter,
  denominators: Object.fromEntries(Object.entries(gapEntriesOf(pin))
    .map(([name, entries]) => [name, entries.map(entry => {
      const verdict = observed.get(entry.at);
      if (verdict === undefined)
        throw new Error(`no verdict for ${entry.at}`);
      return { at: entry.at, origin: originOf(entry.at), list: entry.list,
        pinned: entry.pinned, ...verdict, loss: lossOf(verdict) };
    })]))
});

const keyOf = entry => `${entry?.list} ${entry?.at} ${entry?.pinned}`;

const apart = (name, pinned, recorded) => [
  ...pinned.filter(key => !recorded.includes(key))
    .map(key => `${name}: verdict file lacks ${key}`),
  ...recorded.filter(key => !pinned.includes(key))
    .map(key => `${name}: verdict file has ${key}, the pin does not`),
  ...recorded.filter((key, index) => recorded.indexOf(key) !== index)
    .map(key => `${name}: verdict file repeats ${key}`)];

// The pin's own `certify` verdict for a recorded entry, read from the
// pin (not the entry's `pinned`), or null.
const pinCertifyOf = (entries, entry) => {
  const found = entries.find(pinned => pinned.at === entry?.at
    && pinned.list === entry?.list);
  return found === undefined ? null : pinnedCertify(found);
};

// One recorded entry's own problems: a field not text, a `certify`
// verdict `certify` cannot give or other than the pin fixes, or a loss
// that is not the one its `certify` verdict gives.
const entryProblems = (name, entries, entry) => {
  const fixed = pinCertifyOf(entries, entry);
  return [
    ...textFields.filter(field => typeof entry?.[field] !== 'string')
      .map(field => `${name}: ${entry?.at} has no ${field} verdict`),
    ...(isCertifyVerdict(entry?.certify) ? []
      : [`${name}: ${entry?.at} certify ${entry?.certify} is no `
        + 'verdict certify gives']),
    ...(fixed === null || entry?.certify === fixed ? []
      : [`${name}: ${entry?.at} certify ${entry?.certify}, but the pin `
        + `fixes ${fixed}`]),
    ...(entry?.loss === lossOf(entry ?? {}) ? []
      : [`${name}: ${entry?.at} loss ${entry?.loss}, but certify `
        + `${entry?.certify}`])];
};

// Every way `file` fails to back `pin`'s gap lists; [] holds. Absent
// or misshapen, it backs nothing.
export const verdictProblems = (file, pin) => {
  if (file === null || typeof file !== 'object')
    return [`${verdictsFile} missing or unreadable`];
  const pinned = gapEntriesOf(pin);
  const problems = [...(file.pin === honestPinFile ? []
    : [`${verdictsFile} is not of ${honestPinFile}`]),
  ...Object.keys(file.denominators ?? {}).filter(name =>
    !Object.hasOwn(pinned, name))
    .map(name => `${verdictsFile} has ${name}, the pin does not`)];
  for (const [name, entries] of Object.entries(pinned)) {
    const recorded = file.denominators?.[name];
    if (!Array.isArray(recorded)) {
      problems.push(`${verdictsFile} lacks the ${name} denominator`);
      continue;
    }
    problems.push(...apart(name, entries.map(keyOf),
      recorded.map(keyOf)),
    ...recorded.flatMap(entry => entryProblems(name, entries, entry)));
  }
  return problems;
};

// The recorded entries of one denominator's list.
export const listed = (file, name, list) =>
  file.denominators[name].filter(entry => entry.list === list);
