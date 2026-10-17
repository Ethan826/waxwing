// The prototype solver's public surface, in three files under the
// 250-line limit: facts on variables, equations, the drain.
export {
  Fail, makeState, flatten, requireLacks, requireApart, requireDisjoint,
  wellFormed, bind,
} from './solver-facts.mjs';
export { unify } from './solver-solve.mjs';
export { drain, stuck, solution } from './solver-drain.mjs';
