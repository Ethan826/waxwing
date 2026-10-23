import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './r0-generate-support.mjs';
import { loadCorpus } from './r0-corpus.mjs';

// Task 4.2, "main's printability atom agrees with printableEntry"
// (plan Review Focus 4): over the pinned corpus, Sig10's atom judged by
// the ground rule agrees with today's entry check (Outcomes.purs,
// `printableEntry`, read through `checkProgram`'s `entry`), for every
// program whose `main` result is not a declared type holding functions
// (those wait on G-ValidR, §3.2(a), and are counted apart). Serial:
// corpus-wide.
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { checkProgram } = await load('Features.Check.Outcomes');
const { generationInputs } = await load('Features.Check.Generate.Inputs');
const { generate } = await load('Features.Check.Generate');
const GroundRule = await load('Features.Check.GroundRule');
const Origin = await load('Domain.Recorded.Origin');

const named = value => value.constructor.name;
const sig10 = entry => entry.origin.rule instanceof Origin.SigRule
  && entry.origin.rule.value0 === 10;

// Today's entry verdict and the ground rule's, or null when either the
// program does not reach checking or `main` has no problem.
const judged = source => {
  const parsed = parse(source);
  if (named(parsed) !== 'Right') return null;
  const program = resolve(parsed.value0);
  if (named(program) !== 'Right') return null;
  const resolved = program.value0;
  const main = resolved.functions[resolved.entry];
  const { tables, signatures } = generationInputs(resolved);
  const generated = generate(tables)(signatures)(main);
  if (named(generated) !== 'Right') return null;
  const atoms = generated.value0.bq.filter(sig10);
  assert.equal(atoms.length, 1, 'Sig10 records one atom');
  const ground = GroundRule.judge(generated.value0.holders)(
    () => GroundRule.Unjudged.value)(GroundRule.atomType(atoms[0].value));
  return { today: named(checkProgram(resolved).entry), ground: named(ground) };
};

test('main\'s printability atom agrees with printableEntry', async t => {
  const counts = { agreed: 0, open: 0, skipped: 0 };
  for (const { origin, source } of await loadCorpus()) {
    const found = judged(source);
    if (found === null) counts.skipped += 1;
    else if (found.ground === 'Open') counts.open += 1;
    else {
      assert.equal(found.ground === 'Holds', found.today === 'Right', origin);
      assert.notEqual(found.ground, 'Unjudged', origin);
      counts.agreed += 1;
    }
  }
  t.diagnostic(JSON.stringify(counts));
  assert.ok(counts.agreed > 0);
});
