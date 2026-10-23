import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { load, problemsOf } from './r0-generate-support.mjs';
import { repoRoot } from './r0-corpus.mjs';
import { atomOf } from './r0-hand-notation.mjs';
import { normalized } from './r0-hand-support.mjs';
import { sameUpToRenaming } from './r0-hand-match.mjs';

// RT4, hand translations (T-R0b §9 item 4; R0 tranche Task 3.4):
// translation.md §5's examples (research/division-campaign/source/
// examples), each declaration's `D` and `B` compared with the generated
// problem's after eliminating defining equations on both sides, up to a
// renaming of flexible variables (test/r0-hand-support.mjs states the
// normalization). `BQ`, `adm` and `split` are outside §5's notation.
//
// §5.1 gives each positive row's translation, quoted below; a row that
// cites §17 is quoted from research/composition-assessment/sig-oracle/
// source-boundary.mjs. §5.2 gives none for the negative rows, so theirs
// are written here by translation.md §2.3's rules (labelled "by §2.3").
// Nine examples write a second spread or a two-tail annotation without
// a clause and stop at Resolve, so they have no problem (T-R0b §8;
// §3.3's S1 and §3.2's body-type move are not implemented); the stub
// variants §5 lists (p06s, p07s, c22s) stand in where they exist.
const { parse } = await load('Format.Parse');
const { resolve } = await load('Features.Resolve');
const { wire } = await load('Format.Diagnostic');
const examples = 'research/division-campaign/source/examples';
const sourceOf = file =>
  readFileSync(join(repoRoot, examples, `${file}.wxw`), 'utf8');

