import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { builtModules, graphFindings, importFindings, reexportFindings }
  from '../scripts/structure.mjs';

// Task 1.1 (T-R0a §3.1, §4.1, §6): only the trusted checkers mint Valid,
// Refuted, NonForced and ForcednessEvidence. Domain.Verdict imports the
// types alone, to re-export them. The untrusted searches, the CX search
// (whose check mints nothing) and `decide` are refused.
const importing = (name, dependency) =>
  graphFindings({ [name]: { path: 'src/x.purs', depends: [dependency] } });

test('only the trusted checkers import Domain.Verdict.Internal', () => {
  const internal = 'Domain.Verdict.Internal';
  for (const name of ['Domain.Verdict', 'Features.Check.Strategy.Substitution',
    'Features.Check.Refute.Rules', 'Features.Check.Admit.Forcedness.Check'])
    assert.deepEqual(importing(name, internal), [], name);
  for (const name of ['Features.Check.Strategy.Online',
    'Features.Check.Strategy.ReadBack', 'Features.Check.Refute.Counter',
    'Features.Check.Decide', 'Features.Check.Strategy',
    'Features.Check.Strategy.SubstitutionX', 'Features.Check.Refute.Rules.X',
    'Features.Check.Admit.Forcedness', 'Domain.Verdict.Admission',
    'Domain.Verdict.Judged', 'Domain.Recorded', 'Format.Diagnostic'])
    assert.deepEqual(importing(name, internal),
      [`${name} imports ${internal}`], name);
});

// BACKLOG R026: a strategy's acceptance, `Certified`, pairs the check's
// `Valid` with the witness the same check built. Only G0's check mints
// it and only its public module reads it; `strategy`, every search, the
// online adapter and `decide` are refused, so no strategy can pair a
// `Valid` with a witness built elsewhere.
test('only G0\'s check and its public module import Certified.Internal',
  () => {
    const internal = 'Domain.Verdict.Certified.Internal';
    for (const name of ['Domain.Verdict.Certified',
      'Features.Check.Strategy.Substitution'])
      assert.deepEqual(importing(name, internal), [], name);
    for (const name of ['Features.Check.Strategy',
      'Features.Check.Strategy.Online', 'Features.Check.Strategy.Witness',
      'Features.Check.Strategy.ReadBack', 'Features.Check.Decide',
      'Features.Check.Elaborate', 'Features.Check.Refute.Rules',
      'Domain.Verdict', 'Domain.Verdict.CertifiedX',
      'Features.Check.Strategy.SubstitutionX'])
      assert.deepEqual(importing(name, internal),
        [`${name} imports ${internal}`], name);
  });

// Only generation builds a recorded problem (T-R0a §2 property 2); the
// public Domain.Recorded imports the type to re-export it. Anchored, so
// Features.Check.GenerateX is outside.
test('only Generate* and Domain.Recorded import Domain.Recorded.Internal',
  () => {
    const internal = 'Domain.Recorded.Internal';
    for (const name of ['Domain.Recorded', 'Features.Check.Generate',
      'Features.Check.Generate.Body', 'Features.Check.Generate.Elab.Internal'])
      assert.deepEqual(importing(name, internal), [], name);
    for (const name of ['Features.Check.GenerateX', 'Features.Check.Decide',
      'Features.Check.Function', 'Features.Check', 'Domain.Verdict',
      'Domain.Recorded.Atom', 'Domain.RecordedX', 'Format.Generate'])
      assert.deepEqual(importing(name, internal),
        [`${name} imports ${internal}`], name);
  });

// Task 5.1 (ruling R7, Task 1.1's TheoremRef ruling): TheoremRef's
// constructor reaches only the hidden registry Refute.Theorems (and
// Domain.Verdict, for the type); SoundRule's only Refute.Rules. Both are
// token modules, so their compiled JS has the same two checks.
test('only the registry and Rules import the Task 5.1 Internal modules',
  () => {
    const cases = [['Domain.Verdict.Theorem.Internal',
      ['Domain.Verdict', 'Features.Check.Refute.Theorems'],
      ['Features.Check.Refute.Rules', 'Features.Check.Decide',
        'Features.Check.Refute.TheoremsX', 'Domain.Verdict.Open']],
    ['Features.Check.Refute.Rules.Internal', ['Features.Check.Refute.Rules'],
      ['Features.Check.Refute.Theorems', 'Features.Check.Decide',
        'Features.Check.Refute.Counter', 'Features.Check.Refute.Project']]];
    for (const [internal, allowed, refused] of cases) {
      const js = `import * as I from "../${internal}/index.js";`;
      for (const name of allowed) {
        assert.deepEqual(importing(name, internal), [], name);
        assert.deepEqual(importFindings({ [name]: js }), [], name);
      }
      for (const name of refused) {
        assert.deepEqual(importing(name, internal),
          [`${name} imports ${internal}`], name);
        assert.deepEqual(importFindings({ [name]: js }),
          [`${name}'s compiled JS imports ${internal}`], name);
      }
      assert.deepEqual(reexportFindings({ 'Features.Check.Refute.Rules':
        `export {\n    X\n} from "../${internal}/index.js";\n` }),
      [`Features.Check.Refute.Rules re-exports { X } from ${internal}`]);
    }
  });

