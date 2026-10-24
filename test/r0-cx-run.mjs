// Support for Task 5.2's corpus-wide CX tests: every declaration of the
// pinned corpus (test/r0-corpus.mjs) that resolves and generates, with
// today's checker result, its recorded problem and the CX search's
// unseeded counter-instance (`Nothing` where it found none), all from
// the compiled output. A generation fault is a row with no problem, so a
// test counts it rather than losing it.
import { loadCorpus } from './r0-corpus.mjs';
import { load } from './r0-generate-support.mjs';
import { budget } from './r0-online-support.mjs';

const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { checkProgram } = await load('Features.Check.Outcomes');
const Inputs = await load('Features.Check.Generate.Inputs');
const Generate = await load('Features.Check.Generate');
const Search = await load('Features.Check.Refute.Counter.Search');

const named = value => value.constructor.name;

const declarationsOf = ({ origin, source }) => {
  const parsed = parse(source);
  if (named(parsed) !== 'Right') return [];
  const resolved = resolve(parsed.value0);
  if (named(resolved) !== 'Right') return [];
  const program = resolved.value0;
  const { tables, signatures } = Inputs.generationInputs(program);
  const today = checkProgram(program).outcomes;
  return program.functions.flatMap((decl, index) => {
    const generated = Generate.generate(tables)(signatures)(decl);
    if (named(generated) !== 'Right') return [{ at: `${origin}#${decl.name}`,
      problem: null }];
    const problem = generated.value0;
    return [{ at: `${origin}#${decl.name}`, problem,
      todayAccepts: named(today[index].today) === 'Right',
      found: Search.searchCX(budget)([])(problem) }];
  });
};

export const cxDeclarations = async () =>
  (await loadCorpus()).flatMap(declarationsOf);
