// Dumps the census, window and RT8 results of the built compiler as one
// JSON file (amin tranche 1, Task 14 Step 2): the aggregates the three
// fixtures pin, plus a per-declaration table keyed `origin#name` that
// covers the declarations on which today's result and R0's agree, which
// window.json omits. Read-only: no fixture is written. Needs a built
// output/. Compare two dumps with scripts/r0-results-moved.mjs.
//
//   node scripts/r0-results-dump.mjs <file>
import { writeFileSync } from 'node:fs';
import { classifiedCorpus, corpusCensus } from '../test/r0-census-run.mjs';
import { rt8Table } from '../test/r0-rt8-run.mjs';
import { shadowRun, windowTable } from '../test/r0-shadow-run.mjs';

// Keys are `origin#name`, with `#n` appended to a repeated name.
const keyed = (base, seen) => {
  seen.set(base, (seen.get(base) ?? 0) + 1);
  return seen.get(base) === 1 ? base : `${base}#${seen.get(base)}`;
};

const windowRows = programs => {
  const rows = {};
  const seen = new Map();
  for (const program of programs)
    for (const { agreement, row } of program.results) {
      const facts = row ?? agreement;
      const key = keyed(facts.at, seen);
      rows[key] = { today: facts.today ?? 'compiles', r0: facts.r0,
        rt8: facts.rt8, window: row === null ? null : row.class,
        blockers: row === null ? [] : row.blockers };
    }
  return rows;
};

const censusRows = classified => {
  const rows = {};
  const seen = new Map();
  for (const found of classified)
    for (const decl of found.declarations)
      rows[keyed(`${found.origin}#${decl.name}`, seen)] =
        { compiles: decl.compiles, categories: decl.categories };
  return rows;
};

export const gatherResults = async () => {
  const classified = await classifiedCorpus();
  const { rt8Rows, programs } = await shadowRun();
  const census = await corpusCensus(classified);
  const window = windowTable(programs);
  const decided = windowRows(programs);
  const counted = censusRows(classified);
  const declarations = Object.fromEntries(Object.keys(decided)
    .map(key => [key, { ...decided[key], compiles: counted[key]?.compiles
      ?? null, categories: counted[key]?.categories ?? null }]));
  return { census, window: { summary: window.summary },
    rt8: rt8Table(rt8Rows), declarations };
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const results = await gatherResults();
  writeFileSync(process.argv[2], `${JSON.stringify(results)}\n`);
  console.log(`Dumped ${Object.keys(results.declarations).length} `
    + `declarations to ${process.argv[2]}.`);
}
