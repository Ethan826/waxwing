// FX020 paired differential, core (one-off; Task 7 removes it, R4). Each
// original program is paired with its migrated twin: the twin is the
// original plus qualifier and line-break insertions (fx020-editmap
// `align`), so the pairing needs no record from the rewrite tool and
// also covers programs built at run time from fragments. Accepted pairs
// must emit equal Go; rejected pairs the same code and message, with
// span and note positions mapped through the pair's edit map. Anything
// else is a difference, expected only when scripts/fx020-expected.json
// lists it with a reason.
import { createHash } from 'node:crypto';
import { align, mapSpan } from './fx020-editmap.mjs';

export const sourceKey = source =>
  createHash('sha1').update(source).digest('hex');

// What a source is with every qualifier and all whitespace removed: equal
// for an original and its twin, so it narrows the alignment candidates.
const shape = source => source
  .replace(/\b[A-Z][A-Za-z0-9_]*\.(?=[a-z_])/g, '').replace(/\s+/g, '');

const grouped = sources => {
  const groups = new Map();
  for (const source of sources) {
    const key = shape(source);
    groups.set(key, [...(groups.get(key) ?? []), source]);
  }
  return groups;
};

// The closest twin: fewest insertions, so an identical source wins.
const twin = (source, candidates, orient) => {
  let best;
  for (const candidate of candidates) {
    const [original, migrated] = orient(source, candidate);
    const edits = align(original, migrated);
    if (edits !== undefined
      && (best === undefined || edits.length < best.edits.length)) {
      best = { original, migrated, edits };
    }
  }
  return best;
};

export const pairUp = (originalSources, migratedSources) => {
  const originals = [...new Set(originalSources)];
  const migrated = [...new Set(migratedSources)];
  const byMigrated = grouped(migrated);
  const byOriginal = grouped(originals);
  const pairs = [];
  const used = new Set();
  const lonely = [];
  for (const source of originals) {
    const found = twin(source, byMigrated.get(shape(source)) ?? [],
      (original, candidate) => [original, candidate]);
    if (found === undefined) lonely.push(source);
    else { pairs.push(found); used.add(found.migrated); }
  }
  // A twin can be shared: two originals may migrate to one source.
  const strays = [];
  for (const source of migrated.filter(text => !used.has(text))) {
    const found = twin(source, byOriginal.get(shape(source)) ?? [],
      (migratedText, candidate) => [candidate, migratedText]);
    if (found === undefined) strays.push(source);
    else pairs.push(found);
  }
  return { pairs, lonely, strays };
};

// A crash is an outcome like any other: a crash on one side only is an
// `outcome` difference, never retried (a near-limit stack overflow that
// differs between runs is BACKLOG G006).
const outcome = (compiler, source) => {
  try {
    const result = compiler.compile(source);
    return result instanceof compiler.Left
      ? { rejected: compiler.wire(result.value0) } : { go: result.value0 };
  } catch (error) {
    return { crash: `${error.constructor.name}: ${error.message}` };
  }
};

const position = ({ offset, line, column }) => ({ offset, line, column });
const spanOf = ({ start, end }) =>
  ({ start: position(start), end: position(end) });
const diagnostic = (wire, place) => JSON.stringify({ code: wire.code,
  message: wire.message, span: spanOf(place(wire.span)),
  related: wire.related.map(note =>
    ({ message: note.message, span: spanOf(place(note.span)) })) });

const summary = result => result.go !== undefined
  ? `go ${sourceKey(result.go)}`
  : result.crash ?? diagnostic(result.rejected, span => span);

const difference = ({ original, migrated, edits }, pair) => {
  const before = outcome(pair.baseline, original);
  const after = outcome(pair.candidate, migrated);
  const found = kind => ({ kind, original, migrated,
    baseline: summary(before), candidate: summary(after) });
  if (before.go !== undefined && after.go !== undefined) {
    return before.go === after.go ? undefined : found('go');
  }
  if (before.rejected !== undefined && after.rejected !== undefined) {
    const place = span => mapSpan(edits, original, migrated, span);
    return diagnostic(before.rejected, place)
      === diagnostic(after.rejected, span => span)
      ? undefined : found('diagnostic');
  }
  return found('outcome');
};

// A ledger entry names the original (or, for an unpaired twin, the
// migrated) source by sourceKey, the kind, and optionally the exact
// candidate summary it expects, so it cannot excuse a different change.
// An entry naming neither source excuses nothing (and so is stale).
const excuses = (entry, found) => entry.kind === found.kind
  && (entry.original !== undefined || entry.migrated !== undefined)
  && (entry.original === undefined
    || entry.original === sourceKey(found.original ?? ''))
  && (entry.migrated === undefined
    || entry.migrated === sourceKey(found.migrated ?? ''))
  && (entry.candidate === undefined || entry.candidate === found.candidate);

export const judge = (pair, pairing, ledger) => {
  const found = [
    ...pairing.pairs.map(item => difference(item, pair))
      .filter(item => item !== undefined),
    ...pairing.lonely.map(original => ({ kind: 'unpaired original',
      original })),
    ...pairing.strays.map(migrated => ({ kind: 'unpaired migrated',
      migrated }))];
  const used = new Set();
  const unexpected = [];
  const expected = [];
  for (const item of found) {
    const entry = ledger.find(candidate => excuses(candidate, item));
    if (entry === undefined) unexpected.push(item);
    else { used.add(entry); expected.push({ ...item, reason: entry.reason }); }
  }
  return { compared: pairing.pairs.length, unexpected, expected,
    stale: ledger.filter(entry => !used.has(entry)) };
};