// [file, declaration, D, B]
const hand = [
  ['p01-greeting', 'greeting', ['r lacks name'],
    ['{name: Text, r} = {name: β, ρ}', 'β = Text']],
  ['p02-mark', 'mark', ['r lacks reviewed'],
    ['{r} = {ρ}', 'α = {reviewed: Bool, ρ}', 'α = {reviewed: Bool, r}']],
  ['p03-mark-implied', 'mark', ['r lacks reviewed'],
    ['{r} = {ρ}', 'α = {reviewed: Bool, ρ}', 'α = {reviewed: Bool, r}']],
  ['p04-mark-all', 'markAll', ['r lacks reviewed'], ['{r} = {ρ}',
    'ρ lacks reviewed', '{reviewed: Bool, ρ} = {reviewed: Bool, r}']],
  ['p06s-forwarded-stub', 'forwarded', ['r # s'],
    ['{ρ} = {r}', '{σ} = {s}', 'ρ # σ', '{ρ, σ} = {r, s}']],
  ['p07s-join3-stub', 'join3', ['r # s', 's # t', 'r # t'],
    ['{r} = {ρ3}', '{s} = {ρ4}', 'ρ3 # ρ4', '{ρ3, ρ4} = {ρ5}',
      '{t} = {ρ6}', 'ρ5 # ρ6', '{ρ5, ρ6} = {r, s, t}']],
  ['p08s-swapped-stub', 'swapped', ['r # s'],
    ["{s} = {r'}", "{r} = {s'}", "r' # s'", "{r', s'} = {r, s}"]],
  ['p09-both', 'both', ['r lacks a'],
    ['α1 = {a: Int, r}', 'α2 = {a: Bool, r}']],
  ['p10-wrap-accepts', 'wrapAccepts', [],
    ["{r} = {a', b'}", "b' lacks admin", "a' # b'"]],
  ['p11-route', 'route', ['s # t'], ["{r} = {u', v'}", "{s} = {s'}",
    "{t} = {t'}", "u' # s'", "v' # t'", "u' # v'"]],
  ['p12-route-narrowed', 'route', ['s # t', 'r # s'], ["{r} = {u', v'}",
    "{s} = {s'}", "{t} = {t'}", "u' # s'", "v' # t'", "u' # v'"]],
  ['p13-older', 'older', ['r lacks age'], ['{age: Int, r} = {age: β, ρ}',
    'β = Int', "{age: Int, r} = {age: γ, ρ'}", 'γ = Int']],
  ['p14-drop', 'drop', ['r lacks a'],
    ['{a: Int, r} = {a: β, ρ}', '{ρ} = {r}']],
  ['p15-rest-binder', 'rest', ['r lacks a'],
    ['{a: Int, r} = {a: β, ρ}', '{ρ} = {r}']],
  ['p16-nested-access', 'inner', [],
    ['{box: {r}} = {box: β, ρ}', 'β = {r}']],
  ['p17s-nested-join-stub', 'nest', ['r # s'], ['{box: {r}} = {box: β, ρ}',
    "β = {r'}", "{s} = {s'}", "r' # s'", "γ = {box: {r', s'}}",
    'γ = {box: {r, s}}']],
  ['p18-twice-tyvar', 'twice', [], ['α = {r}', 'α = {r}']],
  ['p19-self-call', 'both', ['u # v'],
    ["{u} = {u'}", "u' # v'", "{u', v'} = {u, v}"]],
  ['p20-pattern-open', 'name', ['r lacks name'],
    ['{name: Text, r} = {name: β, ρ}', 'β = Text']],
  ['p21-body-type-implied', 'c', ['r # s'], ['γ = {r, s} -> Int']],
  ['c21-accepts-parts', 'main', [],
    ["{admin: Bool} = {r', s'}", "s' lacks admin", "r' # s'"]],
  // §5.1 writes `α = {r'} = {u'}`: two atoms.
  ['c22s-compose-requirements-stub', 'main', [], ["α = {r'}", "α = {u'}",
    "β = {s'}", "β = {v'}", "{r', s'} = {x: Int, y: Int}", "r' # s'",
    "u' lacks y", "v' lacks x"]],
  // §5.1 writes `q: ρ`, q's type `{ρ}`, here `γ`.
  ['c23-both-lambda', 'main', [], ['γ = {ρ}', 'α1 = {a: Int, ρ}',
    'α2 = {a: Bool, ρ}', '{ρ} = {name: Text}']],
  // §17's missingField.
  ['n02-missing-field', 'bad', [], ['{r} = {name: β, ρ}', 'β = Text']],
  // By §2.3: R5, R6, R1.
  ['n03-extend-unlacked', 'tag', [], ['{r} = {ρ}',
    'α = {reviewed: Bool, ρ}', "α = {reviewed: β, ρ'}", 'β = Bool']],
  // By §2.3: R11, as p11 without the clause.
  ['n04-route-unclaused', 'route', [], ["{r} = {u', v'}", "{s} = {s'}",
    "{t} = {t'}", "u' # s'", "v' # t'", "u' # v'"]],
  // By §2.3: R11.
  ['n05-pass-twice', 'h', [], ["{t} = {r'}", "{t} = {s'}", "r' # s'"]],
  ['n06-wrapper-no-fact', 'w', [],
    ["{u} = {r'}", "{v} = {s'}", "r' # s'"]],
  // By §2.3: R10, R16 (the arm is the match's type), R1.
  ['n07-closed-pattern-rigid', 'first', ['r lacks a'],
    ['{a: Int, r} = {a: β}', 'β = Int']],
  // By §2.3: R11 at the call; `main` is the call-site problem.
  ['n09-accepts-parts-both-lack', 'main', [], ["{admin: Bool} = {r', s'}",
    "r' lacks admin", "s' lacks admin", "r' # s'"]],
  ['n10-both-call-has-a', 'main', [],
    ["{name: Text, a: Int} = {r'}", "r' lacks a"]],
  // By §2.3: R6, R1.
  ['n11-tyvar-not-record', 'bad', [], ['a = {name: β, ρ}', 'β = Text']],
  // By §2.3: R11.
  ['n13-nested-rigid-field', 'f', [],
    ["{r} = {box: {u'}, v'}", "v' lacks box"]],
  // By §2.3: R1, R2.
  ['n14-retype', 'retype', ['r lacks a'], ['{a: Int, r} = {a: Bool, r}']],
  ['n15-nested-retail', 'f', ['r lacks a'],
    ['{box: {r}} = {box: {a: Int, r}}']]
];

