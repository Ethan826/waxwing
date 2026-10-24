import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { graphFindings, pursGraph } from '../scripts/structure.mjs';
import { declarationOf, pinnedExports, pinnedFindings,
  reexportSourceFindings } from '../scripts/structure-elab.mjs';

// R0 Task 7.1a, D1 spec §3.1 rules E1-E6 and T3b: one finding per rule.
// Imports are read from purs's graph; re-exports (E6) from the source,
// since `purs graph` does not show what a module re-exports.
const importing = (name, dependency) =>
  graphFindings({ [name]: { path: 'src/x.purs', depends: [dependency] } });
const refused = (name, dependency) =>
  assert.deepEqual(importing(name, dependency),
    [`${name} imports ${dependency}`], `${name} → ${dependency}`);
const allowed = (name, dependency) =>
  assert.deepEqual(importing(name, dependency), [], `${name} → ${dependency}`);

test('E1: only Elaborate imports Domain.Elaborating.Build', () => {
  allowed('Features.Check.Elaborate', 'Domain.Elaborating.Build');
  for (const name of ['Features.Check.Decide', 'Features.Check.ElaborateX',
    'Features.Check.Generate.Elab', 'Domain.Elaborating'])
    refused(name, 'Domain.Elaborating.Build');
});

test('E2: Elaborating\'s constructor reaches three modules', () => {
  for (const name of ['Domain.Elaborating', 'Domain.Elaborating.Build',
    'Features.Check.Generate.Elab'])
    allowed(name, 'Domain.Elaborating.Internal');
  for (const name of ['Features.Check.Elaborate', 'Features.Check.Generate',
    'Features.Check.Generate.Gen', 'Domain.ElaboratingX'])
    refused(name, 'Domain.Elaborating.Internal');
});

test('E3: every Generate.* module is importable by Generate* only', () => {
  for (const helper of ['Features.Check.Generate.Elab',
    'Features.Check.Generate.Inputs', 'Features.Check.Generate.Fault',
    'Features.Check.Generate.Gen']) {
    allowed('Features.Check.Generate', helper);
    allowed('Features.Check.Generate.Body', helper);
    for (const name of ['Features.Check.Function', 'Features.Check.GenerateX',
      'Features.Check.Decide.Shadow', 'Features.Check.Strategy.Online'])
      refused(name, helper);
  }
  // The public module stays importable from Features on.
  allowed('Features.Check.Decide.Shadow', 'Features.Check.Generate');
});

test('E4: Generate.Elab.Internal reaches Generate.Elab and .Gen only', () => {
  const internal = 'Features.Check.Generate.Elab.Internal';
  allowed('Features.Check.Generate.Elab', internal);
  allowed('Features.Check.Generate.Gen', internal);
  for (const name of ['Features.Check.Generate', 'Features.Check.Generate.Body',
    'Features.Check.Generate.Elab.Labels', 'Features.Check.Elaborate'])
    refused(name, internal);
});

test('E5: Judged\'s constructor reaches Judged and Decide only', () => {
  const internal = 'Domain.Verdict.Judged.Internal';
  allowed('Domain.Verdict.Judged', internal);
  allowed('Features.Check.Decide', internal);
  for (const name of ['Domain.Recorded', 'Features.Check.Elaborate',
    'Features.Check.Decide.Shadow', 'Domain.Verdict'])
    refused(name, internal);
  // Task 1.1's tokens stay with the trusted checkers.
  refused('Features.Check.Decide', 'Domain.Verdict.Internal');
});

test('S10: no Runtime module imports Elaborating or Generate*', () => {
  for (const dependency of ['Domain.Elaborating', 'Domain.Elaborating.Types',
    'Features.Check.Generate', 'Features.Check.Generate.Gen'])
    assert.ok(importing('Runtime.Node', dependency).some(found =>
      found === `Runtime.Node imports ${dependency}`), dependency);
});

const header = (name, exports, imports) =>
  `module ${name}\n  ( ${exports.join('\n  , ')}\n  ) where\n\n`
  + `${imports.join('\n')}\n`;
