import test from 'node:test';
import assert from 'node:assert/strict';
import { runGoBatch } from './go-batch.mjs';
import { outcome } from './fx-oracle.mjs';
import { escaped, verdict } from './fx008-soundness-support.mjs';
import { accepted, rejected } from './fx008-nofail-k-programs.mjs';

// FX008 whole-branch review M4: `nofail(k)` programs the soundness
// generator cannot build. Each rejected program is an escape in the
// reference interpreter (a typed abort ends its cleanup) and is refused,
// with the text and span pinned below; each fail-free control is accepted,
// and Go prints what the interpreter prints.
const deferLog = 'defer must not fail, but it performs Log, whose handler '
  + 'may fail';
const failingLog = ['with handler Log { log(n) => fail(E) } { ',
  'log(n) => fail(E)', 'Log is handled here',
    'its clause for log fails with E'];
const expectations = {
  p01: { message: 'Expected nofail(k) Log, found Log', at: 'f(())',
    handler: `${failingLog[0]}f(()) }`, clause: failingLog[1] },
  p02: { message: deferLog, at: 'defer log(1)', clause: failingLog[1],
    handler: `${failingLog[0]}both(fn(u: Unit) => { defer log(1); () }, `
      + 'fn(u: Unit) => log(2)) }' },
  p11: { message: deferLog, at: 'defer log(1)', clause: failingLog[1],
    handler: `${failingLog[0]}g(()) }` },
  q03: { message: 'defer must not fail, but it performs Tick, whose handler '
      + 'may fail', at: 'defer tick()', clause: 'tick() => fail(E)',
    handler: 'with handler Tick { tick() => fail(E) } { inst(handler Log '
      + '{ log(n) => { defer tick(); () } }) }' }
};

const textOf = (source, span) =>
  source.slice(span.start.offset, span.end.offset);

for (const [name, source] of rejected) {
  const expected = expectations[name.slice(0, 3)];
  test(`${name} is rejected`, () => {
    const { diagnostic } = verdict(source);
    assert.equal(diagnostic.code, 'E_EFFECT');
    assert.equal(diagnostic.message, expected.message);
    assert.equal(textOf(source, diagnostic.span), expected.at);
    const [handled, fails] = diagnostic.related;
    assert.equal(diagnostic.related.length, 2);
    const label = name.startsWith('q03') ? 'Tick' : 'Log';
    assert.equal(handled.message, `${label} is handled here`);
    assert.equal(textOf(source, handled.span), expected.handler);
    assert.equal(fails.message,
      `its clause for ${label.toLowerCase()} fails with E`);
    assert.equal(textOf(source, fails.span), expected.clause);
  });
  test(`${name} is an escape in the interpreter`, () => {
    assert.equal(outcome(source).stderr, escaped);
  });
}

const batch = runGoBatch(import.meta.url,
  accepted.map(([name, source]) => [name, source]));
for (const [name, source, stdout] of accepted) {
  test(`${name} is accepted and Go agrees with the interpreter`, () => {
    const { stdout: wanted, stderr, status } = outcome(source);
    assert.deepEqual({ stdout: wanted, stderr, status },
      { stdout, stderr: '', status: 0 });
    const seen = batch.result(name);
    assert.deepEqual({ status: seen.status, stdout: seen.stdout,
      stderr: seen.stderr }, { status: 0, stdout, stderr: '' });
  });
}
