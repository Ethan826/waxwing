// Read-only comparison of two census/window/RT8 result sets (amin
// tranche 1, Task 14 Step 2; produced by scripts/r0-results-dump.mjs).
// It lists every moved row exactly: per declaration (`origin#name`) the
// old and new status and reason, then every moved aggregate count of the
// census, the window summary and RT8. A row is STOP when its status
// moved (verdict head, so Solved either way; today's result; the window
// class between blocked and not; the declaration appearing or
// disappearing); every other movement is MOVED (reason, attempt, RT8
// class, blockers, categories). The overnight authorization makes a
// blocked/Solved change or unexplained movement a substantive stop.
const headOf = verdict => verdict.split(' ')[0];
const blockedClass = name => name !== null && name.startsWith('(a) blocked');
const show = value => (typeof value === 'string' ? value
  : JSON.stringify(value));

// An array as a multiset: its entries' text, sorted, so equal counts
// compare equal in any order. A declaration's `blockers` and
// `categories` are sets of names (the census reads `new Set(categories)`,
// r0-census-tally.mjs; blockers follow the verdict's kinds), so their
// order carries nothing; a repeated entry still counts.
const multiset = list => (Array.isArray(list) ? list.map(show).sort()
  : list);

// The comparable fields of one declaration and whether each is a status.
const fieldsOf = row => ({
  status: headOf(row.r0.verdict),
  reason: row.r0.verdict.slice(headOf(row.r0.verdict).length).trim(),
  attempt: row.r0.attempt,
  today: row.today,
  rt8: row.rt8,
  window: row.window,
  blockers: multiset(row.blockers),
  compiles: row.compiles,
  categories: multiset(row.categories)
});

const statusMoved = (before, after) => before.status !== after.status
  || show(before.today) !== show(after.today)
  || blockedClass(before.window) !== blockedClass(after.window)
  || before.compiles !== after.compiles;

const changesOf = (before, after) => Object.keys(before)
  .filter(name => show(before[name]) !== show(after[name]))
  .map(name => `${name}: ${show(before[name])} -> ${show(after[name])}`);

export const declarationMoves = (oldRows, newRows) => {
  const moves = [];
  for (const at of new Set([...Object.keys(oldRows),
    ...Object.keys(newRows)])) {
    if (!(at in newRows)) moves.push({ at, stop: true,
      changes: ['row removed'] });
    else if (!(at in oldRows)) moves.push({ at, stop: true,
      changes: ['row added'] });
    else {
      const before = fieldsOf(oldRows[at]);
      const after = fieldsOf(newRows[at]);
      const changes = changesOf(before, after);
      if (changes.length > 0) moves.push({ at, changes,
        stop: statusMoved(before, after) });
    }
  }
  return moves.sort((left, right) => left.at.localeCompare(right.at));
};

const isRecord = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);

// Aggregate arrays whose order is meaningful: the census's category
// order, in which its marginal counts are taken (r0-census-classify.mjs
// `categoryOrder`). Every other aggregate array (origins, declarations,
// RT8's holes and defects, the window's lists) is a multiset.
const ordered = new Set(['census/order']);

// Each entry's text with its count.
const counted = list => {
  const counts = new Map();
  for (const item of list.map(show))
    counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

// The entries `left` holds more often than `right`, once per extra copy.
const surplus = (left, right) => [...left].flatMap(([item, count]) =>
  Array.from({ length: Math.max(0, count - (right.get(item) ?? 0)) },
    () => item));

// An array's move: entries removed and added as multisets (counts), and
// for an ordered array a reorder of equal entries too.
const arrayMoves = (before, after, path) => {
  const left = counted(before);
  const right = counted(after);
  const gone = surplus(left, right);
  const fresh = surplus(right, left);
  if (gone.length + fresh.length > 0)
    return [`${path}: removed ${gone.length} [${gone.slice(0, 3)}], `
      + `added ${fresh.length} [${fresh.slice(0, 3)}]`];
  return ordered.has(path) && show(before) !== show(after)
    ? [`${path}: reordered ${show(before)} -> ${show(after)}`] : [];
};

// Moved aggregate values by path: a number or string by old -> new, an
// array by `arrayMoves`.
export const aggregateMoves = (before, after, path = '') => {
  if (Array.isArray(before) && Array.isArray(after))
    return arrayMoves(before, after, path);
  if (isRecord(before) && isRecord(after))
    return [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .flatMap(key => aggregateMoves(before[key], after[key],
        `${path}/${key}`));
  return show(before) === show(after) ? []
    : [`${path}: ${show(before)} -> ${show(after)}`];
};

// Everything that moved between two dumps, with the exit status: 1 when
// any row is STOP, 2 when only MOVED rows or aggregates, else 0.
export const compareResults = (before, after) => {
  const rows = declarationMoves(before.declarations, after.declarations);
  const aggregates = ['census', 'window', 'rt8'].flatMap(name =>
    aggregateMoves(before[name], after[name], name));
  const stops = rows.filter(move => move.stop);
  const status = stops.length > 0 ? 1
    : rows.length + aggregates.length > 0 ? 2 : 0;
  return { rows, aggregates, stops, status };
};

export const reportOf = ({ rows, aggregates, stops }) => [
  `${stops.length} STOP rows, ${rows.length - stops.length} MOVED rows, `
    + `${aggregates.length} moved aggregates`,
  ...rows.map(move => `${move.stop ? 'STOP ' : 'MOVED'} ${move.at}\n    `
    + move.changes.join('\n    ')),
  ...aggregates.map(line => `AGGREGATE ${line}`)
].join('\n');
