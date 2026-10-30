// The pure half of the coverage check (test/r0-effects-coverage.test.mjs,
// and the regression probe test/regression-r0-amin-coverage.mjs, which
// reads a compiler under test): which recorded obligations satisfy a
// fixture row. It loads nothing, so both callers supply the obligations.
import { shape } from './regression-r0-amin-support.mjs';

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

// `decl:Rule[:Role[:SiteKind]]`: a consumption's role names its site
// kind (`Consumed:AtCall`); its ordinal among that kind's stages is left
// out, so a row names the site and not which stage.
const roleOf = role => named(role) === 'Consumed'
  ? `Consumed:${named(role.value0)}` : named(role);

const siteOf = (decl, item) => {
  const rule = `${{ SigRule: 'Sig', ExprRule: 'E', PatternRule: 'P' }[
    named(item.rule)]}${item.rule.value0}`;
  const role = named(item.provenance) === 'AtSite'
    ? `:${roleOf(item.provenance.value0.role)}` : '';
  return `${decl}:${rule}${role}`;
};

// "Equal[MHandler,Opened]" is the kind `Equal` whose sides hold the
// named constructors (OwnedC: a handler type with its own C; ToDeclared,
// for `Consume`: the target is the declaration's own row, E10).
const specOf = text => {
  const [, kind, tokens] = /^(\w+)(?:\[(.*)\])?$/.exec(text);
  return { kind, tokens: tokens === undefined ? [] : tokens.split(',') };
};

const sameRow = (left, right) => JSON.stringify(shape(left))
  === JSON.stringify(shape(right));

const holds = (effects, item, token) => token === 'ToDeclared'
  ? sameRow(item.value.value0.target, effects.signature.row)
  : scan(item.value).has(token);

// `Ambient` is no obligation: E11's ambient rows are recorded beside
// them (`effects.ambient`), so its site is `decl:Ambient` and its tokens
// name constructors held by the declaration's ambient rows.
const ambientProblems = (effects, row, tokens) => {
  const names = scan(effects.ambient);
  const lacking = tokens.filter(token => !names.has(token));
  return lacking.length === 0 ? []
    : [`ambient rows at ${row.site} lack ${lacking.join(', ')}`];
};

// The problems found, [] when the row's obligation kind is recorded at
// its site with the content its spec names.
export const recordedProblems = (effects, row) => {
  const [decl] = row.site.split(':');
  const { kind, tokens } = specOf(row.obligation);
  if (kind === 'Ambient') return ambientProblems(effects, row, tokens);
  const here = effects.obligations.filter(item => named(item.value) === kind
    && siteOf(decl, item) === row.site);
  const holding = here.filter(item =>
    tokens.every(token => holds(effects, item, token)));
  return [...(here.length === 0 ? [`no ${kind} at ${row.site}`] : []),
    ...(here.length > 0 && holding.length === 0
      ? [`${kind} at ${row.site} lacks ${tokens.join(', ')}`] : [])];
};

// A row's own obligation and each further one it names (`also`).
export const rowProblems = (effectsAt, row) => [row, ...(row.also ?? [])]
  .flatMap(part => recordedProblems(effectsAt(part.site.split(':')[0]),
    part));
