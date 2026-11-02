// Design §C and §D's probe: over the corpus loader's candidates, the
// research trace (hook-trace.mjs, `trace` scratch copy) read back by
// the design's rules, role by role, against the inventory's located
// values (cross-check) and its unread ones (recovery). Corpus-observed.
//   T2_SCRATCH=trace node --import ./research/t2-read-back-design/\
//   redirect.mjs research/t2-read-back-design/trace.mjs [file ...]
// With files (.wxw.txt), it reads those programs instead of the corpus
// and lists every traced value (`lines`).
import { readFileSync } from 'node:fs';
import { loadCorpus } from '../../test/r0-corpus.mjs';
import { load, resolved } from '../../test/r0-generate-support.mjs';
import { liveOf } from '../t2-read-back-inventory/live.mjs';
import { factsOf } from '../t2-read-back-inventory/sources.mjs';
import { keyOf, named } from '../t2-read-back-inventory/shape.mjs';
import { trace } from './hook-trace.mjs';
import { readRole, indexOf, rowMetas } from './trace-rules.mjs';

const { fields } = await load('Domain.Recorded');
const { forcedTails } = await load('Features.Check.Strategy.Effects.Forced');
const Generate = await load('Features.Check.Generate');
const Inputs = await load('Features.Check.Generate.Inputs');
const Elaborating = await load('Domain.Elaborating');
const { functional } = await load('Features.Check.Functional');
const Walk = await load('Features.Check.Walk');
const Holes = await load('Features.Check.Holes');

// `holes`'s numbering of the raw body: the metas it renumbers.
const numberingOf = raw => Walk.foldTypes(found => () => ty =>
  Holes.foldHoles(seen => meta => seen.add(meta))(found)(ty))(new Set())(
  raw);

const shown = 3;
const out = { declarations: 0, candidates: 0, rebuiltApart: 0,
  halvesApart: 0, entries: {}, spanShared: {}, roles: {}, unrecovered: {},
  examples: {}, stageMechanism: {}, locatedNotTraced: {},
  calleeRows: {}, holes: {}, mapped: {}, inventoryView: {} };
const bump = (table, key, by = 1) => { table[key] = (table[key] ?? 0) + by; };
const note = (key, at) => {
  out.examples[key] ??= [];
  if (out.examples[key].length < shown && !out.examples[key].includes(at))
    out.examples[key].push(at);
};
const roleOf = subject => (named(subject) === 'EffFresh'
  ? named(subject.value1) : named(subject));
const subjectText = subject => `${subject.value0.steps.map(step =>
  step.value0).join('/')} ${keyOf(named(subject) === 'EffFresh'
  ? subject.value1 : subject).replace(/"/g, '').slice(0, 40)}`;
const traced = new Set(['EffInst', 'OpenedRow', 'Stage', 'Opened',
  'Instantiated']);

// The hook ran twice per declaration (`recheck`, then live.mjs's
// rebuild); both halves must agree, and the rebuild's half is used.
const halves = entries => {
  const half = entries.length / 2;
  const summary = e => `${e.site} ${e.span} ${e.entryNext ?? ''} `
    + (e.row === undefined ? keyOf(e.use.scheme) : keyOf(e.row));
  const apart = !Number.isInteger(half) || entries.slice(0, half)
    .some((e, i) => summary(e) !== summary(entries[half + i]));
  return { apart, used: entries.slice(half) };
};

// A located variable met by two live values, a traced value apart from
// the located one, or a rigid tail met by anything but itself (outside
// `main`'s signature, whose live tail is `EntryTail`'s meta by design).
const inconsistent = facts => facts.some(f => f.kind === 'rigid'
  && f.where !== 'signature' && f.text !== `[|rigid:${f.id}]`);

const located = facts => {
  const map = new Map();
  for (const f of facts) {
    if (f.kind !== 'var' && f.kind !== 'pos') continue;
    const key = keyOf(f.variable ?? f.position);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(f.text);
  }
  return map;
};

