// What the one-way soundness differential (FX008 Task 11) asks of a program:
// the compiler's verdict, where a `defer` item lies in the source, and
// which diagnostics are FX008 headlines.
import { compile } from '../output/Program.Compile/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

export const verdict = source => {
  const result = compile(source);
  return result instanceof Left ? { diagnostic: wire(result.value0) }
    : { accepted: true };
};

// A `defer` item runs from the keyword to the `;` or closing bracket that
// ends it at its own nesting depth.
const itemEnd = (source, from) => {
  let depth = 0;
  for (let at = from; at < source.length; at++) {
    const character = source[at];
    if ('({['.includes(character)) depth++;
    else if (')}]'.includes(character)) {
      if (depth === 0) return at;
      depth--;
    } else if (character === ';' && depth === 0) return at;
  }
  return source.length;
};

export const deferExtents = source => {
  const found = [];
  for (let at = source.indexOf('defer '); at !== -1;
    at = source.indexOf('defer ', at + 1)) {
    found.push([at, itemEnd(source, at)]);
  }
  return found;
};

export const atDefer = (source, span) => deferExtents(source).some(
  ([start, end]) => span.start.offset >= start && span.end.offset <= end);

// A call or argument: a lowercase name and its parenthesised arguments (a
// `nofail` callee refused where it is called).
export const atCall = (source, span) => /^[a-z]\w*\(.*\)$/s.test(
  source.slice(span.start.offset, span.end.offset));

const headlines = [
  /^defer must not fail, but it performs .+, whose handler may fail$/,
  /^defer must not fail, but it performs nofail\(.+\) .+, whose handler is /,
  /^Expected (nofail|nofail\(.+\)) .+, found .+$/, /^This handler may fail here: /];
const strict = [/^defer must not fail, but it performs Fail\(/,
  /^defer must not fail, but it may perform any effect of /];

export const isHeadline = message =>
  headlines.some(pattern => pattern.test(message));
export const isStrictText = message =>
  strict.some(pattern => pattern.test(message));
export const escaped = 'oracle error: typed abort escaped cleanup\n';
