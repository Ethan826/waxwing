// The holes walk agreement check (dossier §18.161 (6); findings in
// docs/plans/2026-11-04-holes-numbering-findings.md), shared by the
// generated test (test/r0-holes-walks.test.mjs) and the corpus test
// (test/r0-holes-corpus.serial.test.mjs). `holes` numbers a body's metas
// by one walk (`numbering`: `foldTypes`, then `foldHoles` in each type)
// and renames them by another (`retype`, then `rename`); a meta the
// renaming meets and the numbering missed would stay raw and could
// collide with a hole number. The implementations are injected, so the
// planted must-fail cases run the same checks on a broken walk.
//
// The oracle is a generic walk of the runtime value: every `Hole`
// instance anywhere in it, whatever constructor holds it, so it does
// not share the walks' constructor lists.

// Every meta in a compiled PureScript value, with repeats.
export const metasOf = (Open, value) => {
  const found = [];
  const stack = [value];
  while (stack.length > 0) {
    const item = stack.pop();
    if (item === null || typeof item !== 'object') continue;
    if (item instanceof Open.Hole) found.push(item.value0);
    else if (Array.isArray(item)) stack.push(...item);
    else stack.push(...Object.values(item));
  }
  return found;
};

// A copy of a compiled value with `change` applied first at every node:
// it returns a replacement, or `undefined` to copy the node as it is.
export const rebuilt = (value, change) => {
  const replaced = change(value);
  if (replaced !== undefined) return replaced;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => rebuilt(item, change));
  const copy = Object.create(Object.getPrototypeOf(value));
  for (const [key, item] of Object.entries(value))
    copy[key] = rebuilt(item, change);
  return copy;
};

