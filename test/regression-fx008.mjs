// FX008 regression probes, imported through test/regression-probes.mjs; the
// rows are in scripts/regression-fx008.mjs. A probe that can hang compiles
// in a child process with its own timeout (plan ruling F17), using only the
// compiler under test.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const childProgram = `
import { readFileSync } from 'node:fs';
const root = process.argv[1];
const { compile } = await import(root + 'Program.Compile/index.js');
const { Left } = await import(root + 'Data.Either/index.js');
const { wire } = await import(root + 'Format.Diagnostic/index.js');
const result = compile(readFileSync(0, 'utf8'));
process.stdout.write(JSON.stringify(result instanceof Left
  ? { diagnostic: wire(result.value0) } : { go: result.value0 }));
`;

// The compiler under test is `context.compilerPath`; its sibling modules
// are in the same output directory.
export const compileWithin = (context, source, milliseconds) => {
  const output = resolve(dirname(context.compilerPath), '..');
  const child = spawnSync('node', ['--input-type=module', '-e', childProgram,
    `${pathToFileURL(output).href}/`], {
    input: source, encoding: 'utf8', timeout: milliseconds,
    maxBuffer: 1 << 28
  });
  if (child.error?.code === 'ETIMEDOUT') {
    return { timedOut: true, diagnostic: null, go: null };
  }
  if (child.error || child.status !== 0) {
    throw new Error(`child compile failed: ${child.error ?? child.stderr}`);
  }
  return { timedOut: false, diagnostic: null, go: null,
    ...JSON.parse(child.stdout) };
};

const probeTimeoutMs = 20_000;

const fail = message => {
  console.error(message);
  process.exit(1);
};

// dup.wxw has no finite solution: the deferral's row grows the function's
// row it shares a tail with, forever. Presence-only weights miss the extra
// `Log` and the settling loop never ends.
const cyclePresence = context => {
  const source = readFileSync('test/fx008-probes/dup.wxw', 'utf8');
  const found = compileWithin(context, source, probeTimeoutMs);
  if (found.timedOut) fail('cycle weight: timed out');
  if (found.diagnostic?.code !== 'E_EFFECT'
    || !/ cannot be made equal: both end in \.\.\.$/.test(
      found.diagnostic.message)) {
    fail(`cycle weight: ${JSON.stringify(found)}`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

// The settle order is linear in the number of deferrals. 16,000 `defer`s
// compile in about 2 s; with the order's end computed eagerly at every step
// (Task 5 review I1) they take about 26 s, so a 12 s timeout separates them.
// The margin is machine-dependent: on a host about 2x faster than the one
// measured, the defect could finish inside 12 s; re-measure there.
const orderTimeoutMs = 12_000;
const deferCount = 16_000;

const settleOrderLinear = context => {
  const deferred = Array.from({ length: deferCount },
    (_, index) => `defer print(${index}); `).join('');
  const source = `fn main(): Unit with Console = { ${deferred}() };`;
  const found = compileWithin(context, source, orderTimeoutMs);
  if (found.timedOut) fail('settle order: timed out');
  if (found.diagnostic !== null) {
    fail(`settle order: ${JSON.stringify(found.diagnostic)}`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

const probeSource = name => readFileSync(`test/fx008-probes/${name}.wxw`,
  'utf8');

// Task 7 probes. `accepts` expects the program to compile (and print
// `expected` when given); `rejects` expects an E_EFFECT; a hang is reported
// as `timed out` (ruling F17). The label is the row's message prefix.
const accepts = (name, label, expected) => context => {
  const source = probeSource(name);
  const found = compileWithin(context, source, probeTimeoutMs);
  if (found.timedOut) fail(`${label}: timed out`);
  if (found.diagnostic !== null) {
    const { code, message } = found.diagnostic;
    fail(`${label}: ${code === 'E_EFFECT' ? 'rejected: ' : ''}${message}`);
  }
  if (expected !== undefined && context.printed(source) !== expected) {
    fail(`${label}: wrong output`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

const cyc2Text = /^Tick \+ \.\.\. and \.\.\. cannot be made equal: both end in \.\.\.$/;

const rejects = (name, label, pattern) => context => {
  const found = compileWithin(context, probeSource(name), probeTimeoutMs);
  if (found.timedOut) fail(`${label}: timed out`);
  if (found.diagnostic?.code !== 'E_EFFECT') fail(`${label}: accepted`);
  if (!pattern.test(found.diagnostic.message)) {
    fail(`${label}: wrong message ${found.diagnostic.message}`);
  }
  console.log(`${context.probe} regression detects the defect`);
};

export const fx008Probes = {
  'fx008-cycle-presence': cyclePresence,
  'fx008-settle-order-linear': settleOrderLinear,
  'fx008-hook': accepts('rev7/late1', 'hook', '0\n'),
  'fx008-phi': accepts('rev8/two1', 'remainder', '0\n'),
  'fx008-phi-tail': accepts('rev8/two3', 'remainder tail', '0\n'),
  'fx008-phi-equal': accepts('rev9/ov1', 'R≡R', '0\n'),
  'fx008-f2': rejects('rev8/cyc2', 'F2', cyc2Text),
  'fx008-new-labels': accepts('rev8/one3', 'new labels', '0\n'),
  'fx008-signature': accepts('argbind', 'signature'),
  'fx008-settle-phi': accepts('rev9/set1', 'settling φ', '0\n'),
  'fx008-r-consumed': accepts('rev6/meta2', 'R consumed'),
  'fx008-exit-count': rejects('witness/ec2', 'exit test', /^Unhandled Fail\(E\) in main$/),
  'fx008-tail-pass': rejects('witness/tp1', 'tail pass', /^f performs Console, which its signature/)
};
