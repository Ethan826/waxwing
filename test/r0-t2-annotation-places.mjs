// The contents check of tranche 2 Task 3's effect re-pin (§18.155 (1)),
// read by test/r0-t2-annotation-repin.serial.test.mjs. Given one
// declaration's canonical effect encoding (test/r0-effects-canonical.mjs)
// before and after the generation correction (design §B.2), and its
// implicit row VarId ι, it walks both together and names every problem:
// any difference other than the tail `EffRigid ι` become `EffFresh p
// EffectOf`, or such a rename outside the annotation's places. Pinned per
// rename, as exactly as the encoding allows:
// - `annotations`: the entry's own lambda is p (its key less
//   `Lambda/params/k`);
// - `nodes`, `obligations`: the rename lies in a copy of p's lambda node
//   type (the lambda's value reaching a use by identity, anywhere), or in
//   a copy of one of p's recorded annotation types or its handler R row
//   (the parameter's local), owned by a node or provenance path at or
//   under p, where that local is in scope;
// - any other field is a problem.
// And p is an annotated lambda whose `EffectOf` is minted; `flexEff` and
// `positions` are unchanged.
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isPlain = value => value !== null && typeof value === 'object'
  && !Array.isArray(value);
const effectOf = path => ({ EffFresh: [path, { EffectOf: [] }] });
const lambdaOf = key => ({ ...key, steps: key.steps.slice(0, -3) });

// Every place the encodings differ: a rename `{ path, trail }` or an
// `other` difference.
export const differences = (before, after, implicit, trail = []) => {
  if (same(before, after)) return [];
  if (same(before, { EffRigid: [implicit] })
    && same(after?.EffFresh?.[1], { EffectOf: [] }))
    return [{ path: after.EffFresh[0], trail }];
  const both = Array.isArray(before) && Array.isArray(after)
    && before.length === after.length;
  const objects = isPlain(before) && isPlain(after)
    && same(Object.keys(before), Object.keys(after));
  if (!both && !objects) return [{ other: true, trail }];
  return Object.keys(before).flatMap(name => differences(before[name],
    after[name], implicit, [...trail, name]));
};

// Every path a value names (a provenance's), by explicit stack.
const pathsIn = value => {
  const found = [];
  const pending = [value];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== 'object') continue;
    if (item.root !== undefined && Array.isArray(item.steps)) found.push(item);
    else pending.push(...Object.values(item));
  }
  return found;
};

const within = (path, lambda) => same(path.root, lambda.root)
  && same(path.steps.slice(0, lambda.steps.length), lambda.steps);

// The shortest enclosing value of the rename that is p's lambda type
// ('lambda') or one of p's annotation types or R rows ('local').
const copyOf = (after, rename) => {
  const node = after.nodes.find(([path]) => same(path, rename.path))?.[1];
  const annotated = after.annotations
    .filter(([key]) => same(lambdaOf(key), rename.path))
    .flatMap(([, ty]) => ty.MHandler ? [ty, ty.MHandler[1].inference]
      : [ty]);
  let value = after;
  for (const step of rename.trail) {
    if (node !== undefined && same(value, node)) return 'lambda';
    if (annotated.some(item => same(item, value))) return 'local';
    value = value[step];
  }
  return 'none';
};

const ownersOf = (after, [field, index]) => field === 'nodes'
  ? [after.nodes[index][0]] : pathsIn(after.obligations[index].provenance);

const placeProblem = (after, rename) => {
  const [field, index] = rename.trail;
  if (field === 'annotations')
    return same(lambdaOf(after.annotations[index][0]), rename.path)
      ? null : 'an annotation renamed to another lambda';
  if (field !== 'nodes' && field !== 'obligations')
    return `a rename in ${field}`;
  const copy = copyOf(after, rename);
  if (copy === 'lambda') return null;
  if (copy === 'local' && ownersOf(after, rename.trail)
    .some(path => within(path, rename.path))) return null;
  return `a rename in ${field} outside the annotation's places`;
};

const variableProblem = (before, rename) => {
  if (!before.annotations.some(([key]) => same(lambdaOf(key), rename.path)))
    return 'a rename to a lambda with no annotation';
  return before.flexEff.some(item => same(item, effectOf(rename.path)))
    ? null : 'a rename to an EffectOf never minted';
};

export const contentsProblems = (before, after, implicit) => {
  const found = differences(before, after, implicit);
  const renames = found.filter(item => !item.other);
  const problems = found.filter(item => item.other)
    .map(item => `another difference at ${item.trail.join('.')}`);
  for (const name of ['flexEff', 'positions'])
    if (!same(before[name], after[name])) problems.push(`${name} differs`);
  for (const rename of renames) problems.push(
    variableProblem(before, rename) ?? placeProblem(after, rename));
  return { renames, problems: problems.filter(item => item !== null) };
};
