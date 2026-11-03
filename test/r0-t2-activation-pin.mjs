// The A2 activation gate's criteria 1 and 2 (docs/plans/2026-11-03-a2-
// activation-gate.md), read from Task 13's honest pin in the working
// tree (test/fixtures/r0/t2-honest.json) against the named lists of
// test/r0-t2-honest-gate.mjs, §18.157's figures and the dossier
// sections that rule on them. They read the pin as it stands; the live
// comparison of the corpus with the pin is
// test/r0-t2-honest.serial.test.mjs's, not this gate's.
import { forcedTail, unjudged, unreadImages, unsupported }
  from './r0-t2-honest-gate.mjs';
import { citesWhole, result, ruling, section, statusKey }
  from './r0-t2-activation-evidence.mjs';

export const pinFile = 'test/fixtures/r0/t2-honest.json';
export const denominatorNames = ['corpus loader', 'effect pin'];

// §18.157's figures: candidates and the validated floor initialized
// there. A pin departing from them needs a later re-pin ruling.
export const approvedFigures = {
  'corpus loader': { candidates: 2823, floor: 2805 },
  'effect pin': { candidates: 2832, floor: 2813 }
};

// The pin's three gap lists: declarations not validated, each list's
// loss on replacement ruled apart (review I2), and the token its
// ruling must name.
export const gapLists = [
  { key: 'faults', label: 'read faults', token: 'read fault' },
  { key: 'refusals', label: 'RequirementUnjudged',
    token: 'RequirementUnjudged' },
  { key: 'forcedTail', label: 'ForcedTail', token: 'ForcedTail' }];

const ruledOn = (dossier, cite, token, problems) => {
  const text = section(dossier, cite);
  if (text === null || !text.includes(token))
    problems.push(`dossier ${cite} missing or not naming ${token}`);
};

const isList = value => Array.isArray(value);

// Both denominators, each with its three lists; an absent or
// misshapen one is a problem, never skipped.
const denominatorsOf = (pin, problems) => denominatorNames.flatMap(name => {
  const found = pin?.denominators?.[name];
  if (found === undefined || found === null
    || !gapLists.every(list => isList(found[list.key]))) {
    problems.push(`pin lacks the ${name} denominator or one of its lists`);
    return [];
  }
  return [[name, found]];
});

// The refusals in one denominator that no ruling names: a refusal not
// a named RequirementUnjudged, a ForcedTail not one of the four.
const refusalsUnnamed = (name, d) => [
  ...d.refusals.filter(entry => !unjudged.includes(entry.at)
    || !String(entry.refusal).startsWith('RequirementUnjudged '))
    .map(entry => `${name}: unexpected refusal ${entry.at}`),
  ...d.forcedTail.filter(entry => !forcedTail.includes(entry.at)
    || !String(entry.refusal).startsWith('NotCertifiable ForcedTail'))
    .map(entry => `${name}: ForcedTail not admitted ${entry.at}`)];

const sameSet = (left, right) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());

// A denominator departing from §18.157 (figures, or the four ForcedTail
// by identity), unless the status cites a later re-pin ruling naming
// its new figures as `<denominator>: <n> candidates, floor <m>`, the
// floor a whole number (review I3; round 2 minor 5).
const departure = (evidence, name, d) => {
  const approved = approvedFigures[name];
  const forced = d.forcedTail.map(entry => entry.at);
  if (d.candidates === approved.candidates && d.floor === approved.floor
    && sameSet(forced, forcedTail)) return [];
  const cite = statusKey(evidence, 'repin') ?? null;
  const phrase = `${name}: ${d.candidates} candidates, floor ${d.floor}`;
  const found = ruling(evidence.dossier, cite, phrase);
  const named = found.met && new RegExp(`${phrase}(?![0-9])`)
    .test(section(evidence.dossier, cite));
  return named ? [] : [`${name}: ${d.candidates} candidates, `
    + `floor ${d.floor}, ${forced.length} ForcedTail depart from §18.157; `
    + `re-pin ${found.line}`];
};