const e6 = (name, exports, imports) =>
  reexportSourceFindings({ [`src/${name}.purs`]: header(name, exports,
    imports) });

test('E6: the allowed form passes, each other form is a finding', () => {
  assert.deepEqual(e6('Domain.Elaborating', ['module Exports', 'problem'],
    ['import Domain.Elaborating.Internal (Elaborating) as Exports']), []);
  const cases = [
    ['Features.Check.Generate', ['generate',
      'module Features.Check.Generate.Elab'],
    ['import Features.Check.Generate.Elab']],
    ['Domain.Elaborating', ['module Exports'],
      ['import Domain.Elaborating.Internal (Elaborating(..)) as Exports']],
    ['Domain.Elaborating', ['module Exports'],
      ['import Domain.Elaborating.Internal as Exports']],
    ['Domain.Elaborating', ['module Exports'],
      ['import Domain.Elaborating.Internal (Elaborating) as Exports',
        'import Domain.Elaborating.Build (build) as Exports']],
    ['Features.Check.Decide', ['module Exports'],
      ['import Domain.Recorded.Internal (RecordedProblem) as Exports']],
    ['Domain.Elaborating', ['module Exports'],
      ['import Domain.Elaborating.Internal hiding (x) as Exports']]];
  for (const [name, exports, imports] of cases)
    assert.equal(e6(name, exports, imports).length, 1,
      `${name}: ${imports.join('; ')}`);
  // The stated exceptions: Ref(..) and GenTy; Tables and Signatures.
  assert.deepEqual(e6('Features.Check.Generate.Elab', ['module Exports'],
    ['import Features.Check.Generate.Elab.Internal\n  ( Elab\n  , GenTy\n'
      + '  , Handle\n  , Ref(..)\n  ) as Exports']), []);
  assert.deepEqual(e6('Features.Check.Generate', ['module Exports'],
    ['import Features.Check.Generate.Inputs (Signatures, Tables) as Exports']),
  []);
});

test('the pinned export lists match the tree; an added export fails', () => {
  const sources = Object.fromEntries(Object.keys(pinnedExports).map(name =>
    [name, readFileSync(`src/${name.split('.').join('/')}.purs`, 'utf8')]));
  assert.deepEqual(pinnedFindings(sources), []);
  for (const name of Object.keys(pinnedExports)) {
    const grown = sources[name].replace(/\)\s*where/, ', mkThing ) where');
    assert.notEqual(grown, sources[name], name);
    assert.equal(pinnedFindings({ ...sources, [name]: grown }).length, 1,
      name);
  }
  // A widened alias import is a finding too.
  const elab = 'Features.Check.Generate.Elab';
  const widened = sources[elab].replace('  , Ref(..)\n  ) as Exports',
    '  , Ref(..)\n  , Gen\n  ) as Exports');
  assert.notEqual(widened, sources[elab]);
  assert.equal(pinnedFindings({ ...sources, [elab]: widened }).length, 1);
  assert.deepEqual(pinnedExports['Features.Check.Generate'].exports.filter(
    entry => entry === 'emptyProblem'), []);
});

// Review of 7.1a (Important 1): a header comment saying " where" must
// not hide the declaration from E6.
test('E6 reads past a header comment that says where', () => {
  const comment = '-- what build may read, where it reads them\n';
  const widened = header('Domain.Elaborating', ['module Exports'],
    ['import Domain.Elaborating.Internal (Elaborating(..)) as Exports']);
  assert.equal(reexportSourceFindings({ 'src/Domain/Elaborating.purs':
    comment + widened }).length, 1);
});

