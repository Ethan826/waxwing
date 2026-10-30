import test from 'node:test';
import assert from 'node:assert/strict';
import { checked, rejected } from './support.mjs';

// R013: `type R<i>(...r) = R<i>({ f<i>: Int, ...r }, R<i+1>(...r))` over n
// declarations followed each record parameter down the rest of the chain
// for every record argument, so n = 2,000 took about 5.6 s a compile (1.7 s
// at 1,000, after R014). The labels are gathered once now: about 0.15 s.
const chainLength = 2000;
const main = ' fn main(): Int = 0;';

// The 2 s bound is in r013-scale.perf.test.mjs (npm run perf).
const bounded = work => work();

const declarations = (count, last, passed) => {
  const types = Array.from({ length: count }, (_, index) =>
    `type R${index}(...r) = R${index}({ f${index}: Int, ...r }, `
    + `R${index + 1}(${passed(index)}));`);
  return `${types.join(' ')} type R${count}(...r) = ${last};${main}`;
};
const bare = () => '...r';
const labelled = index => `{ g${index}: Int, ...r }`;

test('a 2,000-declaration records-heavy chain compiles', () => {
  bounded(() => checked(declarations(chainLength, `E${chainLength}`, bare)));
});

test('so does one that labels each argument', () => {
  const last = `E${chainLength}({ h: Int, ...r })`;
  bounded(() => checked(declarations(chainLength, last, labelled)));
});

test('a clash at the far end of the chain is the one reported', () => {
  const source = declarations(chainLength,
    `E${chainLength}({ g0: Bool, ...r })`, labelled);
  const diagnostic = bounded(() => rejected(source, 'E_DUPLICATE'));
  assert.equal(diagnostic.message, 'Duplicate field g0');
  assert.equal(diagnostic.span.start.offset, source.indexOf('g0'));
  assert.deepEqual(diagnostic.related.map(note => note.message),
    ['first written here']);
  assert.equal(diagnostic.related[0].span.start.offset,
    source.indexOf('g0', source.indexOf(`type R${chainLength}`)));
});
