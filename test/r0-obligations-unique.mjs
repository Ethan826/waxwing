// The provenance-uniqueness check over every obligation kind (§18.124
// ruling 3, statements §10): within one declaration, no two obligations
// share a tagged provenance. `BesideAtom` is identified by its rule and
// AtomId, `AtSite` by declaration, path, rule and role (a `Consumed`
// role carries its site kind and ordinal). Shared by the corpus test
// (r0-obligations-equal.test.mjs) and the regression probe
// (regression-r0-amin-uniqueness.mjs), so both run one check.
const identity = (item, shape) => JSON.stringify([
  item.provenance.constructor.name, shape(item.provenance)]);

// The identities that occur more than once, each once.
export const repeated = (obligations, shape) => {
  const seen = new Set();
  const again = new Set();
  for (const item of obligations) {
    const id = identity(item, shape);
    if (seen.has(id)) again.add(id);
    seen.add(id);
  }
  return [...again];
};
