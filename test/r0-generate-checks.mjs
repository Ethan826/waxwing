// RT6 and RT7 (T-R0b §9 items 6, 7) as checks over one declaration's
// canonical problem; each returns its findings, [] when it holds.
import { entryLists, key, mentioned } from './r0-generate-support.mjs';
import { sameSpan, spanAt, within } from './r0-generate-paths.mjs';

// Rules whose entries carry a label's or an item's span inside the node
// (T-R0b §6 "Span"): Sig4, E25-E28.
const perLabel = new Set(['Sig4', 'E25', 'E26', 'E27', 'E28']);

const allEntries = problem => entryLists.flatMap(list => problem[list]);

// RT6: every entry's path resolves to a node whose span is the recorded
// span, or, per label, contains it.
export const originFindings = (decl, problem) => allEntries(problem)
  .flatMap(entry => {
    const { path } = entry.origin.atom;
    let span;
    try { span = spanAt(decl, path); } catch (error) {
      return [`${entry.origin.rule} ${JSON.stringify(path)}: ${error.message}`];
    }
    const fits = sameSpan(span, entry.origin.span)
      || (perLabel.has(entry.origin.rule) && within(entry.origin.span, span));
    return fits ? [] : [`${entry.origin.rule} at ${JSON.stringify(path)}`
      + ' has a span outside its node'];
  });

const sortsOf = decl => decl.sorts.map(sort => sort.constructor.name);

// RT7, first part: every variable an entry, type or site mentions is in
// `vars`; `Forall` ones are exactly Sig1's (`f`'s type and record-row
// variables); a fresh key agrees with its origin's path and role, a
// rigid one has no role; every variable path resolves.
export const varFindings = (decl, problem) => {
  const known = new Set(problem.vars.map(([variable]) => key(variable)));
  const used = mentioned([entryLists.map(list => problem[list]
    .map(entry => entry.value)), problem.types.map(([, ty]) => ty)]);
  const missing = used.filter(variable => !known.has(key(variable)))
    .map(variable => `not in vars: ${key(variable)}`);
  const sig1 = sortsOf(decl).flatMap((sort, index) =>
    sort === 'RowSort' ? [] : [index]);
  const forall = problem.vars.filter(([, info]) => info.quant !== 'exists')
    .map(([variable]) => variable.rigid);
  const quantified = JSON.stringify(forall) === JSON.stringify(sig1) ? []
    : [`Forall ${JSON.stringify(forall)} is not Sig1's`
      + ` ${JSON.stringify(sig1)}`];
  const agreement = problem.vars.flatMap(([variable, info]) => {
    const fine = 'rigid' in variable ? info.origin.role === null
      : key(variable.fresh.path) === key(info.origin.path)
        && key(variable.fresh.role) === key(info.origin.role);
    return fine ? [] : [`key and origin differ: ${key(variable)}`];
  });
  return [...missing, ...quantified, ...agreement];
};

const freshAt = (variable, path) => 'fresh' in variable
  && key(variable.fresh.path) === key(path);

// The variables of a record expression, and whether it is a record of
// distinct variables only (§5.3's right side).
const recordVars = value => value.record === undefined ? null
  : [...value.record.fields.map(([, field]) => field.tvar),
    ...value.record.tails];

// RT7, second part: every auxiliary has exactly one defining atom of
// §5.3's table: an `eq` by its rule at its path whose right side is a
// record of variables of this node holding it, whose left side (the
// operand) mentions no variable of this node.
export const auxiliaryFindings = problem => problem.vars
  .filter(([, info]) => info.position === 'auxiliary')
  .flatMap(([variable, info]) => {
    const defining = problem.b.filter(entry => {
      if (entry.value.eq === undefined) return false;
      if (entry.origin.rule !== info.origin.rule) return false;
      if (key(entry.origin.atom.path) !== key(info.origin.path)) return false;
      const [operand, shape] = entry.value.eq;
      const parts = recordVars(shape);
      return parts !== null && parts.every(part => part !== undefined
        && freshAt(part, info.origin.path))
        && parts.some(part => key(part) === key(variable))
        && mentioned(operand).every(part =>
          !freshAt(part, info.origin.path));
    });
    return defining.length === 1 ? []
      : [`${key(variable)} has ${defining.length} defining atoms`];
  });

export const problemFindings = (decl, problem) => [
  ...originFindings(decl, problem), ...varFindings(decl, problem),
  ...auxiliaryFindings(problem)];
