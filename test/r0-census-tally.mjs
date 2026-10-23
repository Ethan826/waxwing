// Task 3.5: the census's counts from classified programs
// (r0-census-classify.mjs). Only declarations whose body checks today
// count; a category's programs are those that compile today with at
// least one such declaration. `only` counts the programs blocked by
// this category alone; `marginal` the programs it adds, taken in
// `categoryOrder`, to those blocked by the categories before it, so
// the marginals sum to the union.
import { categoryOrder, outsideKinds, sectionOf }
  from './r0-census-classify.mjs';
import { sourceOrder } from './r0-census-erased.mjs';

const zeroes = names => Object.fromEntries(names.map(name => [name, 0]));
const union = sets => new Set(sets.flatMap(set => [...set]));

// A program's blocking categories, over its compiling declarations.
const blockedBy = found => union(found.declarations
  .filter(decl => decl.compiles).map(decl => new Set(decl.categories)));

const categoryTable = (classified, accepted) => {
  const table = Object.fromEntries(categoryOrder.map(name => [name,
    { section: sectionOf(name), declarations: 0, programs: 0, only: 0,
      marginal: 0 }]));
  for (const found of classified)
    for (const decl of found.declarations.filter(item => item.compiles))
      for (const name of decl.categories) table[name].declarations += 1;
  for (const found of accepted) {
    const blocked = blockedBy(found);
    for (const name of blocked) table[name].programs += 1;
    if (blocked.size === 1) table[[...blocked][0]].only += 1;
    const first = categoryOrder.find(name => blocked.has(name));
    if (first !== undefined) table[first].marginal += 1;
  }
  return table;
};

// §8: the marker's own cost and its firing sources; P-ii, informational.
const erasedTable = (compiling, accepted) => {
  const marked = compiling.filter(decl => decl.sources.length > 0);
  const sources = zeroes(sourceOrder);
  for (const decl of marked)
    for (const source of decl.sources) sources[source] += 1;
  const outsideFree = decl => !decl.categories.some(name =>
    outsideKinds.includes(name));
  return {
    markedWithoutOutsideKind: marked.filter(outsideFree).length,
    sources,
    inferredRows: {
      declarations: compiling.filter(decl => decl.inferredRows).length,
      programs: accepted.filter(found => found.declarations
        .some(decl => decl.inferredRows)).length
    }
  };
};

const guardTable = compiling => {
  const declined = compiling.filter(decl => decl.guard.length > 0);
  const having = reason => declined.filter(decl =>
    decl.guard.includes(reason)).length;
  return { rigid: having('rigid'), fragment: having('fragment') };
};

// Where a corpus entry comes from (test/r0-corpus.mjs's rules), for
// the reading of what the corpus can tell (docs/plans/r0-census.md).
export const familyOf = origin => {
  if (origin.startsWith('generated:')) return 'generated';
  if (origin.startsWith('test/fixtures/')) return 'fixture';
  if (/^test\/[^/]*\.mjs:/.test(origin)) return 'testData';
  if (origin.endsWith('.wxw')) return 'wxw';
  if (/\.md#\d+$/.test(origin)) return 'markdown';
  throw new Error(`r0-census-tally: no family for ${origin}`);
};
const familyTable = classified => {
  const table = {};
  for (const found of classified) {
    const row = table[familyOf(found.origin)] ??= { programs: 0,
      accepted: 0, blocked: 0 };
    row.programs += 1;
    if (found.accepted) row.accepted += 1;
    if (found.accepted && blockedBy(found).size > 0) row.blocked += 1;
  }
  return table;
};

// The census of classified programs (each `{ origin, ...classified }`).
export const censusOf = classified => {
  const accepted = classified.filter(found => found.accepted);
  const compiling = classified.flatMap(found =>
    found.declarations.filter(decl => decl.compiles));
  const blocked = accepted.filter(found => blockedBy(found).size > 0);
  const withoutErased = accepted.filter(found => [...blockedBy(found)]
    .some(name => name !== 'ErasedRow'));
  return {
    corpus: {
      programs: classified.length,
      resolved: classified.filter(found => found.program !== null).length,
      accepted: accepted.length,
      declarations: classified.reduce((count, found) =>
        count + found.declarations.length, 0),
      compilingDeclarations: compiling.length,
      inAcceptedPrograms: accepted.reduce((count, found) =>
        count + found.declarations.length, 0)
    },
    order: categoryOrder,
    categories: categoryTable(classified, accepted),
    union: { programs: blocked.length,
      programsWithoutErasedRow: withoutErased.length,
      origins: blocked.map(found => found.origin).sort() },
    erased: erasedTable(compiling, accepted),
    guard: guardTable(compiling),
    families: familyTable(classified),
    secondSpreadAtResolve: classified.filter(found => found.secondSpread)
      .length
  };
};
