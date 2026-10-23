import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeProblem } from './r0-canonical.mjs';
import { loadCorpus } from './r0-corpus.mjs';
import { generatedOrThrow, load, resolved } from './r0-generate-support.mjs';
import { stubsFrom } from './r0-stubs.mjs';

// RT3 (T-R0b §9 item 3; Tasks 3.6 and 4.1): generation does not consult
// a strategy. Over the pinned corpus, each declaration's problem is
// generated alone, after today's online search (the collecting driver,
// which runs `recheck` on every body) and after `decide` with a stub
// strategy that refuses at once; the three must be byte-identical as
// `encodeProblem` writes them (test/r0-canonical.mjs). Corpus-wide, hence
// serial (ruling R11). Generation also imports no strategy, `decide` or
// refuter module (its compiled import closure).
const corpus = await loadCorpus();
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const { checkProgram } = await load('Features.Check.Outcomes');
const stubs = await stubsFrom(load);
const Verdict = await load('Domain.Verdict');
const Search = await load('Domain.Verdict.Search');

const programs = corpus.flatMap(({ origin, source }) => {
  try { return [{ origin, program: resolved(source) }]; } catch {
    return [];
  }
});
const encodedAll = program => {
  const { tables, signatures } = Inputs.generationInputs(program);
  return program.functions.map(decl => encodeProblem(generatedOrThrow(
    Generate.generate(tables)(signatures)(decl), decl.name)));
};
const refusesAtOnce = () => stubs.behaviours.refusing(
  Verdict.Heuristic.value, new Search.Unsatisfied({ decl: 0,
    path: { root: 'stub', steps: [] }, index: 0 }));

test('RT3: generation is byte-identical beside either search', () => {
  assert.ok(programs.length > 900, `${programs.length} programs`);
  let declarations = 0;
  for (const { origin, program } of programs) {
    const alone = encodedAll(program);
    checkProgram(program);
    const afterOnline = encodedAll(program);
    const { tables, signatures } = Inputs.generationInputs(program);
    for (const decl of program.functions)
      stubs.decide(stubs.checking({ strategies: [refusesAtOnce()] }),
        Generate.generate(tables)(signatures)(decl).value0);
    const afterStub = encodedAll(program);
    assert.deepEqual(afterOnline, alone, `${origin}: online search`);
    assert.deepEqual(afterStub, alone, `${origin}: refusing stub`);
    declarations += alone.length;
  }
  assert.ok(declarations > 2500, `${declarations} declarations`);
});

// The compiled import closure of generation, from output/.
const closure = (start, seen = new Set()) => {
  if (seen.has(start)) return seen;
  seen.add(start);
  const js = readFileSync(new URL(`../output/${start}/index.js`,
    import.meta.url), 'utf8');
  for (const [, name] of js.matchAll(/from\s*"\.\.\/([^/"]+)\/index\.js"/g))
    closure(name, seen);
  return seen;
};

test('RT3: generation imports no strategy, decide or refuter module', () => {
  const reached = [...closure('Features.Check.Generate')];
  // Non-vacuous: the closure reaches generation's own modules (the
  // problem's newtype constructor compiles to no import).
  assert.ok(reached.includes('Domain.Recorded.Atom'));
  assert.ok(reached.filter(name =>
    name.startsWith('Features.Check.Generate.')).length > 5);
  const searching = /^Features\.Check\.(Strategy|Decide|Refute)(\.|$)/;
  assert.deepEqual(reached.filter(name => searching.test(name)), []);
});
