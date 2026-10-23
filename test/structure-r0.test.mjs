import test from 'node:test';
import assert from 'node:assert/strict';
import { graphFindings, exportFindings } from '../scripts/structure.mjs';

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

const verdict = 'src/Domain/Verdict.purs';
const header = (name, exports) => `module ${name} (${exports}) where\n\n`;
const publicWith = imports =>
  header('Domain.Verdict', 'module Exports, Solution')
  + `import Prelude\n${imports}\n\ntype Solution = Int\n`;

test('Domain.Verdict re-exports bare token types, no constructor', () => {
  assert.deepEqual(exportFindings(verdict, publicWith(
    'import Domain.Verdict.Internal (Valid, Refuted) as Exports')), []);
  assert.deepEqual(exportFindings(verdict, publicWith(
    'import Domain.Verdict.Internal\n  ( Valid\n  , Refuted\n  ) as Exports')),
  []);
  for (const imports of [
    'import Domain.Verdict.Internal (Valid(..), Refuted) as Exports',
    'import Domain.Verdict.Internal\n  ( Valid\n  , Refuted(Refuted)\n  )'
      + ' as Exports',
    'import Domain.Verdict.Internal (Valid, mint) as Exports',
    'import Domain.Verdict.Internal as Exports',
    'import Domain.Verdict.Internal hiding (mint) as Exports',
    // not re-exported, but a wrapper could still leak the constructor
    'import Domain.Verdict.Internal (Valid(..))'
  ]) assert.equal(exportFindings(verdict, publicWith(imports)).length, 1,
    imports);
});

test('Domain.Recorded re-exports RecordedProblem without its constructor',
  () => {
    const source = imports => header('Domain.Recorded', 'module Exports')
      + `${imports}\n`;
    const file = 'src/Domain/Recorded.purs';
    assert.deepEqual(exportFindings(file, source(
      'import Domain.Recorded.Internal (RecordedProblem) as Exports')), []);
    assert.equal(exportFindings(file, source(
      'import Domain.Recorded.Internal (RecordedProblem(..)) as Exports'))
      .length, 1);
  });

// A trusted checker may use the constructors but never re-export them.
test('no other module re-exports a token Internal module', () => {
  const rules = 'src/Features/Check/Refute/Rules.purs';
  const name = 'Features.Check.Refute.Rules';
  const own = 'import Domain.Verdict.Internal (Refuted(..))';
  assert.deepEqual(exportFindings(rules,
    header(name, 'checkDerivation') + own + '\n'), []);
  for (const source of [
    header(name, 'module X') + own + ' as X\n',
    header(name, 'module X')
      + 'import Domain.Verdict.Internal (Refuted) as X\n',
    header(name, 'module Domain.Verdict.Internal') + own + '\n',
    header('Features.Check.Generate', 'module R')
      + 'import Domain.Recorded.Internal (RecordedProblem) as R\n'
  ]) assert.equal(exportFindings(rules, source).length, 1, source);
});
