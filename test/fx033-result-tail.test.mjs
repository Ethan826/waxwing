import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checked, rejected } from './support.mjs';

// FX033: a function's result handler type gets its own clause row C at the
// function's use (ResultClauses.purs `ownClauses`). Before the repair, C's
// tail was a fresh meta unless R's tail variable occurred in a parameter or
// in the function's own row. The programs below put that variable inside
// the result type itself (the handled label's arguments, through data, a
// record, a handler type, a generic identity, a nested result or a bare
// reference), so a caller fills it through an operation argument. Each was
// accepted, and its compiled run ended a deferred expression in a typed
// abort (`fail(E): E`, exit 1). The sources are the ResultC document's
// probes (docs/plans/r0-amin-resultc-tail.md on branch r0-t2-d1, §4 and
// Review 2); `rec1` is Review 2's `r1`, renamed. They are `.wxw.txt` so the
// pinned corpus does not take them in.
const program = name => readFileSync(`test/fx033-probes/${name}.wxw.txt`,
  'utf8');
const deferLog =
  'defer must not fail, but it performs Log, whose handler may fail';
const deferAsk = 'defer must not fail, but it performs Ask(Unit -> Unit), '
  + 'whose handler may fail';

const refusedWith = (name, message) => {
  const diagnostic = rejected(program(name), 'E_EFFECT');
  assert.equal(diagnostic.message, message, name);
};

const channels = ['x1', 'x1l', 'd1', 'rec1', 'h1', 'gen1', 'nest1', 'ref2',
  'ref3'];

for (const name of channels) {
  test(`FX033: ${name} puts R's tail inside the result type`, () => {
    refusedWith(name, deferLog);
  });
}

// Temporary conservative precision limitation, accepted by the author on
// 2026-10-25: c1 and x1z are refused under rule H′ although neither clause
// calls a value typed by R's tail (c1 prints `1` and x1z exits 0 on the
// unrepaired compiler). This does not make them invalid programs, and it
// is not final language policy. Revisiting it needs a criterion based on
// whether the clauses use values typed by R's tail variable (ϱ), which
// would be new machinery needing review before it is built.
test('FX033: H′ refuses c1 for now (precision limitation)', () => {
  refusedWith('c1', deferAsk);
});

test('FX033: H′ refuses x1z for now (precision limitation)', () => {
  refusedWith('x1z', deferLog);
});

// Controls H′ keeps. In k2f R's tail occurs only as R's own tail, so C's
// tail stays fresh. x1d is x1 without the `defer` (the abort reaches the
// `handle`); x1n is x1 with `use` written `nofail Log` and a printing Log
// handler. Their outputs (1, 99, 7) are checked by the CLI runs that
// BACKLOG FX033 records.
test('FX033: the controls k2f, x1d and x1n stay accepted', () => {
  for (const name of ['k2f', 'x1d', 'x1n']) checked(program(name));
});
