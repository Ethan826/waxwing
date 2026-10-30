import test from 'node:test';
import assert from 'node:assert/strict';
import { load, resolved } from './r0-generate-support.mjs';
import { describe } from './r0-decide-support.mjs';
import { onlineFrom } from './r0-online-support.mjs';

// §18.124 ruling 3 (FX032): whether an operation's `with` row was
// written is kept apart from whether it resolved, so a row that fails
// to resolve still records `Unsupported`. Data only: resolving still
// refuses nothing new.
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Recorded = await load('Domain.Recorded');
const Elaborating = await load('Domain.Elaborating');
const online = await onlineFrom(load);

const state = 'effect State(s) { fn get(): s; fn put(value: s): Unit; }; ';
const log = 'effect Log { fn log(n: Int): Unit; }; ';
const rows = {
  unknown: 'Nope',
  arity: 'State',
  spread: 'Log + ...e'
};
const program = (row, tail) => `${state}${log}`
  + `effect Op { fn op(): Int with ${row}; fn plain(): Int; }; ${tail} `
  + 'fn main(): Unit = ();';
const g = 'fn g(): Int with Op = Op.op(); fn h(): Int with Op = Op.plain();';

const kinds = (source, name) => {
  const parsed = resolved(source);
  const { tables, signatures } = Inputs.generationInputs(parsed);
  const decl = parsed.functions.find(item => item.name === name);
  return Recorded.fields(Elaborating.problem(
    Generate.generate(tables)(signatures)(decl).value0)).effects
    .obligations.filter(item => item.value.constructor.name === 'Unsupported');
};

test('an unresolvable written row still records Unsupported', () => {
  for (const [name, row] of Object.entries(rows)) {
    const source = program(row, g);
    assert.equal(kinds(source, 'g').length, 1, `${name}: g`);
    assert.equal(kinds(source, 'h').length, 0, `${name}: control h`);
  }
});

test('and its online decision is never Solved', () => {
  for (const [name, row] of Object.entries(rows)) {
    const source = program(row, g);
    const found = describe(online.decisionOf(online.programOf(source), 'g'));
    assert.match(found.verdict, /^Unresolved Unsupported EffectsUnchecked/,
      name);
    const control = describe(online.decisionOf(online.programOf(source),
      'h'));
    assert.equal(control.verdict, 'Solved', `${name}: control`);
  }
});

// §18.124 ruling 4: a `with` over a handler whose marked type is not an
// `MHandler` records an explicit UnframedInstall restriction at the
// `with`'s path, so the incomplete ambient row is never Solved.
const unframed = `${log}fn f(b: Bool, h: Handler(Log)): Unit = `
  + '{ let k = if b then h else h; with k { Log.log(1) } }; '
  + 'fn framed(h: Handler(Log)): Unit = with h { Log.log(1) }; '
  + 'fn main(): Unit = ();';

test('a with over a non-MHandler records UnframedInstall', () => {
  const [found, extra] = kinds(unframed, 'f');
  assert.ok(found, 'no restriction recorded');
  assert.equal(extra, undefined);
  assert.equal(found.value.value0.constructor.name, 'UnframedInstall');
  assert.equal(found.provenance.value0.role.constructor.name,
    'UnframedWith');
  assert.equal(kinds(unframed, 'framed').length, 0, 'control: an MHandler');
});

test('its decision is EffectsUnchecked, never Solved', () => {
  const decision = name => describe(online.decisionOf(
    online.programOf(unframed), name));
  // Every `with` also carries Outside HandlerType (E21), so match the
  // restriction itself rather than the whole reason.
  assert.match(decision('f').verdict,
    /^Unresolved Unsupported .*EffectsUnchecked \[UnframedInstall\]$/);
  assert.doesNotMatch(decision('framed').verdict, /UnframedInstall/);
});
