import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './r0-corpus.mjs';
import { observedVerdicts } from './r0-t2-gap-verdicts-run.mjs';
import { honestPinFile, isCertifyVerdict, lossOf, verdictFileOf,
  verdictProblems, verdictsFile } from './r0-t2-gap-verdicts.mjs';

// Dossier §18.159 criterion 2, corpus-observed: today's verdicts on
// every declaration of the honest pin's gap lists, both denominators,
// recomputed from the committed checker and compared both ways with
// the committed file (test/fixtures/r0/t2-gap-verdicts.json, written
// by scripts/r0-t2-gap-verdicts-pin.mjs). The activation gate reads
// the file, not this run; this test is what keeps it current. Serial:
// it runs today's checker, RT8's decisions and Task 13's rows over the
// programs holding those declarations.
const json = path => JSON.parse(readFileSync(join(repoRoot, path), 'utf8'));
const pin = json(honestPinFile);
const observed = await observedVerdicts(pin);
const found = verdictFileOf(pin, observed);

const entriesOf = file => Object.entries(file.denominators).flatMap(
  ([name, entries]) => entries.map(entry =>
    `${name} ${JSON.stringify(entry)}`));

// Each entry one file has and the other lacks, both ways.
const apart = (recorded, recomputed) => {
  const left = entriesOf(recorded);
  const right = entriesOf(recomputed);
  return [...left.filter(line => !right.includes(line))
    .map(line => `recorded, not observed: ${line}`),
  ...right.filter(line => !left.includes(line))
    .map(line => `observed, not recorded: ${line}`)];
};

test('the committed verdict file is today\'s, both ways', () => {
  assert.ok(existsSync(join(repoRoot, verdictsFile)),
    `no ${verdictsFile}; write it with scripts/r0-t2-gap-verdicts-pin.mjs`);
  const recorded = json(verdictsFile);
  assert.deepEqual(apart(recorded, found), []);
  assert.deepEqual(recorded, found);
  assert.deepEqual(verdictProblems(recorded, pin), []);
});

// The committed file itself, apart from the recomputation: each loss
// is what its recorded `certify` gives, every `certify` is a verdict
// certify can give, and each entry carries a verdict from each source.
test('every recorded loss is its certify verdict, both denominators', () => {
  for (const entries of Object.values(json(verdictsFile).denominators))
    for (const entry of entries) {
      assert.equal(entry.loss, lossOf(entry), entry.at);
      assert.ok(isCertifyVerdict(entry.certify), entry.at);
      assert.ok(entry.decide && entry.checker && entry.shadow, entry.at);
    }
});

// Must-fail: a changed observation (certify refusing one loss) no
// longer matches the file, and is named; a file with a loss marked an
// existing refusal, or lacking a pinned entry, does not back the pin.
test('a moved verdict, a relabelled loss and a stale file fail', () => {
  const recorded = json(verdictsFile);
  const loss = Object.values(found.denominators).flat()
    .find(entry => entry.loss === 'yes');
  const moved = new Map(observed);
  moved.set(loss.at, { ...observed.get(loss.at),
    certify: 'RequirementUnjudged planted' });
  const lines = apart(recorded, verdictFileOf(pin, moved));
  assert.ok(lines.some(line => line.startsWith('recorded, not observed: ')
    && line.includes(loss.at)), lines.join('\n'));
  const relabelled = structuredClone(recorded);
  Object.values(relabelled.denominators)[0]
    .find(entry => entry.at === loss.at).loss = 'no';
  assert.match(verdictProblems(relabelled, pin).join('\n'),
    /loss no, but certify accepted/);
  const stale = structuredClone(recorded);
  Object.values(stale.denominators)[0].pop();
  assert.match(verdictProblems(stale, pin).join('\n'),
    /verdict file lacks /);
  assert.deepEqual(verdictProblems(null, pin),
    [`${verdictsFile} missing or unreadable`]);
});
