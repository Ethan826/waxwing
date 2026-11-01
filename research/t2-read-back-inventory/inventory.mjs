// Task 1 of docs/plans/2026-11-01-tranche-2-read-back-plan.md: over the
// pinned R0 corpus, where today's live checker holds the value of each
// recorded effect variable and mark position. Prints JSON tallies; the
// README reads them. Corpus-observed, research only.
//   node research/t2-read-back-inventory/inventory.mjs [--examples N]
import { load } from '../../test/r0-generate-support.mjs';
import { corpus, declarationsOf, stageOf } from './corpus.mjs';
import { factsOf } from './sources.mjs';
import { recordedClasses } from './classes.mjs';
import { leastOfStore, leastVerdict } from './least.mjs';
import { markedOf } from './live.mjs';
import { keyOf, named } from './shape.mjs';

const { fields } = await load('Domain.Recorded');
const { forcedTails } = await load('Features.Check.Strategy.Effects.Forced');
const shown = 3;
const bump = (table, key, by = 1) => { table[key] = (table[key] ?? 0) + by; };
const note = (table, key, at) => {
  table[key] ??= [];
  if (table[key].length < shown && !table[key].includes(at))
    table[key].push(at);
};
const roleOf = v => (named(v) === 'EffRigid' ? 'EffRigid'
  : named(v.value1));
const kindOf = p => named(p);

const out = { stages: {}, mapped: {}, roles: {}, forced: {}, kinds: {},
  unreadWhere: {},
  examples: {}, misses: {}, written: {}, rigid: {}, sharing: {},
  shareExamples: {}, least: {}, markDiff: {}, cohort: {}, size: {},
  rigidDecls: {} };

// Mark.purs `violation` against the least-term verdict on the same live
// store, wherever the reconstruction reaches the marked state.
const markDiff = item => {
  const found = markedOf(item.program, item.decl);
  if (found === null) return bump(out.markDiff, 'not reached');
  const passes = leastVerdict(found.store);
  const key = `Mark.purs ${found.violates ? 'refuses' : 'accepts'}, least`
    + ` terms ${passes ? 'pass' : 'fail'}`;
  bump(out.markDiff, key);
  if (passes === found.violates) note(out.examples, `markDiff ${key}`,
    item.at);
};

// Declarations recording an `Unsupported` obligation (UnframedInstall,
// OperationWithRow) are tallied apart: their ambient records the outer
// row alone, so a frame read there is not the record's.
let scope = '';
const share = key => bump(out.sharing, scope + key);

const tallyOne = (item, group, key, facts, reads, at) => {
  const read = facts.filter(f => f.kind === reads);
  const texts = new Set(read.map(f => f.text));
  const row = (out[group][key] ??= { required: 0, located: 0,
    consistent: 0, unread: 0, sources: {} });
  row.required += 1;
  for (const f of read) bump(row.sources, f.where);
  if (read.length === 0) {
    row.unread += 1;
    note(out.examples, `${group} ${key}`, at);
    return false;
  }
  row.located += 1;
  if (texts.size === 1) row.consistent += 1;
  else {
    share(`${group} ${key}: one record, several live values`);
    note(out.shareExamples, `${group} ${key} split`, at);
  }
  return true;
};

const factIndex = facts => {
  const index = new Map();
  for (const f of facts) {
    const subject = f.variable ?? f.position;
    if (subject === undefined) continue;
    const key = keyOf(subject);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(f);
  }
  return index;
};

const marksShared = (item, effects, facts, at) => {
  const classes = recordedClasses(effects, effects.positions);
  const byMeta = new Map();
  for (const f of facts) if (f.kind === 'pos' && f.text.startsWith('m:')) {
    if (!byMeta.has(f.text)) byMeta.set(f.text, new Set());
    byMeta.get(f.text).add(keyOf(f.position));
  }
  for (const [, keys] of byMeta) {
    if (keys.size < 2) continue;
    const roots = new Set([...keys].map(classes.find));
    share(roots.size === 1 ? 'live meta shared within one recorded class'
      : 'live meta shared across recorded classes');
    if (roots.size > 1) note(out.shareExamples, 'mark across classes', at);
  }
  const byClass = new Map();
  for (const f of facts) if (f.kind === 'pos') {
    const root = classes.find(keyOf(f.position));
    if (!byClass.has(root)) byClass.set(root, new Set());
    byClass.get(root).add(f.text);
  }
  for (const [, texts] of byClass) if (texts.size > 1) {
    share('recorded class read as several live marks');
    note(out.shareExamples, 'class split', at);
  }
};

