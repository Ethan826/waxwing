import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseOf } from './r0-probe-support.mjs';
import { generatedOrThrow, load, resolved }
  from './r0-generate-support.mjs';

// R0 Task 3.2: `staticRules` (T-R0a §3.2; T-R0b §1, §10), the
// per-declaration static refusals a resolved declaration can break,
// each at the raise site Task 2.3 classified and with that site's
// refusal (test/r0-static.test.mjs pins the classification). Each
// fixture's refusal agrees with today's checker, which stops in check
// with the same code; an arity whose result is instantiated is
// semantic and gives none. Run before generation only from Task 4.6.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');

const prelude = 'fn inc(n: Int): Int = n + 1;\nfn id(n: x): x = n;\n'
  + 'type Box(a) = Box(a);\n';
const main = '\nfn main(): Int = 1;';
const stepsOf = path => path.steps.map(step => step.value0);
const rules = source => {
  const program = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.flatMap(decl =>
    generatedOrThrow(Generate.staticRules(tables)(signatures)(decl),
      decl.name).map(refusal =>
      [decl.name, refusal.constructor.name, refusal.value0.constructor.name,
        refusal.value1.root.constructor.name, stepsOf(refusal.value1)]));
};
const arity = (steps = []) =>
  [['f', 'StaticRule', 'StaticArity', 'InBody', steps]];

// [site, source, today's code, the refusals]
const cases = [
  ['Pipe.purs:33, a saturated call of a fixed result',
    'fn f(): Int = 1 |> inc(2);' + main, 'E_ARITY', arity()],
  ['Call.purs:144, over-applied at a fixed result',
    'fn f(): Int = inc(1, 2);' + main, 'E_ARITY', arity()],
  ['Call.purs:144, an over-applied constructor',
    'fn f(): Int = { Box(1, 2); 1 };' + main, 'E_ARITY',
    arity(['Block', 'items', 0, 'Discard', 'value'])],
  ['Call.purs:123, no argument to a callee with parameters',
    'fn f(): Int = inc();' + main, 'E_ARITY', arity()],
  ['Show.purs:27', 'fn f(): Text = show(1, 2);' + main, 'E_ARITY',
    arity()],
  ['Operation.purs:64', 'fn f(): Unit with Console = '
    + 'Console.print(1, 2);' + main, 'E_ARITY', arity()],
  ['Operation.purs:104', 'fn f(): Int = crash(1, 2);' + main, 'E_ARITY',
    arity()],
  ['Outcomes.purs:136, main\'s result holds a function',
    'fn main(): (Int) -> Int = fn(x) => x;', 'E_ENTRY',
    [['main', 'StaticRule', 'StaticEntry', 'InResult', []]]],
  ['Pipe.purs:36, an instantiated result: semantic, no static refusal',
    'fn f(): Int = 1 |> id(2);' + main, 'E_ARITY', []]
];

test('each static site is found where today\'s checker raises it', () => {
  for (const [site, source, code, wanted] of cases) {
    const today = phaseOf(prelude + source);
    assert.deepEqual([today.phase, today.code], ['check', code], site);
    assert.deepEqual(rules(prelude + source), wanted, site);
  }
});

test('a program today accepts has no static refusal', () => {
  const source = prelude + 'fn f(): Int = inc(1) |> id;' + main;
  assert.equal(phaseOf(source).phase, 'compiled');
  assert.deepEqual(rules(source), []);
});
