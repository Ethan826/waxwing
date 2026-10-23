import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadCorpus } from './r0-corpus.mjs';
import { compile, compileReport }
  from '../output/Program.Compile/index.js';
import { Right } from '../output/Data.Either/index.js';
import { wire } from '../output/Format.Diagnostic/index.js';

// Task 1.2: the collecting driver keeps today's acceptance and first
// diagnostic. test/fixtures/r0/first-diagnostic.json is `compile`'s
// output over the whole pinned corpus (test/r0-corpus.mjs), written at
// the task's parent commit (its `commit`) before any source change: the
// SHA-256 of the Go text of each accepted program, the wired diagnostic
// of each rejected one. Comparing `compile` with `compileReport` would be
// a tautology once one is derived from the other, so both are compared
// with the snapshot. A program added to the corpus later is appended,
// with the commit its outcome was computed at (`extended`, at a parent
// whose src/ is unchanged) and the baseline commit at which the same
// outcome was confirmed byte-equal (`confirmed`); no existing entry
// changes. Corpus-wide, so serial.
const snapshot = JSON.parse(readFileSync(
  'test/fixtures/r0/first-diagnostic.json', 'utf8'));

const outcome = result => (result instanceof Right
  ? { go: createHash('sha256').update(result.value0).digest('hex') }
  : { diagnostic: wire(result.value0) });

const firstOutcome = report => (report instanceof Right ? outcome(report)
  : { diagnostic: wire(report.value0[0]) });
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

test('acceptance and the first diagnostic are today\'s, corpus-wide',
  async () => {
    const corpus = await loadCorpus();
    assert.deepEqual(corpus.map(entry => entry.origin).sort(),
      Object.keys(snapshot.outcomes).sort());
    const moved = corpus.filter(({ origin, source }) =>
      !same(outcome(compile(source)), snapshot.outcomes[origin])
      || !same(firstOutcome(compileReport(source)),
        snapshot.outcomes[origin])).map(entry => entry.origin);
    assert.deepEqual(moved, []);
  });
