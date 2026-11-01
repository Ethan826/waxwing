// The recorded mark classes (statements §5: union-find over E1's mark
// equalities): each `Equal` obligation's two marked types are walked in
// parallel and the marks met at one place are joined. Labels pair as
// match.mjs pairs them (same effect, first unused). This repeats, in a
// simplified form, what the validator's E1 does; it is research
// machinery shared in idea with Effects.Equal, disclosed in README.md.
import { keyOf, named } from './shape.mjs';

export const unionFind = () => {
  const parent = new Map();
  const find = key => {
    if (!parent.has(key)) parent.set(key, key);
    const up = parent.get(key);
    if (up === key) return key;
    const root = find(up);
    parent.set(key, root);
    return root;
  };
  const union = (one, other) => parent.set(find(one), find(other));
  return { find, union, keys: () => [...parent.keys()] };
};

const markKey = mark => (named(mark) === 'At' ? keyOf(mark.value0)
  : `written ${keyOf(mark.value0)}`);

const sameEffect = (one, other) => keyOf(one.effect) === keyOf(other.effect);

const rows = (classes, one, other) => {
  const used = new Set();
  for (const label of one.labels) {
    const index = other.labels.findIndex((each, i) => !used.has(i)
      && sameEffect(label, each));
    if (index < 0) continue;
    used.add(index);
    labels(classes, label, other.labels[index]);
  }
};
const labels = (classes, one, other) => {
  classes.union(markKey(one.mark), markKey(other.mark));
  one.args.forEach((arg, i) => types(classes, arg, other.args[i]));
};
const types = (classes, one, other) => {
  if (one === undefined || other === undefined) return;
  if (named(one) !== named(other)) return;
  switch (named(one)) {
  case 'MArrow':
    types(classes, one.value0, other.value0);
    rows(classes, one.value1, other.value1);
    return types(classes, one.value2, other.value2);
  case 'MData':
    one.value1.forEach((arg, i) => types(classes, arg, other.value1[i]));
    return one.value2.forEach((row, i) => other.value2[i]
      && rows(classes, row, other.value2[i]));
  case 'MRecord':
    return one.value0.forEach(field => {
      const found = other.value0.find(each => each.value0 === field.value0);
      if (found) types(classes, field.value1, found.value1);
    });
  case 'MHandler':
    labels(classes, one.value0, other.value0);
    rows(classes, one.value1.inference, other.value1.inference);
    if (named(one.value1.clauses) === 'Just'
      && named(other.value1.clauses) === 'Just')
      rows(classes, one.value1.clauses.value0, other.value1.clauses.value0);
    return;
  default:
  }
};

// The classes of every recorded position (keyed by `keyOf`), from the
// problem's `Equal` obligations.
export const recordedClasses = (effects, positions) => {
  const classes = unionFind();
  for (const position of positions) classes.find(keyOf(position));
  for (const placed of effects.obligations) {
    const value = placed.value;
    if (named(value) === 'Equal') types(classes, value.value0, value.value1);
  }
  return classes;
};
