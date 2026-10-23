import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// R0 Task 2.1 (AT16, first half): `classify` names a class for every
// `Failure` constructor, injected directly, since generated programs
// rarely reach the stops (docs/engineering.md "Result boundary
// classification"). It is built on RowOutcome's `classified`, and the
// two agree on every arm. Payloads a class does not read are `null`.
const output = pathToFileURL(resolve(process.env.WAXWING_OUTPUT ?? 'output'));
const load = name => import(`${output.href}/${name}/index.js`);
const failures = await load('Features.Check.UnifyFailure');
const { classify } = await load('Features.Check.Classify');
const { classified } = await load('Features.Check.RowOutcome');
const { inferredTypeLimit } = await load('Features.Check.Binding');
const { Nothing } = await load('Data.Maybe');
const { TInt, TBool } = await load('Domain.Type.Core');
const { LabelAtom } = await load('Features.Check.Atom');

const cause = { predicate: 3, at: Nothing.value, within: Nothing.value };
const lack = { variable: 'r', span: null };
const mismatch = new failures.Mismatch(TInt.value, TBool.value);

// Each of the 15 constructors, by name, with its expected class.
const injected = [
  ['Mismatch', mismatch, 'AsMismatch'],
  ['Occurs', new failures.Occurs(1, TInt.value), 'AsMismatch'],
  ['TooDeep', failures.TooDeep.value, 'AsLimit'],
  ['RowMissing', new failures.RowMissing(null, null, null), 'AsMismatch'],
  ['RowExtra', new failures.RowExtra(null, null, null), 'AsMismatch'],
  ['RowPayload', new failures.RowPayload(null, null, null), 'AsMismatch'],
  ['RowSharedTail', new failures.RowSharedTail(null, null), 'AsMismatch'],
  ['RowMismatch', new failures.RowMismatch(null, null), 'AsMismatch'],
  ['RowOccurs', new failures.RowOccurs(1, TInt.value), 'AsMismatch'],
  ['Refused', new failures.Refused(new failures.Forbidden('a', lack)),
    'AsMismatch'],
  ['Placeholder', new failures.Placeholder('later'), 'AsPlaceholder'],
  ['Unexpected', new failures.Unexpected('broken'), 'AsFault'],
  ['FromMerge', new failures.FromMerge(cause, mismatch), 'AsHint'],
  ['Exhausted', new failures.Exhausted('bound'), 'AsFault'],
  // Made only inside `FromMerge`, so bare it is a broken invariant.
  ['Homeless', new failures.Homeless(new LabelAtom('x')), 'AsFault']
];

test('every Failure constructor is injected once', () => {
  const names = Object.keys(failures).filter(name =>
    typeof failures[name] === 'function' && name[0] === name[0].toUpperCase()
    && failures[name].prototype !== undefined
    && !['Forbidden', 'Overlap', 'MayHold', 'Unproven', 'Twice']
      .includes(name));
  assert.deepEqual(injected.map(([name]) => name).sort(), names.sort());
  assert.equal(injected.length, 15);
});

test('each constructor injected directly has its class', () => {
  for (const [name, failure, wanted] of injected)
    assert.equal(classify(failure).constructor.name, wanted, name);
});

test('the payloads: the depth limit, the fault text, the placeholder',
  () => {
    const limit = classify(failures.TooDeep.value).value0;
    assert.equal(limit.constructor.name, 'InferredTypeDepth');
    assert.equal(limit.value0, inferredTypeLimit);
    for (const name of ['Unexpected', 'Exhausted']) {
      const fault = classify(new failures[name]('text')).value0;
      assert.equal(fault.constructor.name, 'BrokenInvariant', name);
      assert.equal(fault.value0, 'text', name);
    }
    assert.equal(classify(new failures.Placeholder('later')).value0, 'later');
  });

// T-R0a §10: a predicate's contradiction (D6) becomes a hint; what a
// predicate caused keeps its inner failure's class when that is a stop.
test('a predicate\'s failure: a hint, or its inner stop', () => {
  const bare = classify(new failures.Homeless(new LabelAtom('x'))).value0;
  assert.equal(bare.constructor.name, 'BrokenInvariant');
  assert.equal(bare.value0, 'H\'s refusal outside a predicate');
  const hint = classify(new failures.FromMerge(cause, mismatch)).value0;
  assert.equal(hint.cause, cause);
  assert.equal(hint.found, mismatch);
  for (const [inner, wanted] of [[failures.TooDeep.value, 'AsLimit'],
    [new failures.Unexpected('broken'), 'AsFault'],
    [new failures.Exhausted('bound'), 'AsFault'],
    [new failures.Placeholder('later'), 'AsPlaceholder'],
    [new failures.FromMerge(cause, mismatch), 'AsHint'],
    [new failures.Homeless(new LabelAtom('x')), 'AsHint']]) {
    const found = classify(new failures.FromMerge(cause, inner));
    assert.equal(found.constructor.name, wanted, inner.constructor.name);
  }
});

