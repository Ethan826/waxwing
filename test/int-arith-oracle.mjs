// Independent reference model for Int arithmetic (D001; design
// docs/plans/2026-10-23-int-arithmetic-design.md, S1 and section 3).
// Values are exact BigInts reduced with BigInt.asIntN(32, ·) at every node,
// the ECMAScript form of int32 two's-complement wrap. Nothing here imports
// the compiler or its tooling: trees, the printer and the random stream are
// this file's own, so the oracle cannot share a defect with what it checks.

const int32Bits = 32;
const smallestPower = 1;
const largestPower = 30;
const maximumDepth = 6;
// Chance that a node above the depth limit is a leaf rather than an
// operation, and that a leaf is a boundary value rather than a random one.
const leafChance = 0.3;
const boundaryChance = 0.5;
const halfWord = 0x10000;
const halfWordBits = 16;

// The operator table: precedence level (higher binds tighter), the
// association of a chain, and the exact operation on BigInts. Later tasks
// add rows; `+` is the only operator today (design section 3).
export const operators = {
  '+': { level: 1, association: 'left', exact: (left, right) => left + right }
};

const powers = Array.from({ length: largestPower - smallestPower + 1 },
  (_, index) => 2 ** (index + smallestPower));

// 0, ±1, the int32 extremes and their neighbours, and ±2^k for k = 1..30.
export const boundary = [0, 1, -1, 2147483647, -2147483648, 2147483646,
  -2147483647, ...powers, ...powers.map(power => -power)];

export const wrap = value => BigInt.asIntN(int32Bits, value);

export const leaf = value => ({ kind: 'leaf', value });
export const parameter = name => ({ kind: 'parameter', name });
export const binary = (operator, left, right) =>
  ({ kind: 'binary', operator, left, right });

// The wrapped value of a tree; `env` maps parameter names to numbers.
export const evaluate = (tree, env = {}) => {
  if (tree.kind === 'leaf') return wrap(BigInt(tree.value));
  if (tree.kind === 'parameter') return wrap(BigInt(env[tree.name]));
  return wrap(operators[tree.operator].exact(evaluate(tree.left, env),
    evaluate(tree.right, env)));
};

// True when some node's exact result leaves the int32 range, so the tree
// exercises wrapping (the tests count these, to show they are not vacuous).
export const wraps = (tree, env = {}) => tree.kind === 'binary'
  && (wraps(tree.left, env) || wraps(tree.right, env)
    || operators[tree.operator].exact(evaluate(tree.left, env),
      evaluate(tree.right, env)) !== evaluate(tree, env));

const levelOf = tree => tree.kind === 'binary'
  ? operators[tree.operator].level : Infinity;

// A child keeps its parentheses when it binds looser than its parent, or
// binds equally on the side its parent's association does not group.
const needsParentheses = (parent, child, side) => {
  const own = operators[parent.operator];
  const level = levelOf(child);
  if (level !== own.level) return level < own.level;
  return side !== own.association;
};

const operand = (parent, child, side, minimal) => {
  const text = render(child, { minimal });
  return child.kind === 'binary'
    && (!minimal || needsParentheses(parent, child, side))
    ? `(${text})` : text;
};

// Source text of a tree: fully parenthesized, or with only the parentheses
// the operator table requires when `minimal` is set.
export const render = (tree, { minimal = false } = {}) => {
  if (tree.kind === 'leaf') return String(tree.value);
  if (tree.kind === 'parameter') return tree.name;
  return `${operand(tree, tree.left, 'left', minimal)} ${tree.operator} `
    + `${operand(tree, tree.right, 'right', minimal)}`;
};

// A seeded linear congruential stream (Numerical Recipes constants), copied
// rather than imported so the oracle stays independent of the tooling.
export const random = seed => {
  let state = seed | 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return ((state >>> 8) & 0xffffff) / 0x1000000;
  };
  const below = count => Math.floor(next() * count);
  const pick = items => items[below(items.length)];
  const int32 = () => ((below(halfWord) << halfWordBits) | below(halfWord));
  return { next, below, pick, int32 };
};

const tree = (stream, ops, leaves, depth) => {
  if (depth === maximumDepth || (depth > 0 && stream.next() < leafChance)) {
    return leaves(stream);
  }
  return binary(stream.pick(ops), tree(stream, ops, leaves, depth + 1),
    tree(stream, ops, leaves, depth + 1));
};

const literalLeaf = stream => leaf(stream.next() < boundaryChance
  ? stream.pick(boundary) : stream.int32());

// `count` trees of depth at most 6 over the operators `ops`; leaves are
// boundary or random int32 literals, or drawn by `leaves` when given.
export const generate = (seed, count, ops, leaves = literalLeaf) => {
  const stream = random(seed);
  return Array.from({ length: count }, () => tree(stream, ops, leaves, 0));
};
