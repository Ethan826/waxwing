import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedOrThrow, load } from './r0-generate-support.mjs';
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
// Hardening re-review 2, m-5: `wellSorted` reads equations only, so a
// `BQ` atom's type (`Printable` or `Comparable`) joins them as `ty = ty`,
// which adds its variables' uses and no constraint: a variable a tail in
// the equations and a type in an atom is caught too.
const atomsOf = problem => problem.bq
  .map(entry => new Tuple(entry.value.value0, entry.value.value0));

test('the well-sortedness guard fires on no generated problem', () => {
  const seen = new Set();
  let checked = 0;
  let atoms = 0;
  const illSorted = [];
  for (const row of rt8Rows) {
    if (seen.has(row.program)) continue;
    seen.add(row.program);
    const { tables, signatures } = generationInputs(row.program);
    for (const decl of row.program.functions) {
      const generated = generate(tables)(signatures)(decl);
      if (generated.constructor.name !== 'Right') continue;
      checked += 1;
      const problem = generatedOrThrow(generated, decl.name);
      if (!wellSorted(equationsOf(problem)))
        illSorted.push(`${row.origin}#${decl.name}`);
      else if (!wellSorted([...equationsOf(problem), ...atomsOf(problem)]))
        illSorted.push(`${row.origin}#${decl.name} (an atom)`);
      atoms += problem.bq.length;
    }
  }
  assert.deepEqual(illSorted, []);
  assert.ok(checked > 3000, `only ${checked} problems`);
  assert.ok(atoms > 0, 'no BQ atom checked');
  console.log(`R021 guard: ${checked} generated problems, ${atoms} BQ`
    + ` atoms, ${illSorted.length} ill-sorted`);
});
