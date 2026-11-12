// Replacement's end-to-end outcome for every declaration on the gap
// lists (dossier §18.184): the read faults, the ForcedTail refusals and
// the three RequirementUnjudged refusals. Evidence only; nothing pinned.
// Replacement's rule is r0-census.md's: if R0's verdict were live, one
// declaration that `decide` does not solve stops its program. For each
// program holding a listed declaration this prints today's compile and
// run (exit status, stdout, stderr), every declaration's `decide`
// verdict, and so whether replacement would reject the program and
// through which declarations. Whether today's acceptance is right is
// judged in the write-up, not here.
// usage: node research/r0-replacement-losses/measure.mjs  (repo root)
import { runGoBatch } from '../../test/go-batch.mjs';
import { describe, verdictClass } from '../../test/r0-decide-support.mjs';
import { sourcesOf } from '../../test/r0-effects-pin-run.mjs';
import { declarationsOf } from '../../test/r0-rt8-run.mjs';
import { gapEntriesOf } from '../../test/r0-t2-gap-verdicts.mjs';
import { readFileSync } from 'node:fs';

const gap = JSON.parse(readFileSync(
  'test/fixtures/r0/t2-gap-verdicts.json', 'utf8'));
const pin = JSON.parse(readFileSync(gap.pin, 'utf8'));
const listed = new Map(Object.entries(gapEntriesOf(pin)).flatMap(
  ([, entries]) => entries.map(entry => [entry.at, entry])));
const listOf = new Map(Object.values(gap.denominators).flat()
  .map(entry => [entry.at, entry.list]));
const originOf = at => at.slice(0, at.lastIndexOf('#'));
const origins = new Set([...listOf.keys()].map(originOf));

const listedSources = (await sourcesOf())
  .filter(entry => origins.has(entry.origin));
const found = new Set(listedSources.map(entry => entry.origin));
for (const origin of origins)
  if (!found.has(origin)) throw new Error(`no source for ${origin}`);
// Three listed programs are refused today as wholes. Each variant keeps
// the listed declaration's pattern with a caller today accepts, to show
// whether replacement loses valid programs of that shape.
const variants = [
  { origin: 'variant:f05-print-key valid caller',
    source: 'fn shown(p: { ...r }): Text = show(p);\n\n'
      + 'fn main(): Text = shown({ a: 1 });\n' },
  { origin: 'variant:split-selection decided caller',
    source: 'fn divide(whole: { ...u, ...v }, left: { ...s },'
      + ' right: { ...t }): Text\n  where u disjoint s, v disjoint t = {\n'
      + '  let peek = fn(p: { ...u }) => show(p);\n  "ok"\n};\n\n'
      + 'fn main(): Text = divide({ a: 1, b: 2 }, { a: 2 }, { b: 3 });\n' },
  { origin: 'variant:test/fx008-probes/rigid-ok.wxw',
    source: readFileSync('test/fx008-probes/rigid-ok.wxw', 'utf8') }];
const sources = [...listedSources, ...variants];

const named = value => value.constructor.name;
const batch = runGoBatch(import.meta.url,
  sources.map(entry => [entry.origin, entry.source]), 'replacement');
const ran = origin => {
  try {
    const { status, stdout, stderr } = batch.result(origin);
    return { status, stdout, stderr: stderr.slice(0, 400) };
  } catch (error) {
    return { error: String(error.message ?? error).slice(0, 400) };
  }
};

const programs = sources.map(entry => {
  const rows = declarationsOf(entry);
  const declarations = rows.map(row => ({
    name: row.decl.name,
    listed: listOf.get(row.at) ?? null,
    today: named(row.today) === 'Right' ? 'compiles' : 'refused',
    decide: verdictClass(row.decision),
    reason: describe(row.decision).verdict }));
  const blocking = declarations.filter(d => d.decide !== 'Solved');
  return { origin: entry.origin,
    listedNames: declarations.filter(d => d.listed).map(d => d.name),
    replacement: blocking.length === 0 ? 'accepted'
      : `rejected by ${blocking.map(d => d.name).join(', ')}`,
    run: ran(entry.origin), declarations, source: entry.source };
});

console.log(JSON.stringify({ listed: listed.size, programs }, null, 1));