// BACKLOG R027 (a): block comments are read past, and an import the
// scan still cannot read is a finding, never skipped (the review hid a
// constructor re-export behind `{- x -}`).
test('E6 reads past block comments; an unread import is a finding', () => {
  const widened = (imports, exports = ['module Exports']) => e6(
    'Domain.Elaborating', exports, imports).length;
  const constructor = '(Elaborating(..))';
  assert.equal(widened([`import Domain.Elaborating.Internal {- x -}`
    + ` ${constructor} as Exports`]), 1);
  assert.equal(widened([`import Domain.Elaborating.Internal ${constructor}`
    + ' {- x -} as Exports']), 1);
  assert.equal(widened(['import Domain.Elaborating.Internal (Elaborating)'
    + ' as Exports', `import Domain.Elaborating.Internal {- (a) -}`
    + ` ${constructor} as Exports`]), 1);
  assert.equal(widened(['import Domain.Elaborating.Internal {- x -}'
    + ' (Elaborating) as Exports']), 0);
  // Unreadable even without a re-export: still a finding.
  assert.equal(widened(['import Domain.Elaborating.Internal ((x) as Exports'],
    ['problem']), 1);
});

// Review of the repairs (P3-1, P3-9): `Certified`'s constructor cannot
// leave by re-export, and a header E6 cannot read is a finding.
test('E6 covers Certified.Internal; an unreadable header is a finding',
  () => {
    const certified = imports => e6('Domain.Verdict.Certified',
      ['module Exports'], imports).length;
    assert.equal(certified(['import Domain.Verdict.Certified.Internal'
      + ' (Certified) as Exports']), 0);
    assert.equal(certified(['import Domain.Verdict.Certified.Internal'
      + ' (Certified(..)) as Exports']), 1);
    assert.deepEqual(reexportSourceFindings({ 'src/X.purs':
      'module X (module Exports)\nimport Y as Exports\n' }),
    ['src/X.purs: a module header E6 cannot read']);
  });

test('the real tree has no E6 finding; every declaration is read', () => {
  assert.deepEqual(reexportSourceFindings(), []);
  const sources = Object.fromEntries(readdirSync('src', { recursive: true })
    .filter(file => file.endsWith('.purs')).map(file =>
      [file, readFileSync(`src/${file}`, 'utf8')]));
  assert.ok(Object.keys(sources).length > 400);
  for (const [file, source] of Object.entries(sources))
    assert.notEqual(declarationOf(source), null, file);
});

// T10, T-R0b §4's applicative invariant, transitively: the import
// closure of every Features.Check.Generate* module reaches no module of
// Features, Format, Program or Runtime outside the generator's own, the
// moved `holes` module and the named pure helpers. So no checker
// `State`, no strategy and no `Witness` accessor is in reach of a rule.
const helpers = ['Features.Check.Components', 'Features.Check.Functional',
  'Features.Check.Holes', 'Features.Check.Implied', 'Features.Check.Nested',
  'Features.Check.NestedArguments', 'Features.Check.Spine',
  'Features.Check.Tables', 'Features.Check.Walk',
  'Features.Resolve.Builtin'];
test('T10: no Generate* module reaches checker state', () => {
  const { graph, error } = pursGraph();
  assert.equal(error, undefined);
  const generator = /^Features\.Check\.Generate(\.|$)/;
  const starts = Object.keys(graph).filter(name => generator.test(name));
  assert.ok(starts.includes('Features.Check.Generate.Elab.Internal'));
  assert.ok(starts.length > 30, `${starts.length} Generate* modules`);
  const seen = new Set();
  const visit = name => {
    if (seen.has(name)) return;
    seen.add(name);
    graph[name].depends.forEach(visit);
  };
  starts.forEach(visit);
  const outside = [...seen].filter(name =>
    /^(Features|Format|Program|Runtime)\./.test(name)
    && !generator.test(name)).sort();
  assert.deepEqual(outside.filter(name => !helpers.includes(name)), []);
  for (const forbidden of ['Features.Check.Scheme', 'Features.Check.Unify',
    'Features.Check.Strategy.Witness', 'Domain.Elaborating.Build'])
    assert.ok(!seen.has(forbidden), forbidden);
  // Non-vacuous: the closure does reach shared helpers.
  assert.ok(outside.includes('Features.Check.Spine'));
});
