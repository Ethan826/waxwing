// Task 4.5: the window table's summary block (plan §3.1's "numbers
// from the window table"): rows per class in declarations and in
// programs, since one Unresolved declaration fails its whole program.
// Per class: `compilingProgramsInClass`, programs `compile` accepts today
// with a row of the class (whether or not R0 would stop them);
// `stoppedUnderShadow`, those with such a row whose R0 verdict is not
// Solved; `only`, compiling programs whose rows are all of this class.
// `stops` keeps the three scenarios of the author's ruling R-a apart.
import { falseContradictions, knownValid } from './r0-shadow-known.mjs';
import { classEntry, t6Classes, windowClasses }
  from './r0-shadow-classes.mjs';
import { outsideKinds } from './r0-census-classify.mjs';

const rowsOf = program => program.results
  .filter(result => result.row !== null).map(result => result.row);
const countWhere = (programs, test) => programs.filter(test).length;
const has = test => program => rowsOf(program).some(test);
const compiling = programs => programs.filter(program => program.compiles);

// The plan's classes always; T6's only where a row has one, so a
// decline or a defect the committed path never reaches moves no pin.
const listed = programs => {
  const present = new Set(programs.flatMap(rowsOf).map(row => row.class));
  return [...Object.keys(windowClasses),
    ...Object.keys(t6Classes).filter(name => present.has(name))];
};

const classTable = programs => Object.fromEntries(
  listed(programs).map(name => {
    const ofClass = row => row.class === name;
    const only = program => rowsOf(program).length > 0
      && rowsOf(program).every(ofClass);
    const stops = row => ofClass(row) && row.r0.verdict !== 'Solved';
    return [name, { ...classEntry(name),
      declarations: programs.flatMap(rowsOf).filter(ofClass).length,
      programs: countWhere(programs, has(ofClass)),
      compilingProgramsInClass: countWhere(compiling(programs),
        has(ofClass)),
      stoppedUnderShadow: countWhere(compiling(programs), has(stops)),
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

// The author's ruling R-a: programs compiling today that R0 would stop,
// (1) under the implemented shadow decisions (a row whose verdict is not
// Solved); (2) in addition, if the erased-row boundary were adopted (its
// narrowing is not approved); (3) in addition, if a future ambiguity
// policy rejected the bound-hole cases (they are Solved now; the
// scenario is hypothetical, not approved).
const stopped = programs => {
  const decided = row => row.r0.verdict !== 'Solved';
  const erased = row => decided(row) || row.blockers.includes('ErasedRow');
  const pending = row => erased(row) || row.class.startsWith('Solved with');
  const count = test => compiling(programs).filter(has(test)).length;
  return { underShadowDecisions: count(decided),
    additionalIfErasedRowAdopted: count(erased) - count(decided),
    additionalIfBoundHolesRejected: count(pending) - count(erased),
    allThree: count(pending) };
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
  stops: stopped(programs),
  // §3.1 option C's list: rows where R0's class improves on today's
  // without changing acceptance (both refuse; R0 drops a false
  // contradiction, or a refusal of a known-valid program), with no
  // blocker. Listed, not adopted.
  optionC: programs.flatMap(rowsOf).filter(row =>
    (row.at in falseContradictions || row.at in knownValid)
    && row.blockers.length === 0 && !row.programCompiles)
    .map(row => row.at),
  // Today's known defects by their ids, then (T6) each RT8 defect by
  // its RT8 class, so the window reports it rather than aborting; a
  // known defect with an RT8 defect too is listed both ways.
  defects: [...programs.flatMap(rowsOf).filter(row => row.class === 'defect')
    .map(row => `${row.at}: ${row.defect.id}`),
  ...programs.flatMap(rowsOf).filter(row => row.rt8.startsWith('DEFECT'))
    .map(row => `${row.at}: ${row.rt8}`)]
});
