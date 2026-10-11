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

export const fx008Probes = { 'fx008-cycle-presence': cyclePresence };
