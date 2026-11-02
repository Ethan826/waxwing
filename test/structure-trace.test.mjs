import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filesUnder } from '../scripts/structure.mjs';
import { traceFindings, traceFloors } from '../scripts/structure-trace.mjs';
import { facts } from '../output/Style.Trace/index.js';

// The trace gate (scripts/structure-trace.mjs, tranche 2 Task 7): the
// real src passes; each planted reader, instance, export or import of a
// must-fail probe fails it; each near miss passes.
const sources = Object.fromEntries(filesUnder('src').filter(file =>
  file.endsWith('.purs')).map(file => [file, readFileSync(file, 'utf8')]));
const trace = 'src/Features/Check/Trace.purs';
const unify = 'src/Features/Check/Unify.purs';
const apply = 'src/Features/Check/Apply.purs';
const fn = 'src/Features/Check/Function.purs';

// Each source is parsed once; a probe re-reads only what it edits.
const read = new Map();
const cachedFacts = source => {
  if (!read.has(source)) read.set(source, facts(source));
  return read.get(source);
};
const findings = edits => traceFindings({ ...sources, ...edits },
  cachedFacts);
const appended = (file, text) => ({ [file]: `${sources[file]}\n${text}\n` });
const replaced = (file, from, to) => {
  assert.ok(sources[file].includes(from), `${file} lacks ${from}`);
  return { [file]: sources[file].replace(from, to) };
};
const fails = (edits, pattern) => {
  const found = findings(edits);
  assert.ok(found.some(finding => pattern.test(finding)),
    JSON.stringify(found));
};

test('the real src passes the trace gate', () => {
  assert.deepEqual(findings({}), []);
});

test('a planted trace reader in an inference module fails', () => {
  const unifyUses = /Features\.Check\.Unify peek \((\w+)\) .* allowed 0/;
  for (const reader of ['peek state = const unit state.trace',
    'peek state = const unit state."trace"',
    'peek state = const unit (_.trace state)',
    'peek { trace } = const unit trace',
    'peek state = case state of\n  { trace: found } -> const unit found',
    'peek state = state { trace = state.trace }'])
    fails(appended(unify, reader), unifyUses);
});

test('an extra or a missing use in an allowlisted declaration fails', () => {
  fails(replaced(apply, '  { trace = recordPiped argument row state.trace }',
    '  { trace = recordPiped argument row (const state.trace state.trace) }'),
  /Apply pipedAt \(accessor\) uses .* 2 times, allowed 1/);
  fails(replaced(apply, '  { trace = recordPiped argument row state.trace }',
    '  { subst = state.subst }'),
  /Apply pipedAt \(update\) uses .* 0 times, allowed 1/);
});

test('an instance on Trace fails, derived or written', () => {
  for (const instance of ['derive instance eqTrace ∷ Eq Trace',
    'derive instance ordTrace ∷ Ord Trace',
    'derive newtype instance showTrace ∷ Show Trace',
    'derive instance genericTrace ∷ Generic Trace _',
    'instance eqTrace ∷ Eq Trace where\n  eq _ _ = true'])
    fails(appended(trace, instance),
      /Features\.Check\.Trace declares an instance \w+ on Trace/);
});

test('Trace exported with its constructor fails', () => {
  for (const exported of ['  , Trace(..)', '  , Trace(Trace)',
    '  , module Features.Check.Trace\n  , Trace'])
    fails(replaced(trace, '  , Trace\n', `${exported}\n`),
      /must export Trace without its constructor/);
  fails(replaced(trace, /module Features\.Check\.Trace\n[\s\S]*?\n {2}\) where/
    .exec(sources[trace])[0], 'module Features.Check.Trace where'),
  /must export Trace without its constructor/);
});

test('a new export from Check/Trace fails, even an unused one', () => {
  const peek = replaced(trace, '  , finish\n', '  , finish\n  , peekTrace\n');
  fails({ [trace]: `${peek[trace]}\npeekTrace ∷ Trace → Int\n`
    + 'peekTrace _ = 0\n' }, /exports .*peekTrace.*not the reviewed list/);
  fails(replaced(trace, '  , recordInstallation\n', ''),
    /not the reviewed list/);
});

test('finish or Trace.Types imported outside their owner fails', () => {
  for (const imported of ['import Features.Check.Trace (finish)',
    'import Features.Check.Trace as Trace',
    'import Features.Check.Trace hiding (emptyTrace)'])
    fails(replaced(unify, 'import Data.Array as Array\n',
      `import Data.Array as Array\n${imported}\n`),
    /Unify imports Features\.Check\.Trace's finish/);
  for (const imported of ['import Features.Check.Trace.Types (Traced)',
    'import Features.Check.Trace.Types as Types'])
    fails(replaced(unify, 'import Data.Array as Array\n',
      `import Data.Array as Array\n${imported}\n`),
    /Unify imports Features\.Check\.Trace\.Types/);
  fails(replaced(fn, '(Rechecked, environment, recheck)',
    '(Rechecked, environment, finish, recheck)'),
  /Function re-exports finish/);
});

test('an unparsed module and a short scan fail', () => {
  fails({ 'src/Broken.purs': 'module Broken where\nx = (' },
    /src\/Broken\.purs does not parse/);
  const found = traceFindings(sources, cachedFacts,
    { modules: traceFloors.modules + Object.keys(sources).length });
  assert.ok(found.some(finding => /floor/.test(finding)));
});

test('near misses pass: TraceKey instances, other labels, text', () => {
  assert.deepEqual(findings(appended(unify, [
    'peek state = const unit state.traced',
    'peek2 { traceId } = traceId',
    '-- state.trace in a comment',
    'peek3 = "state.trace"'].join('\n'))), []);
  assert.deepEqual(findings(replaced(unify, 'import Data.Array as Array\n',
    'import Data.Array as Array\nimport Features.Check.Trace hiding'
    + ' (finish)\n')), []);
  assert.deepEqual(findings(appended(trace,
    'instance showTraceKeys ∷ Show (Array TraceKey) where\n'
    + '  show _ = ""')), []);
});
