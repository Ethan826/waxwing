// FX020 migration: placing a fragment (one-off; Task 7 removes it, R4).
// Test files build many programs at run time: a prelude constant, `+`,
// then a literal that is not a program on its own. Such a literal is
// found verbatim inside the resolving sources (the test suite's harvest
// and every literal that resolves alone), and takes the edits those
// sources' resolver output places inside it. Every occurrence must agree
// on those edits; otherwise, or when no resolving source contains it, it
// goes to the manifest.
import { analyse } from './fx020-program.mjs';

const separator = '\u0000';

export const contextIndex = (compiler, sources) => {
  const contexts = [];
  const qualifiers = new Map();
  for (const source of new Set(sources)) {
    if (source.includes(separator)) continue;
    const analysed = analyse(compiler, source);
    if (analysed.status !== 'resolved') continue;
    for (const [name, effect] of analysed.operations) {
      qualifiers.set(name, (qualifiers.get(name) ?? new Set()).add(effect));
    }
    contexts.push({ source, edits: analysed.edits });
  }
  const starts = [];
  let offset = 0;
  for (const context of contexts) {
    starts.push(offset);
    offset += context.source.length + separator.length;
  }
  return { contexts, starts, qualifiers,
    joined: contexts.map(context => context.source).join(separator) };
};

const contextAt = (starts, offset) => {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
};

const editsWithin = (context, from, length) => context.edits
  .filter(edit => edit.at >= from && edit.at < from + length)
  .map(edit => ({ ...edit, at: edit.at - from }));

export const locate = (index, fragment) => {
  if (fragment.length === 0) return { status: 'absent' };
  const variants = new Set();
  let found = index.joined.indexOf(fragment);
  if (found === -1) return { status: 'absent' };
  while (found !== -1 && variants.size < 2) {
    const which = contextAt(index.starts, found);
    variants.add(JSON.stringify(editsWithin(index.contexts[which],
      found - index.starts[which], fragment.length)));
    found = index.joined.indexOf(fragment, found + 1);
  }
  return variants.size === 1
    ? { status: 'located', edits: JSON.parse([...variants][0]) }
    : { status: 'inconsistent' };
};
