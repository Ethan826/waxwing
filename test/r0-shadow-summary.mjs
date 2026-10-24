// Task 4.5: the window table's summary block (plan §3.1's "numbers
// from the window table"): rows per class in declarations and in
// programs, since one Unresolved declaration fails its whole program.
// `compilingPrograms` are programs `compile` accepts today with a row
// of the class: those it would stop if R0's verdict were live. `only`
// counts those whose rows are all of this class.
import { falseContradictions } from './r0-shadow-known.mjs';
import { windowClasses } from './r0-shadow-classes.mjs';
import { outsideKinds } from './r0-census-classify.mjs';

const rowsOf = program => program.results
  .filter(result => result.row !== null).map(result => result.row);
const countWhere = (programs, test) => programs.filter(test).length;
const has = test => program => rowsOf(program).some(test);
const compiling = programs => programs.filter(program => program.compiles);

const classTable = programs => Object.fromEntries(
  Object.entries(windowClasses).map(([name, { section }]) => {
    const ofClass = row => row.class === name;
    const only = program => rowsOf(program).length > 0
      && rowsOf(program).every(ofClass);
    return [name, { section,
      declarations: programs.flatMap(rowsOf).filter(ofClass).length,
      programs: countWhere(programs, has(ofClass)),
      compilingPrograms: countWhere(compiling(programs), has(ofClass)),
      only: countWhere(compiling(programs), only) }];
  }));

// Per `Outside` kind and for the erased-row detector, over rows of
// declarations that compile today, overlapping (as the census counts).
const blockerTable = programs => Object.fromEntries(
  [...outsideKinds, 'ErasedRow'].map(name => {
    const blocked = row => row.today === 'compiles'
      && row.blockers.includes(name);
    return [name, {
      declarations: programs.flatMap(rowsOf).filter(blocked).length,
      compilingPrograms: countWhere(compiling(programs), has(blocked)) }];
  }));

const agreements = programs => {
  const counts = { 'agree: Solved': 0, 'agree: static refusal': 0 };
  for (const program of programs)
    for (const result of program.results)
      if (result.row === null)
        counts[result.agreement.today === null ? 'agree: Solved'
          : 'agree: static refusal'] += 1;
  return counts;
};

// Programs compiling today that R0 would stop: as decided (a row whose
// verdict is not Solved), then with the census's erased-row boundary,
// then with the Solved rows resting on a bound hole as well.
const stopped = programs => {
  const decided = row => row.r0.verdict !== 'Solved';
  const erased = row => decided(row) || row.blockers.includes('ErasedRow');
  const pending = row => erased(row) || row.class.startsWith('Solved with');
  const origins = test => compiling(programs).filter(has(test))
    .map(program => program.origin);
  return { asDecided: origins(decided).length,
    withErasedRow: origins(erased).length,
    withBoundHoles: origins(pending).length };
};

export const summaryOf = programs => ({
  programs: {
    all: programs.length,
    withDeclarations: countWhere(programs, program =>
      program.results.length > 0),
    compiling: compiling(programs).length,
    secondSpreadAtResolve: countWhere(programs, program =>
      program.secondSpread)
  },
  declarations: {
    all: programs.reduce((count, program) =>
      count + program.results.length, 0),
    rows: programs.flatMap(rowsOf).length,
    ...agreements(programs)
  },
  classes: classTable(programs),
  blockers: blockerTable(programs),
  stopped: stopped(programs),
  // §3.1 option C's list: rows where R0's class improves on today's
  // without changing acceptance (both refuse; R0 drops a false
  // contradiction). Listed, not adopted.
  optionC: programs.flatMap(rowsOf).filter(row =>
    row.at in falseContradictions).map(row => row.at),
  defects: programs.flatMap(rowsOf).filter(row => row.class === 'defect')
    .map(row => `${row.at}: ${row.defect.id}`)
});
