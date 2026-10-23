// RT4's comparison (T-R0b §9 item 4; R0 tranche Task 3.4): two sets of
// normalized atoms (test/r0-hand-support.mjs) are equal up to a bijective
// renaming of flexible variables; rigid variables must agree exactly.
// Test-only; a backtracking search over atoms, record tails and the two
// orientations of `eq` and `disjoint`.
import { stableStringify } from './r0-canonical.mjs';

const key = stableStringify;

// Every extension of `naming` (hand key → generated key, and back) under
// which `hand` and `made` are the same variable.
const matchVar = (hand, made, naming) => {
  if ('rigid' in hand || 'rigid' in made)
    return key(hand) === key(made) ? [naming] : [];
  const [mine, theirs] = [key(hand), key(made)];
  const bound = naming.there.get(mine);
  const back = naming.back.get(theirs);
  if (bound !== undefined || back !== undefined)
    return bound === theirs && back === mine ? [naming] : [];
  return [{ there: new Map(naming.there).set(mine, theirs),
    back: new Map(naming.back).set(theirs, mine) }];
};

const matchAll = (pairs, naming, match) => pairs.reduce(
  (namings, [a, b]) => namings.flatMap(found => match(a, b, found)),
  [naming]);

// Tails as a multiset: each hand tail against each unused one.
const matchTails = (hand, made, naming) => {
  if (hand.length !== made.length) return [];
  if (hand.length === 0) return [naming];
  const [first, ...rest] = hand;
  return made.flatMap((tail, at) => matchVar(first, tail, naming)
    .flatMap(found => matchTails(rest,
      made.filter((_, other) => other !== at), found)));
};

const matchType = (hand, made, naming) => {
  if (hand.base !== undefined || made.base !== undefined)
    return key(hand) === key(made) ? [naming] : [];
  if (hand.tvar && made.tvar) return matchVar(hand.tvar, made.tvar, naming);
  if (hand.fun && made.fun) {
    if (hand.fun.params.length !== made.fun.params.length) return [];
    return matchAll([...hand.fun.params.map((param, at) =>
      [param, made.fun.params[at]]), [hand.fun.result, made.fun.result]],
    naming, matchType);
  }
  if (!(hand.record && made.record)) return [];
  const labels = record => key(record.fields.map(([label]) => label));
  if (labels(hand.record) !== labels(made.record)) return [];
  return matchAll(hand.record.fields.map(([, field], at) =>
    [field, made.record.fields[at][1]]), naming, matchType)
    .flatMap(found => matchTails(hand.record.tails, made.record.tails,
      found));
};

const matchAtom = (hand, made, naming) => {
  if (hand === 'ff' || made === 'ff') return hand === made ? [naming] : [];
  const [kind] = Object.keys(hand);
  if (Object.keys(made)[0] !== kind) return [];
  if (kind === 'lacks') return hand.lacks[1] === made.lacks[1]
    ? matchVar(hand.lacks[0], made.lacks[0], naming) : [];
  const match = kind === 'eq' ? matchType : matchVar;
  const [a, b] = hand[kind];
  return [[made[kind][0], made[kind][1]], [made[kind][1], made[kind][0]]]
    .flatMap(([x, y]) => matchAll([[a, x], [b, y]], naming, match));
};

// Whether the two atom sets are equal up to a bijective renaming of
// flexible variables (rigid ones must agree exactly).
export const sameUpToRenaming = (hand, made) => {
  if (hand.length !== made.length) return false;
  const search = (left, right, naming) => left.length === 0
    || right.some((atom, at) => matchAtom(left[0], atom, naming)
      .some(found => search(left.slice(1),
        right.filter((_, other) => other !== at), found)));
  return search(hand, made, { there: new Map(), back: new Map() });
};
