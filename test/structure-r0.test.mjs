import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { builtModules, graphFindings, reexportFindings }
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

// The re-export boundary is read from purs's output (fix round 2). Each
// probe in test/fixtures/r0/reexport/probes.json is a source purs 0.15.16
// accepted and the index.js it emitted, copied verbatim; P1-P11 are the
// forms re-review 1 found passing the earlier source check. A client
// importing the constructor through each probe compiled too
// (docs/findings.md).
const { probes } = JSON.parse(readFileSync(
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

test('the built output re-exports no token constructor', () => {
  const modules = builtModules('output');
  assert.ok('Domain.Verdict' in modules && 'Domain.Recorded' in modules);
  assert.match(modules['Domain.Verdict'],
    /from "\.\.\/Domain\.Verdict\.Internal\/index\.js"/);
  assert.deepEqual(reexportFindings(modules), []);
});
