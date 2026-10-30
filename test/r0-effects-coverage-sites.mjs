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
// for `Consume`: the target is the declaration's own row, E10). A token
// `source:Name` or `target:Name` is checked on that side alone (a
// consumption's source and target rows; an `Equal`'s left and right):
// the side the rule reads. A content token a row means as a consumption
// is written with its side, so the target alone cannot satisfy it
// (§18.124 ruling 3: recording a relevant token is not demonstrating
// validator behavior; rows that need more are `unfinished`).
const specOf = text => {
  const [, kind, tokens] = /^(\w+)(?:\[(.*)\])?$/.exec(text);
  return { kind, tokens: tokens === undefined ? [] : tokens.split(',') };
};

const sameRow = (left, right) => JSON.stringify(shape(left))
  === JSON.stringify(shape(right));

const sideOf = (item, side) => (named(item.value) === 'Consume'
  ? item.value.value0[side]
  : item.value[side === 'source' ? 'value0' : 'value1']);

const holds = (effects, item, token) => {
  const sided = /^(source|target):(.+)$/.exec(token);
  if (sided !== null) return scan(sideOf(item, sided[1])).has(sided[2]);
  return token === 'ToDeclared'
    ? sameRow(item.value.value0.target, effects.signature.row)
    : scan(item.value).has(token);
};

// A Data.Map's [key, value] pairs, by an explicit stack over its nodes
// (`Node size height key value left right`).
const mapPairs = map => {
  const pairs = [];
  const pending = [map];
  while (pending.length > 0) {
    const node = pending.pop();
    if (named(node) !== 'Node') continue;
    pairs.push([node.value2, node.value3]);
    pending.push(node.value4, node.value5);
  }
  return pairs;
};

// A body path as text: `Handle/body` for the steps `Named Handle`,
// `Named body` under the body root; an index step is its number.
const stepsText = path => (named(path.root) === 'InBody'
  ? path.steps.map(step => String(step.value0)).join('/') : null);

// `Ambient` is no obligation: E11's ambient rows are recorded beside
// them (`effects.ambient`), so its site is `decl:Ambient:path` (the body
// path of the one row, `Handle/body`), and its tokens name constructors
// held by that row alone.
const ambientProblems = (effects, row, tokens) => {
  const wanted = row.site.split(':')[2];
  const found = mapPairs(effects.ambient).filter(([path]) =>
    stepsText(path) === wanted);
  if (found.length !== 1)
    return [`${found.length} ambient rows at ${row.site}`];
  const names = scan(found[0][1]);
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
