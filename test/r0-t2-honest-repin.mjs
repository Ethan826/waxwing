// The re-pin rule of scripts/r0-t2-honest-pin.mjs (tranche 2 Task 13;
// dossier §18.155 (7), §18.157), pure so its own tests and
// restored-defect rows can run it (test/r0-t2-honest-gate.test.mjs).
// `repin(before, after, options)`: `before` is the pin on disk or null,
// `after` the new one, `options` `{ repin, explanation, covers }`, where
// `covers` lists the disappearances admission found that the
// explanation must answer. It gives `{ problems, pin }`; any problem
// means nothing is written.
// A re-pin needs `--repin`; a denominator missing from the old pin or
// from the new one is refused, explained or not; an entry that
// vanishes from a pinned list is refused unless explained. A floor or
// candidate count that falls is refused whatever the explanation
// (§18.157: explanations document approved changes, they do not
// approve them; a lowering needs the author's ruling and a mechanism
// this script does not have). Every explanation, old and new, is kept
// in the pin with what it covers.
const ats = entries => new Set(entries.map(entry => entry.at));

// The pinned entries of one denominator: (a), (b) and (b′).
const entriesOf = pin => [...pin.faults, ...pin.refusals,
  ...pin.forcedTail];

// Entries of the old pin the new one lacks: each needs an explanation.
const vanished = (name, old, now) => {
  const kept = ats(entriesOf(now));
  return entriesOf(old).filter(entry => !kept.has(entry.at))
    .map(entry => `${name}: vanished ${entry.at}`);
};

// A floor or candidate count that falls: refused, explained or not.
const fallen = (name, old, now) => ['floor', 'candidates']
  .filter(key => now[key] < old[key])
  .map(key => `${name}: ${key} ${old[key]} to ${now[key]} refused; `
    + 'a lower floor or candidate count needs the author\'s ruling, '
    + 'not --explain');

export const repin = (before, after, options) => {
  const problems = [];
  const covers = [...options.covers ?? []];
  if (before !== null) {
    if (!options.repin) problems.push('a pin exists: --repin');
    for (const [name, now] of Object.entries(after.denominators)) {
      const old = before.denominators?.[name];
      if (old === undefined)
        problems.push(`the old pin has no denominator ${name}`);
      else {
        covers.push(...vanished(name, old, now));
        problems.push(...fallen(name, old, now));
      }
    }
    for (const name of Object.keys(before.denominators ?? {}))
      if (after.denominators[name] === undefined)
        problems.push(`the new pin drops denominator ${name}`);
  }
  if (covers.length > 0 && options.explanation === undefined)
    problems.push(`needs --explain: ${covers.join('; ')}`);
  const added = options.explanation === undefined ? []
    : [{ explanation: options.explanation, covers }];
  return { problems, pin: { ...after,
    explanations: [...before?.explanations ?? [], ...added] } };
};
