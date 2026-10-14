// Operation spellings in the generated FX001 corpus (FX020 design §1). A
// function writes its operations bare (the legacy globals, until FX020
// Task 7: 20%), qualified (`Log.log`: 50%) or through imports of its own
// row (`Log { log as note }`: 30%, qualifying what it does not import);
// any but a bare one may alias an effect of its row, and then spells that
// effect through the alias and the canonical name in turn. The scheme is
// drawn from a stream of its own, so a seed gives the program shape it
// gave before FX020; only the spelling changed.
import { rng } from './fx-gen-rng.mjs';

const effectOf = { log: 'Log', tick: 'Tick', print: 'Console', fail: 'Fail' };
const operationOf = { Log: 'log', Tick: 'tick', Console: 'print',
  Fail: 'fail' };
// By row item (an effect with its arguments): the alias and the rename.
const aliases = { Log: 'L', Tick: 'T', Console: 'C', 'Fail(Err)': 'F',
  'Fail(Oops)': 'G' };
const renames = { Log: 'note', Tick: 'step', Console: 'say',
  'Fail(Err)': 'raiseErr', 'Fail(Oops)': 'raiseOops' };
const modes = ['bare', 'bare', 'qualified', 'qualified', 'qualified',
  'qualified', 'qualified', 'imports', 'imports', 'imports'];

export const namer = seed => rng(seed ^ 0x2f020);

// One written row item ('nofail Log', 'Fail(Err)', ...) of a scheme.
const decorate = (r, mode, item, names) => {
  const effect = item.replace(/^nofail /, '');
  const operation = operationOf[effect.replace(/\(.*$/, '')];
  const alias = aliases[effect] && r.chance(30) ? aliases[effect] : null;
  if (alias) names.aliases.set(effect, alias);
  const aliased = alias ? `${item} as ${alias}` : item;
  if (mode !== 'imports' || !operation || !r.chance(65)) return aliased;
  const taken = [...names.imports.values()].includes(operation);
  const local = taken || r.chance(50) ? renames[effect] : operation;
  names.imports.set(effect, local);
  const listed = local === operation ? local : `${operation} as ${local}`;
  return `${aliased} { ${listed} }`;
};

// { mode, aliases, imports (both by row item), rowText (as written) }.
export const scheme = (r, rowText) => {
  const mode = r.pick(modes);
  const names = { mode, aliases: new Map(), imports: new Map() };
  const items = rowText ? rowText.split(' + ') : [];
  names.rowText = mode === 'bare' ? rowText
    : items.map(item => decorate(r, mode, item, names)).join(' + ');
  return names;
};

// The name a call is written with; an operation's row item is its effect,
// or for `fail` the family of its payload.
export const speller = names => {
  let count = 0;
  return node => {
    const effect = effectOf[node.name];
    if (!effect || !names || names.mode === 'bare') return node.name;
    const item = effect === 'Fail' ? `Fail(${node.args[0]?.ty})` : effect;
    if (names.imports.has(item)) return names.imports.get(item);
    const alias = names.aliases.get(item);
    return `${alias && count++ % 2 === 0 ? alias : effect}.${node.name}`;
  };
};
