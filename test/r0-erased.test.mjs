import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../output/Format.Parse/index.js';
import { resolve } from '../output/Features.Resolve/index.js';
import { fixturesIn, refusalOf } from './r0-probe-support.mjs';
import { firingSources, inferredRow, nodesNamed }
  from './r0-erased-criterion.mjs';

// Task 0.7 (gate G-erased): erased effect rows. A characterization: it
// decides nothing and changes no diagnostic. `obligation` fixtures are
// pairs (`against` names the control) whose refusal comes from an
// effect row that T-R0b erases; `form` fixtures give one program per
// effect operation, handler and `fail` form. `sources`, `marked` and
// `inferredRow` are derived by hand from docs/plans/r0-erased-rows.md
// (§4's criterion, §7's part (ii) predicate) and checked here against
// a reference reading of those rules (r0-erased-criterion.mjs); they
// are the expected answers for Task 3.5's detector.
const fixtures = fixturesIn('r0/erased');
const outcome = f => ({ phase: f.phase, code: f.code, text: f.text,
  at: f.at });
const today = f => {
  const found = refusalOf(f.source);
  return { phase: found.phase, code: found.code, text: found.text,
    at: found.at };
};
const named = new Map(fixtures.map(f => [f.name, f]));

const programOf = source => resolve(parse(source).value0).value0;
const bodyOfG = source => programOf(source).functions.find(isG).body;
const isG = declaration => declaration.name === 'g';
const familyOf = node => node.value1.constructor.name === 'Just'
  ? 'written' : 'unwritten';

// A deliberate pin: adding or removing a fixture is a table change.
test('every erased-row fixture gives its recorded outcome', () => {
  assert.equal(fixtures.length, 34);
  for (const f of fixtures)
    assert.deepEqual(today(f), outcome(f), f.name);
});

test('each form fixture writes its resolved form in g', () => {
  for (const f of fixtures.filter(f => f.node !== null)) {
    const nodes = nodesNamed(bodyOfG(f.source), f.node);
    assert.ok(nodes.length > 0, f.name);
    if (f.family !== undefined) {
      const fails = nodesNamed(bodyOfG(f.source), 'Fail');
      assert.deepEqual(fails.map(familyOf), [f.family], f.name);
    }
  }
});

test('each refused obligation compiles once the arguments agree', () => {
  const pairs = fixtures.filter(f => f.against !== null);
  assert.equal(pairs.length, 5);
  for (const f of pairs) {
    assert.equal(f.phase, 'check', f.name);
    assert.equal(named.get(f.against).phase, 'compiled', f.name);
  }
});

// The hand-derived answers agree with the reference reading.
test('each fixture has the criterion\'s answers for g', () => {
  for (const f of fixtures) {
    const program = programOf(f.source);
    const g = program.functions.find(isG);
    assert.deepEqual(firingSources(program, g), f.sources, f.name);
    assert.equal(f.marked, f.sources.length > 0, f.name);
    assert.equal(inferredRow(program, g), f.inferredRow, f.name);
  }
});
