// Source-level boundary (dossier §17): Waxwing functions, each with its
// signature-checking problem translated by hand under the rules of §17.1
// (no translator is implemented). Rigid rows 0-2 are the declaration's
// row variables, flexible rows 3+ come from calls and field accesses;
// rigid type variable 0, flexible type variables 1+. `D` holds the
// written clauses and those the signature's own record types imply (a
// tail lacks the labels beside it; two tails in one record are
// disjoint; docs/language.md, "Row polymorphism" and Tranche B).
// `expect`: the predicted bounded verdict and P9s verdict.
import { T } from './semantics.mjs'

const { base, v, rec, tails } = T
const text = base('Text')
const bool = base('Bool')
const int = base('Int')
const sig = (rigidRows, rigidTys, flexRows, flexTys, D, B) =>
  ({ rigidRows, rigidTys, flexRows, flexTys, D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]
const lacks = (r, l) => ['lacks', r, l]

export const SOURCE = [
  {
    name: 'greeting',
    source: 'fn greeting(person: { name: Text, ...r }): Text = person.name',
    P: sig([0], [], [3], [1], [lacks(0, 'name')],
      [eq(rec([['name', text]], [0]), rec([['name', v(1)]], [3])),
        eq(v(1), text)]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'mark',
    source: 'fn mark(p: { ...r }): { reviewed: Bool, ...r }\n' +
      '  where r lacks { reviewed } = { ...p, reviewed: true }',
    P: sig([0], [], [], [], [lacks(0, 'reviewed')],
      [eq(rec([['reviewed', bool]], [0]), rec([['reviewed', bool]], [0]))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'markForwarded',
    source: 'fn markAll(p: { ...r }): { reviewed: Bool, ...r }\n' +
      '  where r lacks { reviewed } = mark(p)',
    P: sig([0], [], [3], [], [lacks(0, 'reviewed')],
      [eq(tails(0), tails(3)), lacks(3, 'reviewed'),
        eq(rec([['reviewed', bool]], [3]), rec([['reviewed', bool]], [0]))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'join',
    source: 'fn join(a: { ...r }, b: { ...s }): { ...r, ...s }\n' +
      '  where r disjoint s = { ...a, ...b }',
    P: sig([0, 1], [], [], [], [dis(0, 1)],
      [eq(tails(0, 1), tails(0, 1))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'forwarded',
    source: 'fn forwarded(a: { ...r }, b: { ...s }): { ...r, ...s }\n' +
      '  where r disjoint s = join(a, b)',
    P: sig([0, 1], [], [3, 4], [], [dis(0, 1)],
      [eq(tails(3), tails(0)), eq(tails(4), tails(1)), dis(3, 4),
        eq(tails(3, 4), tails(0, 1))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'join3',
    source: 'fn join3(a: { ...r }, b: { ...s }, c: { ...t }):\n' +
      '  { ...r, ...s, ...t } where r disjoint s, s disjoint t,\n' +
      '  r disjoint t = join(join(a, b), c)',
    P: sig([0, 1, 2], [], [3, 4, 5, 6], [], [dis(0, 1), dis(1, 2), dis(0, 2)],
      [eq(tails(0), tails(3)), eq(tails(1), tails(4)), dis(3, 4),
        eq(tails(3, 4), tails(5)), eq(tails(2), tails(6)), dis(5, 6),
        eq(tails(5, 6), tails(0, 1, 2))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'both',
    source: 'fn both(q: { ...r }): Int where r lacks { a } = {\n' +
      '  let first = { ...q, a: 1 };\n' +
      '  let second = { ...q, a: true };\n  0 }',
    P: sig([0], [], [], [1, 2], [lacks(0, 'a')],
      [eq(v(1), rec([['a', int]], [0])), eq(v(2), rec([['a', bool]], [0]))]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'wrapAccepts',
    source: 'fn acceptsParts(p: { ...a, ...b }): Bool\n' +
      '  where b lacks { admin } = true\n' +
      'fn wrapAccepts(x: { ...r }): Bool = acceptsParts(x)',
    P: sig([0], [], [3, 4], [], [],
      [eq(tails(0), tails(3, 4)), lacks(4, 'admin'), dis(3, 4)]),
    expect: ['valid', 'valid'],
  },
  {
    name: 'undeclaredMerge',
    source: 'fn bad(a: { ...r }, b: { ...s }): Int = {\n' +
      '  let m = { ...a, ...b };\n  0 }',
    P: sig([0, 1], [], [], [1], [], [eq(v(1), tails(0, 1))]),
    expect: ['invalid', 'unresolved'],
  },
  {
    name: 'missingField',
    source: 'fn bad(p: { ...r }): Text = p.name',
    P: sig([0], [], [3], [1], [],
      [eq(tails(0), rec([['name', v(1)]], [3])), eq(v(1), text)]),
    expect: ['invalid', 'unresolved'],
  },
  {
    name: 'route',
    source: 'fn divide(whole: { ...u, ...v }, left: { ...s },\n' +
      '  right: { ...t }): Int where u disjoint s, v disjoint t = 0\n' +
      'fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int\n' +
      '  where s disjoint t = divide(x, y, z)',
    P: sig([0, 1, 2], [], [3, 4, 5, 6], [], [dis(1, 2)],
      [eq(tails(0), tails(3, 4)), eq(tails(1), tails(5)),
        eq(tails(2), tails(6)), dis(3, 5), dis(4, 6), dis(3, 4)]),
    expect: ['valid', 'unresolved'],
  },
  {
    name: 'routeNarrowed',
    source: 'fn route(x: { ...r }, y: { ...s }, z: { ...t }): Int\n' +
      '  where s disjoint t, r disjoint s = divide(x, y, z)',
    P: sig([0, 1, 2], [], [3, 4, 5, 6], [], [dis(1, 2), dis(0, 1)],
      [eq(tails(0), tails(3, 4)), eq(tails(1), tails(5)),
        eq(tails(2), tails(6)), dis(3, 5), dis(4, 6), dis(3, 4)]),
    expect: ['valid', 'valid'],
  },
]
