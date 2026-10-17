import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from '../output/Program.Compile/index.js';
import { Left } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

// R013: a record argument's labels are checked against those its
// declaration writes beside the parameter, through every declaration the
// parameter is passed to. The labels are gathered once per program; this
// compares the rule on generated programs of recursive, mutually recursive
// and diamond-shaped declarations with a reference that follows the
// parameter by a plain search, as the rule is stated. No timing.
const programCount = 500;
const typeLimit = 6;
const fieldLimit = 3;
const modulus = 2147483648;
const labels = ['xa', 'xb', 'xc', 'xd'];

// A small deterministic generator, so a failure replays.
const generator = seed => {
  let state = seed;
  return limit => {
    state = (state * 1103515245 + 12345) % modulus;
    return Math.floor(state / 65536) % limit;
  };
};

// `type T<i>(...r) = C<i>(fields)`: a field writes a record beside r
// (kind 0), passes r on (1), passes r with a label beside it (2), or is
// an Int. `uses` lists each label written beside r with where, in source
// order, and `edges` the declarations r is passed on to.
const build = seed => {
  const next = generator(seed);
  const count = 1 + next(typeLimit);
  const uses = [];
  const edges = [];
  let source = '';
  for (let owner = 0; owner < count; owner++) {
    source += `type T${owner}(...r) = C${owner}(`;
    const fields = 1 + next(fieldLimit);
    for (let index = 0; index < fields; index++) {
      source += index === 0 ? '' : ', ';
      // The first field fixes r as a record parameter.
      const kind = index === 0 ? 0 : next(4);
      const callee = next(count);
      const name = labels[next(labels.length)];
      if (kind === 1 || kind === 2) edges.push([owner, callee]);
      if (kind === 0) {
        source += '{ ';
        uses.push({ owner, name, at: source.length, argument: null });
        source += `${name}: Int, ...r }`;
      } else if (kind === 1) source += `T${callee}(...r)`;
      else if (kind === 2) {
        source += `T${callee}({ `;
        uses.push({ owner, name, at: source.length, argument: callee });
        source += `${name}: Int, ...r })`;
      } else source += 'Int';
    }
    source += '); ';
  }
  return { source: `${source}fn main(): Int = 0;`, uses, edges };
};

// The declarations r reaches from `start`, itself included.
const reach = (edges, start) => {
  const seen = new Set([start]);
  const pending = [start];
  while (pending.length > 0) {
    const from = pending.pop();
    for (const [owner, callee] of edges) {
      if (owner === from && !seen.has(callee)) {
        seen.add(callee);
        pending.push(callee);
      }
    }
  }
  return seen;
};

// The first label argument, in source order, that repeats a label written
// in a declaration it reaches, and the first such label written.
const expected = ({ uses, edges }) => {
  for (const use of uses.filter(found => found.argument !== null)) {
    const reached = reach(edges, use.argument);
    const same = uses.filter(found => found !== use
      && found.name === use.name && reached.has(found.owner));
    if (same.length > 0) {
      return { at: use.at, name: use.name,
        first: Math.min(...same.map(found => found.at)) };
    }
  }
  return null;
};

const offset = position => position.offset;

test('the clash found is the reference rule\'s, on generated programs', () => {
  let clashes = 0;
  for (let seed = 1; seed <= programCount; seed++) {
    const program = build(seed);
    const result = compile(program.source);
    const want = expected(program);
    if (want === null) {
      const diagnostic = result instanceof Left ? wire(result.value0) : null;
      assert.notEqual(diagnostic?.code, 'E_DUPLICATE', program.source);
      continue;
    }
    clashes++;
    assert.ok(result instanceof Left, program.source);
    const diagnostic = wire(result.value0);
    assert.equal(diagnostic.code, 'E_DUPLICATE', program.source);
    assert.equal(diagnostic.message, `Duplicate field ${want.name}`);
    assert.equal(offset(diagnostic.span.start), want.at, program.source);
    assert.deepEqual(diagnostic.related.map(note => offset(note.span.start)),
      [want.first], program.source);
    assert.deepEqual(diagnostic.related.map(note => note.message),
      ['first written here']);
  }
  assert.ok(clashes > programCount / 10, `only ${clashes} programs clash`);
});
