// FX020 migration: one file (one-off; Task 7 removes it, R4). A file is
// a list of units, each the text of one program or fragment with the
// file offset of every unit of its text: a whole .wxw file; each Waxwing
// fence of a Markdown file; in JavaScript, each chain of string literals
// (fx020-js). A unit's edits come from the resolver when it resolves
// alone, else from the resolving sources that contain it verbatim
// (fx020-locate). A unit with neither, whose code names an operation, is
// never edited: it goes to the manifest with token-stream candidates.
import { positionAt, apply } from './fx020-editmap.mjs';
import { literalUnits } from './fx020-js.mjs';
import { contextIndex, locate } from './fx020-locate.mjs';
import { analyse, shape } from './fx020-program.mjs';
import { candidates, declared, mentions } from './fx020-tokens.mjs';

const fenceInfo = new Set(['', 'rust', 'waxwing', 'wxw']);
const shown = 240;

const identity = (start, length) =>
  Array.from({ length: length + 1 }, (_, index) => start + index);

const fences = text => {
  const units = [];
  const fence = /^```(\w*)[ \t]*\n([\s\S]*?)^```[ \t]*$/gm;
  for (const match of text.matchAll(fence)) {
    if (!fenceInfo.has(match[1])) continue;
    const start = match.index + match[0].indexOf('\n') + 1;
    units.push([{ cooked: match[2], start,
      offsets: identity(start, match[2].length) }]);
  }
  return units;
};

export const unitsOf = (path, text) => {
  if (path.endsWith('.wxw')) {
    return [[{ cooked: text, start: 0, offsets: identity(0, text.length) }]];
  }
  if (path.endsWith('.md')) return fences(text);
  return literalUnits(text);
};

export const unitText = unit => unit.map(piece => piece.cooked).join('');

export const environment = async (compiler, sources) =>
  ({ compiler, index: contextIndex(compiler, sources) });

// The file offset of a unit offset, or undefined when that character is
// written as an escape (an insertion there could not be placed safely).
const rawOffset = (unit, at) => {
  let base = 0;
  for (const piece of unit) {
    if (at < base + piece.cooked.length) return piece.offsets[at - base];
    base += piece.cooked.length;
  }
  return undefined;
};

// Names in `scope` (an operation name to its effects) and those `source`
// itself declares; the tightest qualifiers come last.
const qualifiersFor = (source, scope) => {
  const known = new Map([...scope]
    .map(([name, effects]) => [name, new Set(effects)]));
  for (const [name, effect] of declared(source)) {
    known.set(name, new Set([effect]));
  }
  return known;
};

// A resolved unit must re-resolve, after its edits, to the same program
// with nothing left to rewrite.
const verified = (env, source, analysed) => {
  const again = analyse(env.compiler, apply(source, analysed.edits));
  return again.status === 'resolved' && again.edits.length === 0
    && shape(again.program) === shape(analysed.program);
};

// Whether to look for a fragment is decided with every operation name
// the corpus declares; what goes to the manifest, with the names the
// file can see (its own declarations and its imports'), since generated
// test effects declare names such as `f` and `tag`.
const decide = (env, path, source, scope) => {
  const analysed = analyse(env.compiler, source);
  if (analysed.status === 'resolved') {
    return verified(env, source, analysed) ? { edits: analysed.edits }
      : { reason: 'resolved, but the rewrite does not re-resolve alike' };
  }
  const everywhere = qualifiersFor(source, env.index.qualifiers);
  if (candidates(source, everywhere).length === 0
    && !mentions(source, everywhere)) return { edits: [] };
  const located = locate(env.index, source);
  if (located.status === 'located') return { edits: located.edits };
  const visible = qualifiersFor(source, scope ?? env.index.qualifiers);
  const proposed = candidates(source, visible);
  if (proposed.length === 0) {
    return mentions(source, visible) ? { mention: true } : { edits: [] };
  }
  const whole = path.endsWith('.wxw') || /\bfn main\b/.test(source);
  return { reason: located.status === 'inconsistent'
    ? 'fragment: its resolving sources disagree'
    : whole ? analysed.reason : 'fragment: no resolving source contains it',
  candidates: proposed };
};

const manualEntry = (path, text, unit, source, decision) => {
  const where = positionAt(text, rawOffset(unit, 0) ?? unit[0].start);
  return { file: path, line: where.line, column: where.column,
    reason: decision.reason, text: source.slice(0, shown),
    candidates: (decision.candidates ?? []).map(candidate => {
      const at = positionAt(text, rawOffset(unit, candidate.at) ?? 0);
      return { name: candidate.name, qualifier: candidate.qualifier,
        kind: candidate.kind, line: at.line, column: at.column };
    }) };
};

// Places a unit's edits in the file; undefined if one cannot be placed.
const placed = (text, unit, source, edits) => {
  const result = [];
  for (const edit of edits) {
    const at = rawOffset(unit, edit.at);
    if (at === undefined || text[at] !== source[edit.at]) return undefined;
    const { line, column } = positionAt(text, at);
    result.push({ ...edit, at, line, column });
  }
  return result;
};

// `scope`: the operations the file can see; all the corpus's by default.
export const migrateSource = (env, path, text, scope) => {
  const edits = [];
  const units = [];
  const manual = [];
  const mentioned = [];
  for (const unit of unitsOf(path, text)) {
    const source = unitText(unit);
    const decision = decide(env, path, source, scope);
    const where = positionAt(text, unit[0].start);
    if (decision.mention) {
      mentioned.push({ file: path, line: where.line,
        text: source.slice(0, shown) });
      continue;
    }
    const inFile = decision.edits && placed(text, unit, source,
      decision.edits);
    if (inFile === undefined) {
      manual.push(manualEntry(path, text, unit, source, decision.edits
        ? { reason: 'an edit falls on an escaped character' } : decision));
    } else if (inFile.length > 0) {
      edits.push(...inFile);
      units.push({ line: where.line, column: where.column,
        edits: decision.edits });
    }
  }
  return { text: apply(text, edits), edits, units, manual, mentioned };
};
