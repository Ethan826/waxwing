// Operation spellings in the generated FX001 corpus (FX020 design §1). A
// function writes its operations qualified (`Log.log`: 70%) or through
// imports of its own row (`Log { log as note }`: 30%, qualifying what it
// does not import); an effect the body performs is imported more often
// than one it does not. Either may alias an effect of its row, and then
// spells that effect through the alias and the canonical name in turn.
// Bare operation names are unbound (Task 7), so there is no bare mode. The
// scheme is drawn from a stream of its own, so a seed gives the program
// shape it gave before FX020; only the spelling changed.
import { rng } from './fx-gen-rng.mjs';

const effectOf = { log: 'Log', tick: 'Tick', print: 'Console', fail: 'Fail' };
const operationOf = { Log: 'log', Tick: 'tick', Console: 'print',
  Fail: 'fail' };
// By row item (an effect with its arguments): the alias and the rename.
const aliases = { Log: 'L', Tick: 'T', Console: 'C', 'Fail(Err)': 'F',
  'Fail(Oops)': 'G' };
const renames = { Log: 'note', Tick: 'step', Console: 'say',
  'Fail(Err)': 'raiseErr', 'Fail(Oops)': 'raiseOops' };
const modes = ['qualified', 'qualified', 'qualified', 'qualified',
  'qualified', 'qualified', 'qualified', 'imports', 'imports', 'imports'];

export const namer = seed => rng(seed ^ 0x2f020);

// One written row item ('nofail Log', 'Fail(Err)', ...) of a scheme.
const decorate = (r, mode, item, names, performed) => {
  const effect = item.replace(/^nofail /, '');
  const likely = !performed || performed.has(effect) ? 85 : 30;
  const operation = operationOf[effect.replace(/\(.*$/, '')];
  const alias = aliases[effect] && r.chance(30) ? aliases[effect] : null;
  if (alias) names.aliases.set(effect, alias);
  const aliased = alias ? `${item} as ${alias}` : item;
  if (mode !== 'imports' || !operation || !r.chance(likely)) return aliased;
  const taken = [...names.imports.values()].includes(operation);
  const local = taken || r.chance(50) ? renames[effect] : operation;
  names.imports.set(effect, local);
  const listed = local === operation ? local : `${operation} as ${local}`;
  return `${aliased} { ${listed} }`;
};

// { mode, aliases, imports (both by row item), rowText (as written) }.
// `performed`: the row items the body's calls name (null: unknown).
export const scheme = (r, rowText, performed = null) => {
  const mode = r.pick(modes);
  const names = { mode, aliases: new Map(), imports: new Map() };
  const items = rowText ? rowText.split(' + ') : [];
  names.rowText = items.map(item => decorate(r, mode, item, names, performed))
    .join(' + ');
  return names;
};

// An operation call's row item: its effect, or for `fail` the family of
// its payload.
const itemOf = node => (node.name === 'fail' ? `Fail(${node.args[0]?.ty})`
  : effectOf[node.name]);

// The row items the operation calls in a tree name.
export const performedItems = (node, found = new Set()) => {
  if (node === null || typeof node !== 'object') return found;
  if (node.k === 'call' && effectOf[node.name]) found.add(itemOf(node));
  for (const child of Object.values(node)) performedItems(child, found);
  return found;
};

// The name a call is written with.
export const speller = names => {
  let count = 0;
  return node => {
    const effect = effectOf[node.name];
    if (!effect) return node.name;
    if (!names) return `${effect}.${node.name}`;
    const item = itemOf(node);
    if (names.imports.has(item)) return names.imports.get(item);
    const alias = names.aliases.get(item);
    return `${alias && count++ % 2 === 0 ? alias : effect}.${node.name}`;
  };
};
