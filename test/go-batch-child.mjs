// Child of the T002 concurrency self-test (test/go-batch.test.mjs): builds a
// batch whose id every sibling process shares, then reports where it built.
import { batchDirectory, runGoBatch } from './go-batch.mjs';

const cases = Array.from({ length: 6 },
  (_, index) => [`case${index}`, `fn main(): Int = ${index};`]);
const batch = runGoBatch('shared-id.mjs', cases, 'race');
const outputs = cases.map(([name]) => batch.run(name).trim());
console.log(JSON.stringify({
  outputs, directory: batchDirectory('shared-id-mjs-race')
}));
