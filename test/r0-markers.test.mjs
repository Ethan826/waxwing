import test from 'node:test';
import assert from 'node:assert/strict';
import { generated } from './r0-generate-support.mjs';
import { phaseOf } from './r0-probe-support.mjs';
import { stableStringify } from './r0-canonical.mjs';

// RT9, markers (T-R0b §9 item 9; R0 tranche Task 3.4). One fixture per
// `Outside` constructor of T-R0b §3.5: the problem's `outside` holds the
// marker with its origin (rule, kind, the node's span), and a refutable
// atom beside it (`1 + true`, E7's `eq Bool Int`) is recorded too, so a
// refuter can still find it: the marker supplies no contradiction and
// blocks none. That no Solved verdict is reported for the function and
// that the atom still gives Contradiction are verdict rules (T-R0a
// AT11, §5.3 rule 1), tested when decision exists (Tasks 4.1, 5.1).
// LocalGeneralization is produced by no resolved construct (T-R0b
// §3.5), so it has no fixture (ruling R11). One fixture per
// parameterised effect (E17, E20): its `inst` variables are in `vars`
// with `Slot` positions at the node.
const main = ' fn main(): Int = 0;';
const state = 'effect State(s) { fn get(): s; fn put(value: s): Unit; }; ';
const clock = 'effect Clock { fn now(): Int; }; ';
const bad = '1 + true';

// [kind, rule, source of `f`, the marker's node]
const fixtures = [
  ['EffectArgument', 'E17', `${state}fn f(): Unit with State(Int) = {`
    + ` let bad = ${bad}; State.put(1) };`, 'State.put(1)'],
  ['HandlerType', 'E20', `${state}fn f(): Int = { let h = handler`
    + ' State(Int) { get() => 1, put(value) => () }; 1 + true };',
  'handler State(Int) { get() => 1, put(value) => () }'],
  ['HandlerType', 'E21', `${clock}fn f(): Int = with handler Clock`
    + ` { now() => 1 } { Clock.now() + true };`,
  'with handler Clock { now() => 1 } { Clock.now() + true }'],
  ['FailFamily', 'E22', `fn f(): Int = handle Fail.fail(1)`
    + ` { fail(problem: Int) => ${bad} };`,
  `handle Fail.fail(1) { fail(problem: Int) => ${bad} }`],
  // Resolve spans `fail` through the payload's end (Qualified.purs:154).
  ['FailFamily', 'E23', `fn f(): Int = handle Fail.fail(1)`
    + ` { fail(problem: Int) => ${bad} };`, 'Fail.fail(1'],
  ['Deferred', 'E16', 'fn f(): Unit with Console = { defer'
    + ` Console.print(1); let bad = ${bad}; Console.print(3) };`,
  'defer Console.print(1)'],
  ['DataApplication', 'E6', 'type Box(a) = Box(a); fn f(): Int ='
    + ` { let b = Box(1); ${bad} };`, 'Box(1)'],
  ['DataOverRecords', 'E6', 'type Both(...r, ...s) = Both({ ...r, ...s });'
    + ` fn f(): Int = { let b = Both({ x: 1, y: 2 }); ${bad} };`,
  'Both({ x: 1, y: 2 })']
];

const covered = (source, span) =>
  source.slice(span.start.offset, span.end.offset);
const clash = stableStringify({ eq: [{ base: 'Bool' }, { base: 'Int' }] });

test('every Outside constructor but LocalGeneralization has a fixture',
  () => {
    assert.deepEqual([...new Set(fixtures.map(([kind]) => kind))].sort(),
      ['DataApplication', 'DataOverRecords', 'Deferred', 'EffectArgument',
        'FailFamily', 'HandlerType']);
  });

for (const [kind, rule, written, node] of fixtures) {
  test(`${kind} (${rule}): the marker and the atom beside it`, () => {
    const source = written + main;
    const { problem } = generated(source);
    const markers = problem.outside.filter(entry =>
      entry.origin.rule === rule);
    assert.deepEqual(markers.map(entry => [entry.value, entry.origin.kind,
      covered(source, entry.origin.span)]),
    [[kind, rule === 'E6' ? 'inst' : 'body', node]]);
    const refutable = problem.b.filter(entry =>
      stableStringify(entry.value) === clash);
    assert.deepEqual(refutable.map(entry => entry.origin.rule), ['E7']);
    // Today's checker refuses the same atom.
    assert.deepEqual([phaseOf(source).phase, phaseOf(source).text],
      ['check', 'Expected Int, found Bool']);
  });
}

// E17 and E20 at a parameterised effect: `inst 0` (State's `s`) is a
// variable of the problem, positioned at the node's slot 0.
for (const [rule, at] of [['E17', 1], ['E20', 0]]) {
  test(`${rule}: the effect's inst variables have Slot positions`, () => {
    const [, , written] = fixtures.find(item => item[1] === rule);
    const { problem } = generated(written + main);
    const [marker] = problem.outside.filter(entry =>
      entry.origin.rule === rule);
    const path = marker.origin.atom.path;
    assert.deepEqual(path.steps.slice(0, 2), ['Block', at === 1 ? 'result'
      : 'items']);
    const inst = problem.vars.filter(([variable]) => 'fresh' in variable
      && stableStringify(variable.fresh.path) === stableStringify(path)
      && typeof variable.fresh.role === 'object'
      && 'inst' in variable.fresh.role);
    assert.deepEqual(inst.map(([variable, info]) => [variable.fresh.role,
      info.sort, info.quant, info.position]),
    [[{ inst: 0 }, 'type', 'exists', { slot: [path, 0] }]]);
  });
}
