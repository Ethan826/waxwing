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

// The comparable fields of one declaration and whether each is a status.
const fieldsOf = row => ({
  status: headOf(row.r0.verdict),
  reason: row.r0.verdict.slice(headOf(row.r0.verdict).length).trim(),
  attempt: row.r0.attempt,
  today: row.today,
  rt8: row.rt8,
  window: row.window,
  blockers: row.blockers,
  compiles: row.compiles,
  categories: row.categories
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

// Moved aggregate values by path: a number or string by old -> new, an
// array as a multiset of elements added and removed.
export const aggregateMoves = (before, after, path = '') => {
  if (Array.isArray(before) && Array.isArray(after)) {
    const left = before.map(show);
    const right = after.map(show);
    const gone = left.filter(item => !right.includes(item));
    const fresh = right.filter(item => !left.includes(item));
    return gone.length + fresh.length === 0 ? []
      : [`${path}: removed ${gone.length} [${gone.slice(0, 3)}], `
        + `added ${fresh.length} [${fresh.slice(0, 3)}]`];
  }
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
