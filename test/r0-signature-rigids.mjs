// The consistency check between a declaration's recorded signature and
// its recorded rigid lists (a-min statements section 3 and 10; Task 23).
// Over the shaped values of test/regression-r0-amin-support.mjs `shape`
// (a constructor as `{ Name: [fields] }`), by an explicit stack: the
// rigid effect-row variables (`EffRigid v`) and rigid marks (`Written
// (FixedRigid k)`) the signature names at any depth, handler types'
// rows and clause rows included.
export const namedRigids = signature => {
  const rigids = new Set();
  const marks = new Set();
  const pending = [signature];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (value.EffRigid) rigids.add(value.EffRigid[0]);
    if (value.FixedRigid) marks.add(value.FixedRigid[0]);
    pending.push(...Object.values(value));
  }
  return { rigids, marks };
};

// What is named but not listed (the required direction) and what is
// listed but not named (the converse), on shaped effects.
export const rigidFindings = (at, effects) => {
  const named = namedRigids(effects.signature);
  const rigids = new Set(effects.effectRigids);
  const marks = new Set(effects.rigidMarks);
  const absent = (found, listed) => [...found].filter(x => !listed.has(x));
  return {
    unlistedRigids: absent(named.rigids, rigids)
      .map(v => `${at}: EffRigid ${v} is not in effectRigids`),
    unlistedMarks: absent(named.marks, marks)
      .map(k => `${at}: FixedRigid ${k} is not in rigidMarks`),
    unnamedRigids: absent(rigids, named.rigids)
      .map(v => `${at}: effectRigids lists ${v}, the signature does not`),
    unnamedMarks: absent(marks, named.marks)
      .map(k => `${at}: rigidMarks lists ${k}, the signature does not`)
  };
};
