// Text expressions of the FX001 reference interpreter: literals with
// interpolation holes, `++`, and the census events for Text (what the
// generated corpus really exercised). Parts evaluate left to right, each
// once (design §1). Shares no code with the compiler.
import { OracleError } from './fx-oracle-cleanup.mjs';
import { isText } from './fx-oracle-values.mjs';

// A text literal token as a node; its holes are parsed by `hole`.
export const textNode = ({ style, parts }, hole) => ({ tag: 'text', style,
  parts: parts.map(part => (typeof part === 'string' ? part
    : hole(part.hole))) });

const textOf = value => {
  if (!isText(value)) throw new OracleError('Text expected');
  return value.text;
};

// Evaluates `part` and reports whether it performed an effect.
const observe = (state, part, env, ctx) => {
  const before = state.effects;
  const value = state.evaluate(part, env, ctx);
  return { value, effectful: state.effects !== before };
};

const evaluateLiteral = (state, node, env, ctx) => {
  const { events } = state;
  if (node.style !== 'plain') events.add(`text-${node.style}`);
  let effectful = 0;
  const pieces = node.parts.map(part => {
    if (typeof part === 'string') return part;
    events.add('text-interpolation');
    const seen = observe(state, part, env, ctx);
    if (seen.effectful) effectful++;
    return textOf(seen.value);
  });
  if (effectful > 0) events.add('text-effectful-hole');
  if (effectful > 1) events.add('text-ordered-holes');
  return { text: pieces.join('') };
};

export const evaluateText = (state, node, env, ctx) => {
  if (node.tag === 'text') return evaluateLiteral(state, node, env, ctx);
  const left = observe(state, node.left, env, ctx);
  const right = observe(state, node.right, env, ctx);
  state.events.add('text-concat');
  if (left.effectful || right.effectful) {
    state.events.add('text-effectful-concat');
  }
  return { text: textOf(left.value) + textOf(right.value) };
};

// The code points of the first difference decide the order; when one is
// non-BMP and the other is a BMP scalar above the surrogates, UTF-16 order
// would be wrong.
export const noteComparison = (events, left, right) => {
  events.add('text-compare');
  const a = Array.from(left.text, ch => ch.codePointAt(0));
  const b = Array.from(right.text, ch => ch.codePointAt(0));
  const at = a.findIndex((scalar, index) => scalar !== b[index]);
  if ([...a, ...b].some(scalar => scalar > 0xffff)) {
    events.add('text-compare-astral');
  }
  if (at < 0 || at >= b.length) return;
  const [low, high] = a[at] < b[at] ? [a[at], b[at]] : [b[at], a[at]];
  if (high > 0xffff && low >= 0xd800) events.add('text-compare-trap');
};
