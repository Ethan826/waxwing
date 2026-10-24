import test from 'node:test';
import assert from 'node:assert/strict';
import { named, sourceRows } from './r0-elab-corpus-run.mjs';
import { load, resolved, rightOrThrow } from './r0-generate-support.mjs';

// R0 Task 7.1b review, Minor 3: a builtin applied to other than one
// argument gets a placeholder node, the unit value applied to the
// arguments (Generate/Builtin.purs `called`), which is ill-typed. Such
// a call must have its static refusal (`StaticArity`, the guard once
// Task 4.6 runs the static rules first) and must reach no
// `Elaborated` through `decide` and `elaborate` (the corpus run's
// pipeline, test/r0-elab-corpus-run.mjs). A one-argument call is the
// control: it elaborates and has no static refusal.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const main = '\nfn main(): Int = 1;';
const printCall = 'fn f(): Unit with Console = Console.print';
const offCount = ['fn f(): Text = show(1, 2);', 'fn f(): Text = show();',
  `${printCall}(1, 2);`, `${printCall}();`, 'fn f(): Int = crash(1, 2);',
  'fn f(): Int = crash();'];

const staticCodes = source => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  return rightOrThrow(Generate.staticRules(tables)(signatures)(
    program.functions[0]), 'f').map(refusal => named(refusal.value0));
};

const elaboratedOf = source => {
  const [row] = sourceRows({ origin: 'inline', source });
  assert.equal(row.fault, undefined, `${source}: a generation fault`);
  return row.elaborated === null ? null : named(row.elaborated);
};

test('a builtin of another arity is refused and never elaborated', () => {
  for (const body of offCount) {
    assert.deepEqual(staticCodes(body + main), ['StaticArity'], body);
    assert.equal(elaboratedOf(body + main), null, body);
  }
});

test('control: a one-argument builtin elaborates', () => {
  for (const body of ['fn f(): Text = show(1);', `${printCall}(1);`]) {
    assert.deepEqual(staticCodes(body + main), [], body);
    assert.equal(elaboratedOf(body + main), 'Elaborated', body);
  }
});