// Where an unread variable or position occurs: each table source with
// no live counterpart, or no table at all (obligations only).
const unreadAt = (name, mine) => {
  const where = new Set(mine.map(f => f.where));
  if (where.size === 0) bump(out.unreadWhere, `${name} <- obligations only`);
  for (const each of where) bump(out.unreadWhere, `${name} <- ${each}`);
};

// Within the mapped cohort, the required variables and positions.
const cohort = effects => {
  for (const v of effects.flexEff) bump(out.cohort, `role ${roleOf(v)}`);
  for (const p of effects.positions) bump(out.cohort, `kind ${kindOf(p)}`);
};

const inventory = item => {
  const at = item.at;
  const effects = fields(item.problem).effects;
  scope = effects.obligations.some(o => named(o.value) === 'Unsupported')
    ? '(Unsupported) ' : '';
  const facts = factsOf(item);
  const index = factIndex(facts);
  const forced = new Set(forcedTails(item.problem).map(f => keyOf(f.forced)));
  let all = true;
  for (const v of effects.flexEff) {
    const key = keyOf(v);
    const group = forced.has(key) ? 'forced' : 'roles';
    const mine = index.get(key) ?? [];
    const ok = tallyOne(item, group, roleOf(v), mine, 'var', at);
    if (!ok) unreadAt(roleOf(v), mine);
    if (group === 'roles') all &&= ok;
  }
  for (const p of effects.positions) {
    const mine = index.get(keyOf(p)) ?? [];
    const ok = tallyOne(item, 'kinds', kindOf(p), mine, 'pos', at);
    if (!ok) unreadAt(kindOf(p), mine);
    all &&= ok;
  }
  const rigidKeys = new Set();
  for (const f of facts) {
    if (f.kind === 'miss') {
      bump(out.misses, `${f.where}: ${f.why}`);
      note(out.examples, `miss ${f.where}: ${f.why}`, at);
    }
    if (f.kind === 'written') bump(out.written,
      `${keyOf(f.fixed)} read ${f.text.replace(/:.*/, ':_')}`);
    if (f.kind === 'rigid') {
      const same = f.text === `[|rigid:${f.id}]`;
      const tail = f.text.replace(/.*\|/, '|').replace(/\d+/g, 'n');
      const key = same ? 'same VarId' : `${f.where}: extra labels `
        + `${!f.text.startsWith('[|')}, tail ${tail}`;
      bump(out.rigid, scope + key);
      if (!same && !rigidKeys.has(f.where)) {
        rigidKeys.add(f.where);
        bump(out.rigidDecls, `${scope}${f.where}`);
      }
      if (!same) note(out.examples, `rigid ${key}`, at);
    }
    if (f.kind === 'cFromR') share(`C read from R at ${f.where}`);
  }
  marksShared(item, effects, facts, at);
  leastOfStore(item, facts, out.least, note);
  return all;
};

const started = Date.now();
const entries = await corpus();
out.size = { entries: entries.length };
for (const entry of entries) for (const item of declarationsOf(entry)) {
  const stage = stageOf(item);
  if (item.decl !== undefined) bump(out.size, 'declarations');
  bump(out.stages, stage);
  if (item.decl !== undefined) markDiff(item);
  if (!stage.startsWith('candidate')) continue;
  if (item.live.rebuiltApart) { bump(out.mapped, 'rebuilt apart'); continue; }
  const mapped = inventory(item);
  const effects = fields(item.problem).effects;
  if (mapped) cohort(effects);
  const empty = effects.flexEff.length + effects.positions.length === 0;
  bump(out.mapped, `${stage}: ${scope}${mapped ? 'mapped' : 'not mapped'}`
    + (empty ? ' (nothing required)' : ''));
}
out.seconds = Math.round((Date.now() - started) / 1000);
console.log(JSON.stringify(out, null, 1));
