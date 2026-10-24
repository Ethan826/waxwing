import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { shadowRun } from './r0-shadow-run.mjs';
import { rt8Checks } from './r0-rt8-checks.mjs';
import { windowChecks } from './r0-shadow-checks.mjs';

// RT8 (Task 4.3; test/r0-rt8-checks.mjs) and the window table (Task
// 4.5; test/r0-shadow-checks.mjs) over one run of the corpus: each
// program is decided once (`declarationsOf`), where each suite used to
// decide the whole corpus in its own process (BACKLOG R025). Each
// suite's assertions, pins (rt8.json, window.json) and messages are its
// own. Corpus-wide, so serial.
const { rt8Rows, programs } = await shadowRun();
rt8Checks(rt8Rows);
windowChecks(programs);

// BACKLOG R021, token re-review B-1: Entailed's `wellSorted` guard sends
// an ill-sorted problem outside the fragment. It must never fire on a
// generated problem, so it moves no RT8 or window class.
const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { generate } = await load('Features.Check.Generate');
const { wellSorted } = await load('Features.Check.Entailed');
const { Tuple } = await load('Data.Tuple');
const equationsOf = problem => [...problem.d, ...problem.b]
  .map(entry => entry.value).filter(atom => atom.constructor.name === 'Equal')
  .map(atom => new Tuple(atom.value0, atom.value1));

test('the well-sortedness guard fires on no generated problem', () => {
  const seen = new Set();
  let checked = 0;
  const illSorted = [];
  for (const row of rt8Rows) {
    if (seen.has(row.program)) continue;
    seen.add(row.program);
    const { tables, signatures } = generationInputs(row.program);
    for (const decl of row.program.functions) {
      const generated = generate(tables)(signatures)(decl);
      if (generated.constructor.name !== 'Right') continue;
      checked += 1;
      if (!wellSorted(equationsOf(generated.value0)))
        illSorted.push(`${row.origin}#${decl.name}`);
    }
  }
  assert.deepEqual(illSorted, []);
  assert.ok(checked > 3000, `only ${checked} problems`);
  console.log(`R021 guard: ${checked} generated problems, `
    + `${illSorted.length} ill-sorted`);
});
