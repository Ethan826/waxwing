// The pure half of the coverage check (test/r0-effects-coverage.test.mjs,
// and the regression probe test/regression-r0-amin-coverage.mjs, which
// reads a compiler under test): which recorded obligations satisfy a
// fixture row. It loads nothing, so both callers supply the obligations.
const named = value => value.constructor.name;

// A value's constructor names and whether it holds a handler type that
// owns a C (an MHandler whose `clauses` is `Just`), by explicit stack.
const scan = value => {
  const names = new Set();
  const seen = new Set();
  const pending = [value];
  while (pending.length > 0) {
    const item = pending.pop();
    if (item === null || typeof item !== 'object' || seen.has(item))
      continue;
    seen.add(item);
    names.add(named(item));
    if (named(item) === 'MHandler' && named(item.value1.clauses) === 'Just')
      names.add('OwnedC');
    pending.push(...Object.values(item));
  }
  return names;
};

const siteOf = (decl, item) => {
  const rule = `${{ SigRule: 'Sig', ExprRule: 'E', PatternRule: 'P' }[
    named(item.rule)]}${item.rule.value0}`;
  const role = named(item.provenance) === 'AtSite'
    ? `:${named(item.provenance.value0.role)}` : '';
  return `${decl}:${rule}${role}`;
};

// "Equal[MHandler,Opened]" is the kind `Equal` whose two sides hold the
// named constructors (OwnedC: a handler type with its own C).
const specOf = text => {
  const [, kind, tokens] = /^(\w+)(?:\[(.*)\])?$/.exec(text);
  return { kind, tokens: tokens === undefined ? [] : tokens.split(',') };
};

// The problems found, [] when the row's obligation kind is recorded at
// its site with the content its spec names.
export const recordedProblems = (obligations, row) => {
  const [decl] = row.site.split(':');
  const { kind, tokens } = specOf(row.obligation);
  const here = obligations.filter(item => named(item.value) === kind
    && siteOf(decl, item) === row.site);
  const holding = here.filter(item => {
    const names = scan(item.value);
    return tokens.every(token => names.has(token));
  });
  return [...(here.length === 0 ? [`no ${kind} at ${row.site}`] : []),
    ...(here.length > 0 && holding.length === 0
      ? [`${kind} at ${row.site} lacks ${tokens.join(', ')}`] : [])];
};
