// Tranche 2 Task 15: the honest packages of the corpus loader, as
// test/r0-t2-package-corpus.serial.test.mjs reads them (Task 11): each
// declaration whose generation succeeds and whose online search gives a
// candidate, read back with `readEffects`. A read fault gives no package
// and is counted, not judged. `corpusPackages(load)` returns
// { packages: [{ where, problem, pkg }], faults, sources }; the loader
// is injected so a probe reads one build only.
import { loadCorpus } from './r0-corpus.mjs';
import { resolved } from './r0-generate-support.mjs';
import { budget, onlineFrom } from './r0-online-support.mjs';
import { sourcesOf } from './r0-effects-pin-run.mjs';

const named = value => value.constructor.name;

export const packageReader = async load => {
  const online = await onlineFrom(load);
  const Generate = await load('Features.Check.Generate');
  const Elaborating = await load('Domain.Elaborating');
  const Online = await load('Features.Check.Strategy.Online');
  const Function = await load('Features.Check.Function');
  const { functional } = await load('Features.Check.Functional');
  const RB = await load('Features.Check.Strategy.ReadBack');
  const Package = await load('Features.Check.Strategy.ReadBack.Package');
  // One declaration's package, a fault's name, or undefined (no
  // candidate).
  return (program, inputs, decl) => {
    const generated = Generate.generate(inputs.tables)(inputs.signatures)(
      decl);
    if (named(generated) !== 'Right') return undefined;
    const problem = Elaborating.problem(generated.value0);
    const found = Online.onlineSearch(online.contextOf(program))(budget)(
      problem);
    if (named(found) !== 'Candidate') return undefined;
    const live = Function.recheck(functional(program.ctors))(program)(decl)
      .value0;
    const readBack = RB.readBack(problem)(live.function).value0;
    const read = Package.readEffects(problem)(readBack)(live.function)(
      live.state.subst.marks)(live.trace);
    return named(read) === 'Left' ? { fault: named(read.value0) }
      : { problem, pkg: read.value0 };
  };
};

// The packages of `entries` ([{ origin, source }]).
const packagesOf = async (load, entries) => {
  const read = await packageReader(load);
  const Inputs = await load('Features.Check.Generate.Inputs');
  const packages = [];
  let faults = 0;
  for (const { origin, source } of entries) {
    let program;
    try { program = resolved(source); } catch { continue; }
    const inputs = Inputs.generationInputs(program);
    for (const decl of program.functions) {
      const found = read(program, inputs, decl);
      if (found?.fault !== undefined) faults += 1;
      else if (found !== undefined)
        packages.push({ where: `${origin}#${decl.name}`, ...found });
    }
  }
  return { packages, faults, sources: entries.length };
};

export const corpusPackages = async load =>
  packagesOf(load, await loadCorpus());

// The effect pin's sources (test/r0-effects-pin-run.mjs) whose text the
// corpus loader does not hold; the others are the same text, read the
// same way, so their packages are the corpus loader's.
export const effectPinExtras = async load => {
  const corpus = new Set((await loadCorpus()).map(entry => entry.source));
  const pinned = await sourcesOf();
  const extra = pinned.filter(entry => !corpus.has(entry.source));
  return { ...await packagesOf(load, extra), pinned: pinned.length };
};
