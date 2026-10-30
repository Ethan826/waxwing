import assert from 'node:assert/strict';

// FX009: a Fail payload without a family key is E_TYPE at the annotation
// (or clause payload) itself; `fragment` is where it is written.
const keyless = (label, source, fragment) => ({ compile, Left, wire }) => {
  const result = compile(source);
  assert.ok(result instanceof Left, `Fail family (${label}): accepted`);
  const found = wire(result.value0);
  assert.equal(found.code, 'E_TYPE', `Fail family (${label}): wrong code`);
  assert.equal(found.span.start.offset, source.indexOf(fragment),
    `Fail family (${label}): wrong span`);
};
const caller = 'type E = E; fn g(h: Int -> Unit with Fail(P)): Unit = h(1); '
  + 'fn main(): Unit with Console = g(fn(n: Int) => Fail.fail(E));';

export const task5Probes = {
  'signature-fail': keyless('variable', caller.replace('P', 'a'), 'Fail(a)'),
  'keyless-fail': keyless('function', caller.replace('P', 'Int -> Int'),
    'Fail(Int -> Int)'),
  'clause-fail': keyless('clause',
    'fn main(): Int = handle 0 { fail(e: Int -> Int) => 1 };', 'Int -> Int')
};
