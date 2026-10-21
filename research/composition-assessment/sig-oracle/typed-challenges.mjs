// Typed challenges for term-witness sufficiency (dossier §18.6): shared
// labels at equal and unequal field types, hypotheses requiring
// agreement, and empty regions. Rigid rows 0-2, flexible rows 3-5.
// `expect`: predicted bounded validity and uniform-template verdict.
import { T } from './semantics.mjs'

const { tails } = T
const sig = (rigidRows, flexRows, D, B) =>
  ({ rigidRows, rigidTys: [], flexRows, flexTys: [], D, B })
const eq = (a, b) => ['eq', a, b]
const dis = (r, s) => ['disjoint', r, s]

export const TYPED = [
  ['shared-part', sig([0, 1], [3, 4, 5], [],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)), dis(4, 5)]),
  ['invalid', 'none'], 'a label of r and s must sit in u, at both types'],
  ['shared-part-equal-rows', sig([0, 1], [3, 4, 5], [eq(tails(0), tails(1))],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5)), dis(4, 5)]),
  ['valid', 'found'], 'the hypothesis r = s makes the types agree: u = r'],
  ['shared-part-no-disjoint', sig([0, 1], [3, 4, 5], [],
    [eq(tails(0), tails(3, 4)), eq(tails(1), tails(3, 5))]),
  ['valid', 'found'], 'u empty, v = r, w = s'],
  ['agreement-hypothesis', sig([0, 1, 2], [3, 4], [eq(tails(0), tails(1, 2))],
    [eq(tails(0), tails(3, 4)), eq(tails(3), tails(1))]),
  ['valid', 'found'], 'r = s ⊎ t declared: u = s, v = t'],
  ['split', sig([0, 1, 2], [3, 4], [dis(1, 2)],
    [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
  ['valid', 'found'], 'u = r outside s, v = r inside s (cells)'],
  ['split-undeclared', sig([0, 1, 2], [3, 4], [],
    [eq(tails(0), tails(3, 4)), dis(3, 1), dis(4, 2)]),
  ['invalid', 'none'], 'a label in r, s and t has nowhere to go'],
]
