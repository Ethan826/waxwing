// Helpers for FX008 Task 4's tests: row modes, the recorded mark edges and
// bindings, and the marks a built row carries. Marks are plain JS as in
// unify-support (`plainMark`).
import { lookup } from '../output/Data.Map.Internal/index.js';
import { Just, Nothing } from '../output/Data.Maybe/index.js';
import { ordInt } from '../output/Data.Ord/index.js';
import {
  Directional, EqualMarks, IgnoreMarks, edgesOf
} from '../output/Features.Check.MarkStore/index.js';
import { nowhere } from '../output/Features.Check.Occurrence/index.js';
import { plainMark } from './unify-support.mjs';

export { EqualMarks, IgnoreMarks };

// Consumption at no place; `throwaway` is the stage tail meta nobody reads.
export const directional = throwaway => Directional.create({
  span: nowhere, throwaway: throwaway === undefined ? Nothing.value : Just.create(throwaway)
});

// Every edge of a substitution, oldest first: marks as plain JS, the
// reason's constructor name, and the effect the edge is about.
export const edgesIn = subst => edgesOf(subst.marks).map(edge => ({
  lower: plainMark(edge.lower),
  upper: plainMark(edge.upper),
  reason: edge.reason.constructor.name,
  effect: edge.label.value0.value0
}));

// The mark meta `n` is bound to, if any, as plain JS.
export const markBinding = (subst, n) => {
  const found = lookup(ordInt)(n)(subst.marks.bindings);
  return found instanceof Just ? plainMark(found.value0) : undefined;
};

// The marks of the labels a row meta is bound to.
export const marksOfBinding = (subst, n) => {
  const found = lookup(ordInt)(n)(subst.rows);
  return found instanceof Just ? found.value0.value0.map(l => plainMark(l.value2)) : undefined;
};
