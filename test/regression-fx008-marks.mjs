// FX008 Task 9 regression probes, registered through
// test/regression-probes.mjs; the rows are in scripts/regression-fx008-marks.mjs.
// Each compiles one program with the compiler under test. A probe that is
// meant to compile reports `rejected: <message>` when it does not, and one
// meant to be rejected reports `accepted`.
import {
  a1, copies, ownRow, forwardingIntoFailing, probe as probeSource, rigidVariable
} from './fx008-defer-programs.mjs';
import { compileWithin } from './regression-fx008.mjs';

const timeoutMs = 20_000;
const deferText = /^defer must not fail, but it performs /;

const fail = message => {
  console.error(message);
  process.exit(1);
};

const accepts = (source, label, expected) => context => {
  const found = compileWithin(context, source, timeoutMs);
  if (found.timedOut) fail(`${label}: timed out`);
  if (found.diagnostic !== null) fail(`${label}: rejected: ${found.diagnostic.message}`);
  if (context.printed(source) !== expected) fail(`${label}: wrong output`);
  console.log(`${context.probe} regression detects the defect`);
};

const rejects = (source, label, pattern) => context => {
  const found = compileWithin(context, source, timeoutMs);
  if (found.timedOut) fail(`${label}: timed out`);
  if (found.diagnostic?.code !== 'E_EFFECT') fail(`${label}: accepted`);
  if (!pattern.test(found.diagnostic.message)) {
    fail(`${label}: wrong message ${found.diagnostic.message}`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

export const markProbes = {
  'fx008-directional': accepts(probeSource('design-review/p1'), 'directional',
    '2\n1\n9\n'),
  'fx008-copies': accepts(copies, 'copies', '1\n5\n1\n'),
  'fx008-c-unified': accepts(probeSource('design-review/p2'), 'C unified',
    '11\n9\n'),
  'fx008-r-marks': accepts(probeSource('design-review/p2'), 'R marks',
    '11\n9\n'),
  'fx008-extension': accepts(probeSource('rev6/extb'), 'extension',
    '12\n0\n9\n'),
  'fx008-local-plain': accepts(probeSource('rev6/annotb'), 'local marks',
    '1\n2\n'),
  'fx008-r-identity': accepts(probeSource('rev7/merge1'), 'R identity',
    '1\n9\n'),
  'fx008-c-alias': accepts(probeSource('rev7/annotc'), 'C alias', '1\n5\n9\n'),
  'fx008-frame-m': accepts(probeSource('design-review/p2'), 'frame',
    '11\n9\n'),
  'fx008-own-frame': rejects(probeSource('facts/lexical'), 'own frame',
    deferText),
  'fx008-outer-frame': rejects(forwardingIntoFailing, 'outer frame', deferText),
  'fx008-rigid-n': rejects(rigidVariable, 'rigid', deferText),
  'fx008-result-clauses': rejects(a1, 'result clauses', deferText),
  'fx008-result-own-row': rejects(ownRow, 'result own row', deferText)
};
