import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from './r0-generate-support.mjs';
import { stableStringify } from './r0-canonical.mjs';
import { onlineFrom, recordOf, same, sigmaMap, under }
  from './r0-online-support.mjs';

// RT7's determination check (T-R0b §9 item 7, §5.3 "Determination";
// plan Task 4.3 Step 2, moved from Task 3.4): at each accepted fixture's
// read-back candidate, one-sided matching of each auxiliary's defining
// atom reproduces the auxiliary's read-back value. The read-back
// completes auxiliaries by unification (ReadBack.purs step 2); this is
// §5.3's other algorithm, written here from its text. The results are
// G-Recon's evidence and decide nothing here (plan Task 4.3).
const online = await onlineFrom(load);

const rules = `type List(a) = Nil | Cons(a, List(a));
fn spread(p: { name: Text, ...r }): { admin: Bool, name: Text, ...r }
  where r lacks { admin } = { ...p, admin: true };
fn field(p: { a: Int, ...r }): Int = p.a;
fn update(p: { a: Int, b: Bool, ...r }): { a: Int, b: Bool, ...r } =
  p { a = 2 };
fn remove(p: { a: Int, b: Bool }): { b: Bool } = p without { a };
fn ignore(p: { a: Int, b: Bool }): Int = match p { { a, ... } => a };
fn bind(p: { a: Int, b: Bool }): Bool = match p { { a, ...more } => more.b };
fn main(): Int = 0;
`;

const fixtureSources = dir => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return fixtureSources(path);
    if (!entry.name.endsWith('.json')) return [];
    const source = JSON.parse(readFileSync(path, 'utf8')).source;
    return typeof source === 'string' ? [[path, source]] : [];
  });

const key = stableStringify;
const freshAt = (variable, path) => 'fresh' in variable
  && key(variable.fresh.path) === key(path);

// The auxiliary's defining atom (RT7's first part,
// test/r0-generate-checks.mjs): an `eq` by its rule at its path whose
// right side is a record of this node's fresh variables.
const definingAtom = (problem, variable, info) => problem.b.find(entry =>
  entry.value.eq !== undefined && entry.origin.rule === info.origin.rule
  && key(entry.origin.atom.path) === key(info.origin.path)
  && entry.value.eq[1].record !== undefined
  && [...entry.value.eq[1].record.fields.map(([, ty]) => ty.tvar),
    ...entry.value.eq[1].record.tails].some(part => part !== undefined
    && key(part) === key(variable) && freshAt(part, info.origin.path)));

// §5.3: the operand at σ is a record whose labels include the shape's;
// each fresh field is the operand's type at its label, the fresh row
// the operand's other fields and tails.
const determined = (sigma, atom, variable) => {
  const [operand, shape] = atom.value.eq;
  const value = under(sigma, operand);
  if (value.record === undefined) return { failed: 'operand not a record' };
  const labels = shape.record.fields.map(([label]) => label);
  const at = label => value.record.fields.find(([found]) => found === label);
  if (!labels.every(at)) return { failed: 'a label the operand lacks' };
  const field = shape.record.fields.find(([, ty]) =>
    ty.tvar !== undefined && key(ty.tvar) === key(variable));
  if (field !== undefined) return { value: at(field[0])[1] };
  return { value: recordOf(value.record.fields.filter(([label]) =>
    !labels.includes(label)), value.record.tails) };
};

const comparisons = (program, name) => {
  if (online.todayOf(program, name).constructor.name !== 'Right') return [];
  const recorded = online.problemOf(program, name);
  const found = online.search(program, recorded);
  if (found.constructor.name !== 'Candidate') return [];
  const sigma = sigmaMap(online.sigmaOf(found.value0.substitution));
  const problem = online.canonicalOf(recorded);
  return problem.vars.filter(([, info]) => info.position === 'auxiliary')
    .flatMap(([variable, info]) => {
      const read = sigma.get(key(variable));
      const atom = definingAtom(problem, variable, info);
      if (read === undefined || atom === undefined) return [];
      const made = determined(sigma, atom, variable);
      return [{ rule: info.origin.rule, at: `${name} ${key(variable)}`,
        agrees: made.value !== undefined && same(made.value, read),
        made, read }];
    });
};

const programComparisons = source => {
  let program;
  try { program = online.programOf(source); } catch { return []; }
  return program.functions.flatMap(decl => comparisons(program, decl.name));
};

test('RT7: determination reproduces every auxiliary read-back value', () => {
  const found = [rules, ...fixtureSources('test/fixtures/r0')
    .map(([, source]) => source)].flatMap(programComparisons);
  const byRule = {};
  for (const item of found) {
    byRule[item.rule] ??= { compared: 0, agreed: 0 };
    byRule[item.rule].compared += 1;
    if (item.agrees) byRule[item.rule].agreed += 1;
  }
  assert.deepEqual(found.filter(item => !item.agrees).map(item =>
    `${item.at}: ${key(item.made)} against ${key(item.read)}`), []);
  // §5.3's table: each rule's auxiliaries are compared, the counts as
  // the first run gave them (a change is reviewed, not drift).
  assert.deepEqual(byRule, { E25: { compared: 1, agreed: 1 },
    E26: { compared: 36, agreed: 36 }, E27: { compared: 2, agreed: 2 },
    E28: { compared: 6, agreed: 6 }, P6: { compared: 3, agreed: 3 } });
});
