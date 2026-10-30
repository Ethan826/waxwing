// The marked-side check shared by test/r0-obligations-equal.test.mjs
// (healthy build, canonical erasure) and the probes in
// test/regression-r0-amin-equal.mjs (the compiler under test, whose
// classes are not the healthy build's, so values are read as plain data).
// The caller supplies a kit, so one check runs over either:
//   pairs(map)   a Data.Map's [key, value] pairs
//   pathOf(path) a path as comparable plain data ({ root, steps })
//   erased(mty)  a marked type's erasure, as a string
//   marks(mty)   a marked type with its marks, as a string
const key = JSON.stringify;

// The declaration's recorded marked types with the path each hangs at
// (the signature's, at no path), each with its erasure.
export const recordedTypes = (effects, kit) => {
  const at = (path, mty) => ({ path, mty, erased: kit.erased(mty) });
  const found = [];
  for (const name of ['nodes', 'annotations'])
    for (const [path, mty] of kit.pairs(effects[name]))
      found.push(at(kit.pathOf(path), mty));
  const sigs = [[null, effects.signature],
    ...kit.pairs(effects.instances).map(([path, sig]) =>
      [kit.pathOf(path), sig])];
  for (const [path, sig] of sigs)
    for (const mty of [...sig.parameters, sig.result])
      found.push(at(path, mty));
  return found;
};

export const under = (path, base) => path === null ||
  (path.root !== undefined && key(path.root) === key(base.root)
    && key(path.steps.slice(0, base.steps.length)) === key(base.steps));

// Marked sides. A side's candidates are the recorded types with its
// erasure, at the atom's path or under it, or in the signature. The
// check accepts the side when ANY candidate has equal erasure and equal
// marks. It never identifies the side's intended home: a different
// recorded type that happens to carry the same marks satisfies it. A
// side with no candidate is fresh-built (builtArrow, markedRecord):
// erasure only here, plus the namedIn scan in r0-marked-corpus.
export const markedSides = (at, id, base, item, recorded, found, kit) => {
  for (const side of [item.value.value0, item.value.value1]) {
    const erased = kit.erased(side);
    const options = recorded.filter(entry => entry.erased === erased &&
      under(entry.path, base));
    if (options.length === 0) { found.fresh += 1; continue; }
    found.checked += 1;
    if (!options.some(entry => kit.marks(entry.mty) === kit.marks(side)))
      found.problems.push(`${at}: marked side matches no recorded type`
        + ` at ${id}`);
  }
};
