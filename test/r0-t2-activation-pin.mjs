// The A2 activation gate's criteria 1 and 2 (docs/plans/2026-11-03-a2-
// activation-gate.md), read from Task 13's committed honest pin
// (test/fixtures/r0/t2-honest.json) against the named lists of
// test/r0-t2-honest-gate.mjs and the dossier sections that rule on them.
// They read the pin as committed; the live comparison of the corpus with
// the pin is test/r0-t2-honest.serial.test.mjs's, not this gate's.
import { forcedTail, unjudged, unreadImages, unsupported }
  from './r0-t2-honest-gate.mjs';
import { result, section } from './r0-t2-activation-evidence.mjs';

export const pinFile = 'test/fixtures/r0/t2-honest.json';
export const denominatorNames = ['corpus loader', 'effect pin'];

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
  if (found === undefined || found === null || !isList(found.faults)
    || !isList(found.refusals) || !isList(found.forcedTail)) {
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

// Criterion 1: the pin cites §18.157, which admits the four; every
// refusal in it is a named RequirementUnjudged or a named ForcedTail.
export const pinApproved = evidence => {
  if (evidence.pin === null) return result([`${pinFile} missing`], []);
  const problems = [];
  if (!String(evidence.pin.ruling).includes('§18.157'))
    problems.push('pin does not cite §18.157');
  ruledOn(evidence.dossier, '§18.157', 'admitted', problems);
  const state = denominatorsOf(evidence.pin, problems).map(([name, d]) => {
    problems.push(...refusalsUnnamed(name, d));
    return `${name}: ${d.refusals.length} named RequirementUnjudged, `
      + `${d.forcedTail.length} ForcedTail admitted by name (§18.157)`;
  });
  return result(problems, state);
};

// A read fault on a ruled list: an identified unsupported declaration
// with its kind, or one of the two UnreadImage declarations (§18.155
// (6), (7)).
const faultRuled = entry => (unsupported[entry.at] === undefined
  ? unreadImages.includes(entry.at)
    && String(entry.fault).startsWith('UnreadImage ')
  : entry.fault === `Declined ${unsupported[entry.at]}`);

// Criterion 2 (A1): each denominator's candidates are the floor
// (validated) plus its three lists, and every listed entry is on a
// list a dossier ruling names.
export const acceptance = evidence => {
  if (evidence.pin === null) return result([`${pinFile} missing`], []);
  const problems = [];
  ruledOn(evidence.dossier, '§18.155', 'UnreadImage', problems);
  ruledOn(evidence.dossier, '§18.155', 'RequirementUnjudged', problems);
  ruledOn(evidence.dossier, '§18.157', 'ForcedTail', problems);
  const state = denominatorsOf(evidence.pin, problems).map(([name, d]) => {
    for (const entry of d.faults.filter(entry => !faultRuled(entry)))
      problems.push(`${name}: read fault on no ruled list ${entry.at}`);
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
  return result(problems, [...state, 'note: §18.157 admits the four '
    + 'ForcedTail to the pin; losing them on replacement is undecided']);
};