// [file, Resolve's refusal]
const spread = 'A record literal accepts at most one spread';
const unresolved = [['p05-join', spread], ['p06-forwarded', spread],
  ['p07-join3', spread], ['c22-compose-requirements', spread],
  ['c24-both-two-spreads', spread], ['n01-undeclared-merge', spread],
  ['n08-overlap-call', spread], ['n12-wrapper-promises-more', spread],
  ['n16-body-type-two-tails', 'r and s are not known to be disjoint;'
    + ' require r disjoint s in the signature']];

const problemOf = (file, name) => {
  const program = resolve(parse(sourceOf(file)).value0).value0;
  const found = problemsOf(program).find(item => item.decl.name === name);
  const rigid = new Map(found.decl.variables.map((variable, at) =>
    [variable, at]));
  return { problem: found.problem, rigid };
};
const valuesOf = entries => entries.map(entry => entry.value);
const handOf = (texts, rigid) => texts.map(text => atomOf(text, rigid));

test('§5 is covered: every example is translated or refused at Resolve',
  () => {
    const files = [...hand.map(([file]) => file),
      ...unresolved.map(([file]) => file)];
    const rows = [...Array.from({ length: 21 }, (_, at) => `p${at + 1}`),
      ...Array.from({ length: 16 }, (_, at) => `n${at + 1}`),
      'c21', 'c22', 'c23', 'c24'].map(row =>
      (row.length === 2 ? `${row[0]}0${row[1]}` : row));
    for (const row of rows) assert.ok(files.some(file =>
      file.startsWith(`${row}-`) || file.startsWith(`${row}s-`)), row);
  });

for (const [file, refusal] of unresolved) {
  test(`${file}: refused at Resolve, so no problem`, () => {
    const named = resolve(parse(sourceOf(file)).value0);
    assert.equal(named.constructor.name, 'Left');
    assert.equal(wire(named.value0).message, refusal);
  });
}

for (const [file, name, d, b] of hand) {
  test(`${file}: ${name}'s D and B are the hand translation's`, () => {
    const { problem, rigid } = problemOf(file, name);
    const show = atoms => JSON.stringify(atoms);
    const [handD, madeD] = [normalized(handOf(d, rigid)),
      normalized(valuesOf(problem.d))];
    assert.ok(sameUpToRenaming(handD, madeD), `D: ${show(handD)} against`
      + ` ${show(madeD)}`);
    const [handB, madeB] = [normalized(handOf(b, rigid)),
      normalized(valuesOf(problem.b))];
    assert.ok(sameUpToRenaming(handB, madeB), `B: ${show(handB)} against`
      + ` ${show(madeB)}`);
  });
}

// The comparison can fail: a renaming must be bijective and keep rigid
// variables, and normalization keeps what contradicts.
test('controls: wrong translations and renamings are told apart', () => {
  const rigid = new Map([['r', 0], ['s', 1]]);
  const same = (mine, theirs) => sameUpToRenaming(
    normalized(handOf(mine, rigid)), normalized(handOf(theirs, rigid)));
  assert.ok(same(["u' # v'", "v' lacks a"], ['x # y', 'y lacks a']));
  assert.ok(!same(["u' # v'"], ['x # x']), 'not bijective');
  assert.ok(!same(["u' # v'", "u' lacks a"], ['x # y', 'y lacks b']));
  assert.ok(!same(['r # s'], ['r # r']), 'rigid renamed');
  assert.ok(!same(['{a: Int, r} = {a: Bool, r}'], []), 'a clash dropped');
  assert.ok(!same(['{r, s} = {r, s}'], []), 'a definedness dropped');
  assert.ok(same(['α = {r, s}'], ['{r, s} = {r, s}']));
  const route = problemOf('p11-route', 'route');
  const wrong = ["{r} = {u', v'}", "{s} = {s'}", "{t} = {t'}", "u' # s'",
    "v' # t'"];
  assert.ok(!sameUpToRenaming(normalized(handOf(wrong, route.rigid)),
    normalized(valuesOf(route.problem.b))), "p11 without u' # v'");
});
