import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Lacks, Disjoint, Joined, Implied, Spread, prefer, rank
} from '../output/Features.Check.Because/index.js';
import { Tuple } from '../output/Data.Tuple/index.js';

// R005 Tranche B Task 3: `prefer` (design §1.3, user decision 5) keeps one
// reason of several: a written `lacks`, then a written `disjoint`, then an
// implied fact, then a spread fact; between two of one kind the earlier
// in source order. It depends only on the two reasons, so the reason kept
// is independent of the order facts arrive in: commutative and
// associative, on seeded random reasons.
const random = seed => () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const span = (next, start) => ({
  start: { offset: start, line: 1, column: start + 1 },
  end: { offset: start + 1 + Math.floor(next() * 3), line: 1,
    column: start + 2 }
});
const names = ['r', 's', 't'];
const reason = next => {
  const at = () => span(next, Math.floor(next() * 6));
  const name = () => names[Math.floor(next() * names.length)];
  switch (Math.floor(next() * 5)) {
    case 0: return Lacks.create({ variable: name(), span: at() });
    case 1: return Disjoint.create(
      { variables: new Tuple(name(), name()), span: at() });
    case 2: return Joined.create(
      { variables: new Tuple(name(), name()), span: at() });
    case 3: return Implied.value;
    default: return Spread.create({ earlier: at(), later: at() });
  }
};

test('prefer is commutative and associative', () => {
  const next = random(17);
  for (let round = 0; round < 3000; round++) {
    const [a, b, c] = [reason(next), reason(next), reason(next)];
    assert.deepEqual(prefer(a)(b), prefer(b)(a));
    assert.deepEqual(prefer(prefer(a)(b))(c), prefer(a)(prefer(b)(c)));
  }
});

test('prefer keeps the kind that ranks first, then the earlier', () => {
  const next = random(29);
  for (let round = 0; round < 3000; round++) {
    const [a, b] = [reason(next), reason(next)];
    const kept = prefer(a)(b);
    assert.ok(rank(kept) <= Math.min(rank(a), rank(b)));
  }
  const early = Lacks.create({ variable: 'r', span: span(random(1), 0) });
  const late = Lacks.create({ variable: 'r', span: span(random(1), 4) });
  assert.deepEqual(prefer(late)(early), early);
  const written = Disjoint.create(
    { variables: new Tuple('r', 's'), span: span(random(1), 5) });
  const implied = Joined.create(
    { variables: new Tuple('r', 's'), span: span(random(1), 0) });
  assert.deepEqual(prefer(implied)(written), written);
});