const counted = items => {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

export const sameMultiset = (left, right) => {
  const one = counted(left);
  const other = counted(right);
  return one.size === other.size
    && [...one].every(([item, count]) => other.get(item) === count);
};

const sorted = items => [...new Set(items)].sort((a, b) => a - b);

// The production implementations, from the compiled modules.
export const productionWalks = M => ({
  foldTypes: M.Walk.foldTypes,
  retype: M.Walk.retype,
  foldHoles: M.Holes.foldHoles,
  rename: change => M.Core.rename(M.Open.ordOpen)(change),
  numbering: M.Holes.numbering,
  holes: M.Holes.holes,
});

// The checks on one body, each a list of failure descriptions (empty
// when it holds); names as in the findings: E, T, H1, H2.
export const bodyChecks = (M, walks) => body => {
  const pairs = map => M.Map.toUnfoldable(M.Unfoldable.unfoldableArray)(map)
    .map(pair => [pair.value0, pair.value1]);
  const folded = walks.foldTypes(found => () => ty => {
    found.push(ty);
    return found;
  })([])(body);
  const changed = [];
  walks.retype(ty => {
    changed.push(ty);
    return ty;
  })(body);
  const E = sameMultiset(folded, changed) ? []
    : [`foldTypes met ${folded.length} types, retype ${changed.length}`];
  const T = changed.flatMap(typeCheck(M, walks));
  const numbered = pairs(walks.numbering(body));
  const keys = new Set(numbered.map(pair => pair[0]));
  const unnumbered = sorted(metasOf(M.Open, body)).filter(m => !keys.has(m));
  const H1 = unnumbered.length === 0 ? []
    : [`metas ${unnumbered.join(', ')} are not in the numbering`];
  const values = sorted(numbered.map(pair => pair[1]));
  const renamed = sorted(metasOf(M.Open, walks.holes(body)));
  const contiguous = values.every((value, index) => value === index);
  const H2 = contiguous && renamed.join() === values.join() ? []
    : [`renamed metas [${renamed}] against numbers [${values}]`];
  return { E, T, H1, H2 };
};

// T on one type: the metas `foldHoles` steps on, those `rename` applies
// its function to, and the generic walk's, as multisets.
export const typeCheck = (M, walks) => ty => {
  const stepped = walks.foldHoles(found => meta => {
    found.push(meta);
    return found;
  })([])(ty);
  const renamedMetas = [];
  walks.rename(variable => {
    if (variable instanceof M.Open.Hole) renamedMetas.push(variable.value0);
    return variable;
  })(ty);
  const generic = metasOf(M.Open, ty);
  return sameMultiset(stepped, renamedMetas)
    && sameMultiset(stepped, generic) ? []
    : [`foldHoles [${stepped}], rename [${renamedMetas}], `
      + `generic [${generic}]`];
};

// Failures per property over many bodies, with the first example each.
export const tally = (check, bodies) => {
  const failures = { E: 0, T: 0, H1: 0, H2: 0 };
  const first = {};
  for (const body of bodies) {
    const found = check(body);
    for (const name of Object.keys(failures))
      if (found[name].length > 0) {
        failures[name] += 1;
        first[name] ??= found[name][0];
      }
  }
  return { failures, first };
};

// Planted walks, each broken in one way (the must-fail cases).
// `holes` as Holes.purs does it (renaming every type `retype` visits by
// `rename`), but by a given numbering.
const holesBy = (M, numbering) => body => {
  const real = productionWalks(M);
  const named = numbering(body);
  const renumber = variable => variable instanceof M.Open.Hole
    ? new M.Open.Hole(M.Maybe.maybe(variable.value0)(number => number)(
      M.Map.lookup(M.Ord.ordInt)(variable.value0)(named)))
    : variable;
  return real.retype(real.rename(renumber))(body);
};

// A numbering without `meta`. A wiring check: it removes a key after
// the walk, so it shows the checks read the numbering, not that they
// see a walk diverge.
export const missingMeta = (M, meta) => {
  const numbering = body => M.Map.delete(M.Ord.ordInt)(meta)(
    M.Holes.numbering(body));
  return { ...productionWalks(M), numbering,
    holes: holesBy(M, numbering) };
};

// `foldHoles` run on the type with every label's arguments removed.
export const droppingLabels = M => {
  const real = productionWalks(M);
  const strip = value => value instanceof M.Row.Label
    ? new M.Row.Label(value.value0, [], value.value2) : undefined;
  return { ...real,
    foldHoles: step => found => ty => real.foldHoles(step)(found)(
      rebuilt(ty, strip)) };
};

// `foldTypes` run on the body with each named rest's type replaced.
// Every other type is kept by reference, so E fails only where a named
// rest is.
const types = ['TInt', 'TBool', 'TData', 'TVar', 'TFun', 'TUnit',
  'THandler', 'TText', 'TRecord'];
const withoutRests = M => body => {
  const isType = value => types.some(name => value instanceof M.Core[name]);
  const strip = value => {
    if (value instanceof M.Open.NamedRest)
      return new M.Open.NamedRest(value.value0, M.Core.TInt.value);
    return isType(value) ? value : undefined;
  };
  return rebuilt(body, strip);
};

export const droppingRests = M => {
  const real = productionWalks(M);
  return { ...real,
    foldTypes: step => found => body => real.foldTypes(step)(found)(
      withoutRests(M)(body)) };
};

// The walk-level divergence carried into the numbering: the production
// `numbering` run on the body as the stripped `foldTypes` sees it (named
// rests' types unvisited), and `holes` renaming the whole body by it.
// A meta only in a named rest's type stays raw: H1 must fail.
export const restsUnnumbered = M => {
  const numbering = body => M.Holes.numbering(withoutRests(M)(body));
  return { ...droppingRests(M), numbering, holes: holesBy(M, numbering) };
};

// The `Node` constructors, read from the source's `data Node`
// declaration, so a constructor added there fails the coverage test
// until the generator draws it.
export const nodeNames = source => {
  const block = source.slice(source.indexOf('data Node\n'));
  const end = block.search(/\n\n(type|data|newtype) /);
  return [...block.slice(0, end).matchAll(/^ {2}[=|] (\w+)/gm)]
    .map(found => found[1]);
};

export const modulesOf = async load => ({
  Core: await load('Domain.Type.Core'), Row: await load('Domain.Row'),
  Open: await load('Domain.Checked.Internal'), Maybe: await load('Data.Maybe'),
  Tuple: await load('Data.Tuple'), Syntax: await load('Domain.Syntax.Core'),
  Map: await load('Data.Map.Internal'), Unfoldable: await load(
    'Data.Unfoldable'), Ord: await load('Data.Ord'),
  Walk: await load('Features.Check.Walk'),
  Holes: await load('Features.Check.Holes'),
});