const explanationLines = pin => (isList(pin.explanations)
  ? [pin.explanations.length === 0 ? 'pin explanations: none'
    : `pin explanations: ${JSON.stringify(pin.explanations)}`]
  : null);

// Criterion 1: the pin cites §18.157, which admits the four; it holds
// §18.157's figures (or a later re-pin's); every refusal in it is a
// named RequirementUnjudged or one of the four ForcedTail.
export const pinApproved = evidence => {
  if (evidence.pin === null) return result([`${pinFile} missing`], []);
  const problems = [];
  if (!citesWhole(String(evidence.pin.ruling), '§18.157'))
    problems.push('pin does not cite §18.157');
  ruledOn(evidence.dossier, '§18.157', 'admitted', problems);
  const explained = explanationLines(evidence.pin);
  if (explained === null) problems.push('pin explanations not a list');
  const state = denominatorsOf(evidence.pin, problems).map(([name, d]) => {
    problems.push(...refusalsUnnamed(name, d),
      ...departure(evidence, name, d));
    return `${name}: ${d.candidates} candidates, floor ${d.floor}; `
      + `${d.refusals.length} named RequirementUnjudged, `
      + `${d.forcedTail.length} ForcedTail admitted by name (§18.157)`;
  });
  return result(problems, [...state, ...explained ?? []]);
};

// A read fault on a named list: an identified unsupported declaration
// with its kind, or one of the two UnreadImage declarations (§18.155
// (6), (7)).
const faultNamed = entry => (unsupported[entry.at] === undefined
  ? unreadImages.includes(entry.at)
    && String(entry.fault).startsWith('UnreadImage ')
  : entry.fault === `Declined ${unsupported[entry.at]}`);

// Each nonempty gap list's loss on replacement, ruled after §18.157.
const lossRulings = (evidence, found, problems) => {
  const losses = statusKey(evidence, 'losses');
  if (losses === null || typeof losses !== 'object') {
    problems.push('gate status lacks "losses"');
    return [];
  }
  return gapLists.filter(list => found.some(([, d]) =>
    d[list.key].length > 0)).flatMap(list => {
    const count = found.map(([name, d]) =>
      `${d[list.key].length} ${name}`).join(', ');
    const got = ruling(evidence.dossier, losses[list.key], list.token);
    const line = `loss on replacement, ${list.label} (${count}): `
      + got.line;
    if (got.met) return [line];
    problems.push(line);
    return [];
  });
};

// Criterion 2 (A1): each denominator's candidates are the floor
// (validated) plus its three lists, every listed entry is on a named
// list, and each list's loss on replacement has a ruling after §18.157.
export const acceptance = evidence => {
  if (evidence.pin === null) return result([`${pinFile} missing`], []);
  const problems = [];
  ruledOn(evidence.dossier, '§18.155', 'UnreadImage', problems);
  ruledOn(evidence.dossier, '§18.155', 'RequirementUnjudged', problems);
  ruledOn(evidence.dossier, '§18.157', 'ForcedTail', problems);
  const found = denominatorsOf(evidence.pin, problems);
  const state = found.map(([name, d]) => {
    for (const entry of d.faults.filter(entry => !faultNamed(entry)))
      problems.push(`${name}: read fault on no named list ${entry.at}`);
    problems.push(...refusalsUnnamed(name, d));
    const listed = d.faults.length + d.refusals.length
      + d.forcedTail.length;
    if (!Number.isInteger(d.floor) || d.floor < 0
      || d.floor + listed !== d.candidates)
      problems.push(`${name}: ${d.candidates} candidates, but floor `
        + `${d.floor} + ${listed} listed`);
    return `${name}: ${d.candidates} candidates = floor ${d.floor} `
      + `validated + ${d.faults.length} read faults + ${d.refusals.length} `
      + `RequirementUnjudged + ${d.forcedTail.length} ForcedTail`;
  });
  const ruled = lossRulings(evidence, found, problems);
  return result(problems, [...state, ...ruled]);
};
