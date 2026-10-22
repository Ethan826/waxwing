import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixturesIn, refusalOf } from './r0-probe-support.mjs';
import { filesUnder } from '../scripts/structure.mjs';

// Task 0.5 (gates G-effects, G-coverage): which effect, handler and
// coverage refusals, `AmbiguousType` and arity read a type the online
// solver bound. Each fixture is one variant of a program: the record
// part `inferred` (a lambda parameter the solver binds), `pinned` by
// annotation, or a `control`. Classes and their reading:
// docs/findings.md, "Effect and coverage audit". A characterization:
// it decides nothing and changes no diagnostic.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = fixturesIn('r0/audit');
const outcome = f => ({ phase: f.phase, code: f.code, text: f.text,
  at: f.at, notes: f.notes });
// The class tests read today's outcomes, not the recorded ones.
const live = new Map(fixtures.map(f => [f.name, refusalOf(f.source)]));
const now = f => live.get(f.name);
const same = (a, b) => JSON.stringify(now(a)) === JSON.stringify(now(b));
const rows = () => {
  const found = new Map();
  for (const f of fixtures) {
    const site = `${f.refusal} ${f.site}`;
    found.set(site, [...(found.get(site) ?? []), f]);
  }
  return [...found.values()];
};

test('every audit fixture gives its recorded refusal', () => {
  assert.equal(fixtures.length, 52);
  for (const f of fixtures)
    assert.deepEqual(now(f), outcome(f), f.name);
});

// The table's rows: every E_EFFECT and E_HANDLER constructor of
// Format/Diagnostic/Code.purs, and the brief's others, has a fixture.
test('every audited refusal has a row', () => {
  const code = readFileSync(join(root,
    'src/Format/Diagnostic/Code.purs'), 'utf8');
  const listed = [...code.matchAll(
    /^ {2}(\w+)\b[^\n]*→ Code\.(EffectError|HandlerError)$/gm)]
    .map(match => match[1]);
  assert.equal(listed.length, 14);
  const audited = new Set(fixtures.map(f => f.refusal));
  for (const name of [...listed, 'FailNeedsConcrete', 'RedundantArm',
    'NonExhaustive', 'AmbiguousType', 'Arity'])
    assert.ok(audited.has(name), name);
});

// Re-derivable: the cited line still holds the cited token (the
// refusal's constructor, or the predicate an arity row reads).
test('every cited site holds its token', () => {
  for (const f of fixtures) {
    const [file, line] = f.site.split(':');
    const text = readFileSync(join(root, file), 'utf8').split('\n');
    assert.ok(text[Number(line) - 1].includes(f.token), f.name);
  }
});

// Semantic: the refusal is raised by some variant, and the variants do
// not all agree, so the outcome follows what the record part is.
test('a semantic row has variants that differ', () => {
  for (const variants of rows().filter(r => r[0].class === 'semantic')) {
    const name = variants[0].name;
    assert.ok(variants.length >= 2, name);
    assert.ok(variants.some(f => now(f).phase === 'check'), name);
    assert.ok(variants.some(f => !same(f, variants[0])), name);
  }
});

// Structural: raised by Resolve, before any solver exists, or the same
// refusal whatever the record part is.
test('a structural row is resolve-time or agrees across variants', () => {
  for (const variants of rows().filter(r => r[0].class === 'structural')) {
    const raised = variants.filter(f => f.name.split('/')[1] !== 'control');
    const first = raised[0];
    const resolved = raised.every(f => now(f).phase === 'resolve');
    assert.ok(resolved || raised.length >= 2, first.name);
    for (const f of raised) {
      assert.equal(now(f).code, now(first).code, f.name);
      assert.equal(now(f).text, now(first).text, f.name);
    }
  }
});

// What makes a Resolve-time row structural: no module Features.Resolve
// reaches, by imports, is the online solver's state or unifier.
const solver = /^Features\.Check\.(Scheme|Subst|Unify|Infer|Context)$/;
const importsOf = source => [...source.matchAll(/^import (\S+)/gm)]
  .map(match => match[1]);
test('Features.Resolve imports none of the online solver', () => {
  const modules = new Map();
  for (const file of filesUnder(join(root, 'src'))) {
    if (!file.endsWith('.purs')) continue;
    const source = readFileSync(file, 'utf8');
    const name = source.match(/^module (\S+)/m)[1];
    modules.set(name, importsOf(source));
  }
  const seen = new Set(['Features.Resolve']);
  const pending = ['Features.Resolve'];
  while (pending.length > 0) {
    for (const next of modules.get(pending.pop()) ?? []) {
      if (!modules.has(next) || seen.has(next)) continue;
      seen.add(next);
      pending.push(next);
    }
  }
  assert.ok(seen.size > 10);
  assert.deepEqual([...seen].filter(name => solver.test(name)), []);
});

// The defect found on the way (BACKLOG FX010): the pinned variant
// reaches Reject.purs's catch-all; recorded, not fixed (live checker).
test('FX010: a pinned record payload reaches the internal catch-all', () => {
  const pinned = now({ name: 'fx010-record-payload/pinned' });
  assert.equal(pinned.code, 'E_INTERNAL');
  assert.equal(pinned.text, 'Effect row consumption failed');
});