// One classifier: each class is the image of `classified`'s.
const stopOf = { AsLimit: 'Limit', AsFault: 'Internal',
  AsPlaceholder: 'Unfinished' };
test('classify agrees with RowOutcome.classified on every arm', () => {
  for (const [name, failure] of injected) {
    const mine = classify(failure).constructor.name;
    const theirs = classified(failure);
    if (theirs.constructor.name === 'Right') {
      assert.ok(['AsHint', 'AsMismatch'].includes(mine), name);
    } else {
      assert.equal(theirs.value0.constructor.name, stopOf[mine], name);
    }
  }
});

// Ruling R3: `Internal` carries a kind that is never rendered. Each kind
// renders as its text alone, with today's code.
const problems = await load('Domain.Problem');
const { wire } = await load('Format.Diagnostic');
const kinds = ['LaterWork', 'RuleBroken', 'BoundPassed', 'BodyState',
  'Unrendered', 'TableLookup', 'InputShape', 'PassInvariant'];
const span = { start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 2, offset: 1 } };

test('every internal kind renders as today: E_INTERNAL and the text', () => {
  for (const kind of kinds) {
    const problem = problems.Internal.create(problems[kind].value)('Broken');
    assert.deepEqual(wire({ problem, span, related: [] }),
      { code: 'E_INTERNAL', message: 'Broken', span, related: [] }, kind);
  }
});

// Each kind from a site that makes it, the failure injected directly.
const kindOf = problem => {
  assert.equal(problem.constructor.name, 'Internal');
  return [problem.value0.constructor.name, problem.value1];
};
const { rejected } = await load('Features.Check.Reject');
const { placeholderAt } = await load('Features.Check.Placeholder');
const { missing } = await load('Features.Check.Filing');
const { typeInfo } = await load('Features.Check.Tables');
const { fieldTypes, HCtor } = await load('Features.Check.Signature');
const { column, Any } = await load('Features.Check.Matrix');

test('the renderers\' stops: a rule broken, a bound passed, no text', () => {
  const reject = failure => kindOf(rejected({})({})({ span })(failure)
    .value0.problem);
  assert.deepEqual(reject(new failures.Unexpected('broken')),
    ['RuleBroken', 'broken']);
  assert.deepEqual(reject(new failures.Exhausted('bound')),
    ['BoundPassed', 'bound']);
  for (const failure of [failures.TooDeep.value,
    new failures.Occurs(1, TInt.value), new failures.RowOccurs(1, TInt.value)])
    assert.deepEqual(reject(failure),
      ['Unrendered', 'Effect row consumption failed'],
      failure.constructor.name);
  assert.deepEqual(reject(new failures.Homeless(new LabelAtom('x'))),
    ['RuleBroken', 'Effect row consumption failed']);
});

test('later work, body state, a table, input shape, a pass', () => {
  assert.deepEqual(kindOf(placeholderAt(span)('x').problem),
    ['LaterWork', 'R005B placeholder: x']);
  assert.deepEqual(kindOf(missing({ handler: span }).value0.problem),
    ['BodyState', 'Clause without a group']);
  assert.deepEqual(kindOf(typeInfo([])(0).value0),
    ['TableLookup', 'Invalid type id']);
  const head = new HCtor(0);
  assert.deepEqual(kindOf(fieldTypes({ ctors: [{ fields: [] }] })(TInt.value)(
    head).value0), ['InputShape',
    'Constructor head on a type that is not data']);
  assert.deepEqual(kindOf(column([])([Any.value]).value0),
    ['PassInvariant', 'Coverage vector length mismatch']);
});

// A live-checker defect the review of Record.purs's former catch-all
// found (BACKLOG R020; docs/findings.md, R0 Task 2.1), pinned, not fixed:
// a field selection that breaks a disjointness fact (`Refused Overlap`)
// is reported as a missing field, without the fact, where a call breaking
// the same fact gets D2's text.
test('pinned R020: a broken disjointness at a selection reads as missing',
  async () => {
    const { compile } = await load('Program.Compile');
    const pair = 'fn pair(a: { ...r }, b: { ...s }): Int where r disjoint s'
      + ' = 0;\n';
    const first = 'fn first(a: { ...r }, b: { ...s }): { ...r } where r '
      + 'disjoint s = a;\n';
    const selected = compile(pair + 'fn main(): Int = {\n  let f = fn(p, q)'
      + ' => { let v = q.x; let u = pair(p, q); p.x };\n  0\n};');
    assert.equal(wire(selected.value0).message, 'x is not a field of { ..._ }');
    const called = compile(first
      + 'fn main(): Int = first({ x: 1 }, { x: 2 }).x;');
    assert.equal(wire(called.value0).message,
      'Field x is in both records: r disjoint s');
  });