const tally = (item, index, live, subject) => {
  const role = roleOf(subject);
  if (!traced.has(role)) return live.has(keyOf(subject));
  const row = (out.roles[role] ??= { required: 0, located: 0, traced: 0,
    agree: 0, disagree: 0, recovered: 0, unrecovered: 0 });
  row.required += 1;
  const before = live.get(keyOf(subject));
  const found = readRole(item, index, subject);
  if (role === 'Stage') bump(out.stageMechanism, `${found.mechanism}: `
    + `${before ? 'located' : 'unread'}, ${found.text === undefined
      ? 'not traced' : 'traced'}`);
  if (before !== undefined) row.located += 1;
  if (found.cross !== undefined) bump(out.calleeRows, found.cross);
  if (verbose) out.lines.push(`${item.at} ${subjectText(subject)}: `
    + `${found.text ?? found.why} [${found.mechanism ?? 'use'}]`
    + `${before ? ` located ${[...before].join('/')}` : ''}`);
  if (found.text === undefined) {
    if (before !== undefined) {
      bump(out.locatedNotTraced, `${role}: ${found.why}`);
      note(`located, not traced ${role}: ${found.why}`, item.at);
    }
    if (before === undefined) {
      row.unrecovered += 1;
      bump(out.unrecovered, `${role}: ${found.why}`);
      note(`unrecovered ${role}: ${found.why}`, item.at);
    }
    return before !== undefined;
  }
  row.traced += 1;
  if (found.row !== undefined) for (const meta of rowMetas(item, found.row))
    bump(out.holes, item.numbering.has(meta) ? 'in the body numbering'
      : 'outside it (an extension number)');
  if (before === undefined) { row.recovered += 1; return true; }
  if (before.size === 1 && before.has(found.text)) row.agree += 1;
  else {
    row.disagree += 1;
    note(`disagree ${role}`, `${item.at} ${[...before].join('/')} vs `
      + found.text);
  }
  return true;
};

const declaration = (origin, program, inputs, holders, decl) => {
  out.declarations += 1;
  const at = `${origin}#${decl.name}`;
  const generated = Generate.generate(inputs.tables)(inputs.signatures)(
    decl);
  if (named(generated) !== 'Right') return;
  trace.reset();
  const live = liveOf(holders, program, decl);
  if (live.refused !== undefined) return;
  out.candidates += 1;
  if (live.rebuiltApart) { out.rebuiltApart += 1; return; }
  const { apart, used } = halves(trace.entries);
  if (apart) { out.halvesApart += 1; note('halves apart', at); return; }
  const index = indexOf(used);
  for (const e of used) bump(out.entries, e.site === 'use'
    ? `use ${e.kind} ${e.owner}` : e.site);
  for (const [key, list] of index.uses) if (list.length > 1) {
    bump(out.spanShared, list.map(e => e.owner).join('+'));
    note(`span shared ${key}`, at);
  }
  const item = { at, problem: Elaborating.problem(generated.value0),
    live, program, decl, numbering: numberingOf(live.raw) };
  const effects = fields(item.problem).effects;
  const seen = factsOf(item);
  const facts = located(seen);
  const disagreeBefore = Object.values(out.roles)
    .reduce((sum, r) => sum + r.disagree, 0);
  const forced = new Set(forcedTails(item.problem).map(f => keyOf(f.forced)));
  let all = true;
  for (const v of effects.flexEff)
    if (!forced.has(keyOf(v))) all = tally(item, index, facts, v) && all;
  for (const p of effects.positions) all = tally(item, index, facts, p) && all;
  const unsupported = effects.obligations.some(o =>
    named(o.value) === 'Unsupported');
  const split = inconsistent(seen) || [...facts.values()]
    .some(texts => texts.size > 1) || Object.values(out.roles)
    .reduce((sum, r) => sum + r.disagree, 0) > disagreeBefore;
  // The inventory's own view: located without the trace, and whether
  // located consistently (no variable met by two live values, no rigid
  // tail met by another value).
  const allLocated = effects.flexEff.every(v => forced.has(keyOf(v))
    || facts.has(keyOf(v))) && effects.positions.every(p =>
    facts.has(keyOf(p)));
  const locatedApart = inconsistent(seen) || [...facts.values()]
    .some(texts => texts.size > 1);
  bump(out.inventoryView, `${unsupported ? '(Unsupported) ' : ''}`
    + `${allLocated ? 'located' : 'not located'}`
    + `${locatedApart ? ', inconsistently' : ''}`);
  bump(out.mapped, `${unsupported ? '(Unsupported) ' : ''}`
    + `${all ? 'mapped' : 'not mapped'}${split ? ", inconsistently" : ""}`);
  if (split) note(`inconsistent${unsupported ? ' (Unsupported)' : ''}`, at);
  if (!all) note(`not mapped${unsupported ? ' (Unsupported)' : ''}`, at);
};

const started = Date.now();
const files = process.argv.slice(2);
const verbose = files.length > 0;
if (verbose) out.lines = [];
const sources = verbose ? files.map(file => ({ origin: file,
  source: readFileSync(file, 'utf8') })) : await loadCorpus();
for (const { origin, source } of sources) {
  let program;
  try { program = resolved(source); } catch { continue; }
  const inputs = Inputs.generationInputs(program);
  const holders = functional(program.ctors);
  for (const decl of program.functions)
    declaration(origin, program, inputs, holders, decl);
}
out.seconds = Math.round((Date.now() - started) / 1000);
console.log(JSON.stringify(out, null, 1));
