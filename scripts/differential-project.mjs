// The projections of scripts/differential.mjs: how a result is hashed so
// that a baseline from before a representation change agrees with the
// candidate wherever the programs do. Each says which change it undoes.
import { createHash } from 'node:crypto';

// Tokens gained a `kind` (Text v1 Task 2); a Plain token is compared
// without it, so a baseline without kinds agrees wherever the tokens do.
export const withoutPlain = tokens => Array.isArray(tokens)
  ? tokens.map(token => token.kind?.constructor?.name === 'Plain'
    ? { text: token.text, span: token.span } : token) : tokens;

// R001 Task 7: the monomorphic IR gained `records`, its record layouts. A
// program without records has none, so it is compared without the field
// and a baseline from before records agrees wherever the IR does.
export const withoutNoRecords = program => {
  if (!Array.isArray(program.records) || program.records.length > 0) {
    return program;
  }
  const { records: _, ...rest } = program;
  return rest;
};

// R001 Task 8: a checked function gained `sorts`, its signature's
// variable sorts copied from the resolved declaration (compared in the
// resolve phase). The check phase is compared without the copy, so a
// baseline from before it agrees wherever the checked IR does.
export const withoutSorts = program => ({
  ...program,
  functions: program.functions.map(({ sorts: _, ...rest }) => rest)
});

// R005 Task 1: a declaration gained `constraints`, its written `where`
// clauses (parsed and resolved). A declaration with none is compared
// without the field, so a baseline from before R005 agrees wherever the
// syntax does.
export const withoutNoConstraints = program => ({
  ...program,
  functions: program.functions.map(declaration =>
    declaration.constraints?.length === 0
      ? Object.fromEntries(Object.entries(declaration)
        .filter(([key]) => key !== 'constraints'))
      : declaration)
});

// R005 Task 1: a record pattern's rest was a span (Maybe) or a Boolean and
// is a Rest record or NoRest/IgnoredRest. Hashed as before, so a baseline
// from before R005 agrees wherever the patterns do.
const restAsBefore = pattern => {
  const found = pattern.value2;
  const span = found?.constructor?.name === 'Just' && found.value0.span;
  if (!span) return pattern;
  const just = Object.assign(Object.create(Object.getPrototypeOf(found)),
    { value0: span });
  return Object.assign(Object.create(Object.getPrototypeOf(pattern)),
    pattern, { value2: just });
};
const booleanRests = { NoRest: false, IgnoredRest: true };

// R005 Task 2: a resolved declaration gained `introduced`, where each of
// its record row variables is introduced, derived from the signature the
// resolve phase compares anyway. Compared without it, with the empty
// `constraints` of Task 1.
export const withoutIntroduced = program => ({
  ...program,
  functions: program.functions.map(declaration => {
    const { introduced: _, ...rest } = withoutNoConstraints(
      { functions: [declaration] }).functions[0];
    return rest;
  })
});

// R005 Task 3: the monomorphic IR's record pattern gained its rest. A
// pattern with none or a bare `...` was `Record fields` and is hashed so.
const plainRecord = item => item?.constructor?.name === 'Record'
  && item.value1?.constructor?.name in booleanRests;

// Iterative, so a deeply nested IR cannot overflow the JS stack. With
// `monomorphic` the IR's records are hashed as they were before R005.
export const digest = (value, monomorphic = false) => {
  const hash = createHash('sha1');
  const pending = [value];
  while (pending.length > 0) {
    const popped = pending.pop();
    const item = popped?.constructor?.name === 'PRecord'
      ? restAsBefore(popped) : popped;
    if (item?.constructor?.name in booleanRests) {
      hash.update(`boolean:${booleanRests[item.constructor.name]};`);
    } else if (item === null || typeof item !== 'object') {
      hash.update(`${typeof item}:${String(item)};`);
    } else if (Array.isArray(item)) {
      hash.update(`[${item.length};`);
      for (let index = item.length - 1; index >= 0; index--) {
        pending.push(item[index]);
      }
    } else {
      const keys = Object.keys(item).filter(key =>
        !(monomorphic && key === 'value1' && plainRecord(item))).sort();
      hash.update(`{${item.constructor?.name}:${keys.join(',')};`);
      for (let index = keys.length - 1; index >= 0; index--) {
        pending.push(item[keys[index]]);
      }
    }
  }
  return hash.digest('hex');
};