// The re-export boundary is read from purs's output (fix round 2). Each
// probe in test/fixtures/r0/reexport/probes.json is a source purs 0.15.16
// accepted and the index.js it emitted, copied verbatim; P1-P11 are the
// forms re-review 1 found passing the earlier source check. A client
// importing the constructor through each probe compiled too
// (docs/findings.md).
const { probes, inlined } = JSON.parse(readFileSync(
  'test/fixtures/r0/reexport/probes.json', 'utf8'));

test('a JS re-export of a token constructor is a finding, any source form',
  () => {
    for (const probe of probes.filter(probe => probe.name !== 'T0')) {
      const internal = probe.name === 'P11' ? 'Domain.Recorded.Internal'
        : 'Domain.Verdict.Internal';
      const constructor = probe.name === 'P11' ? 'RecordedProblem'
        : probe.name === 'N0' ? 'Refuted' : 'Valid';
      assert.deepEqual(reexportFindings({ [probe.module]: probe.js }),
        [`${probe.module} re-exports { ${constructor} } from ${internal}`],
        probe.name);
    }
  });

// A type-only re-export emits no JS and leaks nothing; the public modules
// re-export that way. Any JS forward from a token module is a finding,
// whoever makes it, including `export *`.
test('type-only re-exports and other modules pass; export * does not', () => {
  const typeOnly = probes.find(probe => probe.name === 'T0');
  assert.deepEqual(reexportFindings({ [typeOnly.module]: typeOnly.js }), []);
  assert.deepEqual(reexportFindings({ 'Features.Check.X':
    'export {\n    left\n} from "../Data.Either/index.js";\n' }), []);
  assert.deepEqual(reexportFindings({ 'Domain.Verdict':
    'export * from "../Domain.Verdict.Internal/index.js";\n' }),
  ['Domain.Verdict re-exports * from Domain.Verdict.Internal']);
});

// Fix round 3: purs inlines a constructor into its client. Behind an
// operator alias (O1) the allowed importer emits nothing at all, and the
// client imports Domain.Verdict.Internal's JS directly; a client of a
// re-export (X0) does the same. Only the allowed importers may.
test('a disallowed module importing a token module\'s JS is a finding',
  () => {
    const js = name => inlined.find(probe => probe.name === name);
    const internal = 'Domain.Verdict.Internal';
    const rules = js('O1');
    assert.doesNotMatch(rules.js, /export|import/);
    assert.deepEqual(reexportFindings({ [rules.module]: rules.js }), []);
    for (const name of ['O1-client', 'X0-client']) {
      const client = js(name);
      assert.deepEqual(reexportFindings({ [client.module]: client.js }), []);
      assert.deepEqual(importFindings({ [client.module]: client.js }),
        [`${client.module}'s compiled JS imports ${internal}`], name);
      // The same JS under an allowed importer's name passes.
      for (const allowed of ['Domain.Verdict', 'Features.Check.Refute.Rules'])
        assert.deepEqual(importFindings({ [allowed]: client.js }), [], name);
    }
    const recorded =
      'import * as R from "../Domain.Recorded.Internal/index.js";';
    assert.equal(importFindings({ 'Features.Check.Decide': recorded }).length,
      1);
    assert.deepEqual(importFindings({ 'Features.Check.Generate.Body': recorded,
      'Domain.Recorded': recorded }), []);
  });

// The public re-exporters import their Internal module (purs emits the
// import even for a type-only re-export) and are allowed to.
test('the built output re-exports and imports no token constructor', () => {
  const modules = builtModules('output');
  assert.ok('Domain.Verdict' in modules && 'Domain.Recorded' in modules);
  assert.match(modules['Domain.Verdict'],
    /from "\.\.\/Domain\.Verdict\.Internal\/index\.js"/);
  assert.deepEqual(reexportFindings(modules), []);
  assert.deepEqual(importFindings(modules), []);
});
