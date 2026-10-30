import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checked, command } from './support.mjs';

// Builds a Waxwing program's Go once and runs it, without clocks: the time
// bounds are in fx-scale.perf.test.mjs, which uses fx-scale-timed.mjs. A
// nonce comment
// makes every build's source new: Go's build cache otherwise makes
// identical sources look several times faster (docs/findings.md, Task 1).
let builds = 0;
export const buildGo = source => {
  const work = mkdtempSync(join(tmpdir(), 'waxwing-scale-'));
  const go = join(work, 'main.go');
  const binary = join(work, 'program');
  builds += 1;
  writeFileSync(go, `${checked(source)}// build ${process.pid}-${builds}\n`);
  command('go', ['build', '-o', binary, go]);
  const cleanup = () => rmSync(work, { recursive: true, force: true });
  return { binary, cleanup };
};

export const runBinary = binary => {
  const result = spawnSync(binary, [], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout };
};
