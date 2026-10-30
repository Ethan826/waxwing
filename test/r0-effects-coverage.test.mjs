import test from 'node:test';
import assert from 'node:assert/strict';
import { checkFixture, fixtureRows, statementsFile, tableRows }
  from './r0-effects-coverage-run.mjs';

// R0 amin tranche 1, Task 13 (U6, bounded): coverage accounting for
// statements section 13. Each rule row of that table has exactly one
// entry in test/fixtures/r0/effects-coverage.json, of one class:
//   fixture:        a source program whose recorded problem holds the
//                   named obligation kind at the named site (rule and
//                   declaration), with the named content; `verdict` is
//                   the shadow verdict class (blocked: not Solved),
//                   which does not remove the row from coverage;
//   unconstructible: no source program reaches the rule (a reason that
//                   an `Outside` marker alone cannot give);
//   unfinished:     constructible, but the obligation is not recorded
//                   yet; the reason names the task that records it.
// The table is parsed from the statements document, so a row added
// there without an entry here fails. `unfinished` rows are open
// coverage and are never counted as covered. A row whose cell names
// several obligations is covered only when all of them are recorded.
const rows = tableRows();
const entries = fixtureRows();
const classes = ['fixture', 'unconstructible', 'unfinished'];
const classOf = entry => classes.filter(name => name in entry);
const matching = row => entries.filter(entry =>
  row.rule.startsWith(entry.rule));

test('every section 13 row has exactly one entry', () => {
  assert.ok(rows.length >= 31, `only ${rows.length} rows in ${statementsFile}`);
  const missing = rows.filter(row => matching(row).length !== 1)
    .map(row => `${matching(row).length} entries: ${row.rule}`);
  assert.deepEqual(missing, [], 'rows without exactly one entry');
  const stray = entries.filter(entry =>
    rows.filter(row => row.rule.startsWith(entry.rule)).length !== 1);
  assert.deepEqual(stray.map(entry => entry.rule), [],
    'entries matching no row, or several');
  assert.equal(entries.length, rows.length);
});

test('each entry has one class and a reason where one is due', () => {
  const bad = entries.filter(entry => classOf(entry).length !== 1)
    .map(entry => entry.rule);
  assert.deepEqual(bad, [], 'entries without exactly one class');
  for (const entry of entries.filter(item => 'unfinished' in item))
    assert.match(entry.unfinished, /Tasks? \d+/,
      `${entry.rule}: an unfinished reason names its task`);
  for (const entry of entries.filter(item => 'unconstructible' in item))
    assert.ok(!/^\W*outside\b/i.test(entry.unconstructible),
      `${entry.rule}: an Outside marker alone is no reason`);
  for (const entry of entries.filter(item => 'fixture' in item))
    for (const field of ['obligation', 'site', 'verdict'])
      assert.ok(entry[field], `${entry.rule}: fixture row lacks ${field}`);
});

test('each fixture row records its obligation at its site', () => {
  const fixtures = entries.filter(entry => 'fixture' in entry);
  const problems = fixtures.flatMap((entry, index) =>
    checkFixture(entry, index).map(text => `${entry.rule}: ${text}`));
  assert.deepEqual(problems, [], 'fixture rows not recorded as named');
  const count = name => entries.filter(entry => name in entry).length;
  const open = entries.filter(entry => 'unfinished' in entry);
  console.log(`section 13 coverage: ${rows.length} rows; fixture `
    + `${count('fixture')}, unconstructible ${count('unconstructible')}, `
    + `unfinished ${count('unfinished')} (open, not covered)`);
  for (const entry of open)
    console.log(`  open: ${entry.rule}: ${entry.unfinished}`);
  assert.equal(count('fixture') + count('unconstructible')
    + count('unfinished'), rows.length);
});
