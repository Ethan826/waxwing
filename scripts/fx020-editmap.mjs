// FX020 migration edit map (one-off; Task 7 removes it, R4). An edit is
// an insertion `{ at, text, kind }` at an offset of the original text,
// in UTF-16 units as the compiler's spans are. `qualifier` inserts
// `Effect.` before a bare operation name; `break` is a line break (and
// indentation) from a separate wrapping step, never mixed with
// qualification in one edit. A map translates pinned spans, notes and
// the paired differential's diagnostics.

const byOffset = (left, right) => left.at - right.at;

export const apply = (text, edits) => {
  let result = '';
  let from = 0;
  for (const edit of [...edits].sort(byOffset)) {
    result += text.slice(from, edit.at) + edit.text;
    from = edit.at;
  }
  return result + text.slice(from);
};

// Where an original offset lands. An insertion strictly before it moves
// it. At the insertion point itself the two kinds differ: a qualifier
// joins the name that follows it, so a span starting there keeps its
// start; a line break pushes a span's start onto the next line. Either
// way an end at that point stays before the insertion.
const moves = (edit, offset, side) => edit.at < offset
  || (edit.at === offset && edit.kind === 'break' && side === 'start');

export const mapOffset = (edits, offset, side) => offset + edits
  .filter(edit => moves(edit, offset, side))
  .reduce((total, edit) => total + edit.text.length, 0);

// Lines break at `\n` only; a column counts UTF-16 units from 1.
export const positionAt = (text, offset) => {
  const before = text.slice(0, offset);
  const lineStart = before.lastIndexOf('\n') + 1;
  return { offset, line: before.split('\n').length,
    column: offset - lineStart + 1 };
};

const mapPosition = (edits, original, migrated, position, side) => {
  const offset = mapOffset(edits, position.offset, side);
  const counted = positionAt(original, position.offset);
  // A position the compiler counted some other way (none is known) moves
  // by its offset alone, so a mismatch shows as a difference.
  return counted.line === position.line && counted.column === position.column
    ? positionAt(migrated, offset)
    : { ...position, offset,
      column: position.column + offset - position.offset };
};

export const mapSpan = (edits, original, migrated, span) => ({
  start: mapPosition(edits, original, migrated, span.start, 'start'),
  end: mapPosition(edits, original, migrated, span.end, 'end')
});

// The insertions that turn `original` into `migrated`, or undefined when
// the twin is not original-plus-insertions: an `Effect.` qualifier before
// a name, or whitespace containing a line break.
const qualifierAt = /^[A-Z][A-Za-z0-9_]*\.(?=[a-z_])/;
const whitespace = /^[ \t\n]*/;

// A hand wrap replaces a space with a break and indentation (`a, b` →
// `a,\n  b`). As an insertion, the break goes before the original
// whitespace still at `at`, which must end the migrated run; the
// inserted part must hold the line break. After the run comes the
// original's next character, or a qualifier inserted before it (a wrap
// right before `Log.log(1)`), which the next step takes.
const qualified = (migrated, index, next) => {
  const found = qualifierAt.exec(migrated.slice(index, index + 200));
  return found !== null && migrated.startsWith(next, index + found[0].length);
};

const breakAt = (original, at, migrated, index) => {
  const kept = whitespace.exec(original.slice(at))[0];
  const run = whitespace.exec(migrated.slice(index))[0];
  const text = run.slice(0, run.length - kept.length);
  const next = original.slice(at + kept.length, at + kept.length + 1);
  return text.includes('\n') && run.endsWith(kept)
    && (migrated.startsWith(next, index + run.length)
      || qualified(migrated, index + run.length, next))
    ? { at, text, kind: 'break' } : undefined;
};

const insertionAt = (original, at, migrated, index) =>
  qualified(migrated, index, original.slice(at, at + 1))
    ? { at, text: qualifierAt.exec(migrated.slice(index, index + 200))[0],
      kind: 'qualifier' }
    : breakAt(original, at, migrated, index);

export const align = (original, migrated) => {
  const edits = [];
  let at = 0;
  let index = 0;
  while (at < original.length || index < migrated.length) {
    if (at < original.length && original[at] === migrated[index]) {
      at++;
      index++;
      continue;
    }
    const edit = insertionAt(original, at, migrated, index);
    if (edit === undefined) return undefined;
    edits.push(edit);
    index += edit.text.length;
  }
  return edits;
};
