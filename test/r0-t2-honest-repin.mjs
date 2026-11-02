// The re-pin rule of scripts/r0-t2-honest-pin.mjs (tranche 2 Task 13;
// dossier §18.155 (7)), pure so its own tests and restored-defect row
// can run it (test/r0-t2-honest-repin.test.mjs). `repin(before, after,
// options)`: `before` is the pin on disk or null, `after` the new one,
// `options` `{ repin, explanation, covers }`, where `covers` lists the
// disappearances admission found that the explanation must answer.
// It gives `{ problems, pin }`; any problem means nothing is written.
// A re-pin needs `--repin`; an entry that vanishes from (a) or (b), a
// floor or candidate count that falls, or a denominator missing from
// the old pin is refused unless explained, and every explanation, old
// and new, is kept in the pin with what it covers.
const ats = entries => new Set(entries.map(entry => entry.at));

// What a re-pin of one denominator changes that needs an explanation.
const lowered = (name, old, now) => {
  const kept = new Set([...ats(now.faults), ...ats(now.refusals)]);
  return [
    ...[...old.faults, ...old.refusals].filter(entry =>
      !kept.has(entry.at))
      .map(entry => `${name}: vanished ${entry.at}`),
    ...['floor', 'candidates'].filter(key => now[key] < old[key])
      .map(key => `${name}: ${key} ${old[key]} to ${now[key]}`)];
};

export const repin = (before, after, options) => {
  const problems = [];
  const covers = [...options.covers ?? []];
  if (before !== null) {
    if (!options.repin) problems.push('a pin exists: --repin');
    for (const [name, now] of Object.entries(after.denominators)) {
      const old = before.denominators?.[name];
      if (old === undefined)
        problems.push(`the old pin has no denominator ${name}`);
      else covers.push(...lowered(name, old, now));
    }
  }
  if (covers.length > 0 && options.explanation === undefined)
    problems.push(`needs --explain: ${covers.join('; ')}`);
  const added = options.explanation === undefined ? []
    : [{ explanation: options.explanation, covers }];
  return { problems, pin: { ...after,
    explanations: [...before?.explanations ?? [], ...added] } };
};
