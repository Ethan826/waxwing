-- The closed-problem decider, a port of Lean's `decideClosed` and
-- `unify` (Composition/Unify/Decider.lean, Algo.lean): every atom must be
-- an equation between well-formed sides, then Robinson's unification
-- with occurs check in Martelli and Montanari's transformation form,
-- records decomposed one field at a time. On closed problems (no row
-- variable) it answers true exactly for the satisfiable ones (Lean `r3`,
-- proved there for the Lean definition, not for this port, which
-- test/r0-cx.test.mjs checks against a brute-force oracle). Every match
-- names each constructor: a clash is a stated case, not a fallback.
module Features.Check.Refute.Counter.Unify (decideClosed) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (cons, deleteAt, elem, findIndex, index, null, uncons)
import Data.Map (empty, singleton)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst)
import Features.Check.Refute.Counter.Term
  ( Atom(..)
  , Atomic
  , Fields
  , Term(..)
  , substT
  , tyVarsT
  , wfT
  )

type Equation = Tuple Term Term

type Unifying = Step (Array Equation) Boolean

decideClosed ∷ Array Atom → Boolean
decideClosed atoms = maybe false (tailRec step) (traverse wellFormed atoms)

wellFormed ∷ Atom → Maybe Equation
wellFormed atom = case atom of
  Equal left right →
    if wfT left && wfT right then Just (Tuple left right) else Nothing
  Lacks _ _ → Nothing
  Disjoint _ _ → Nothing
  Ff → Nothing

step ∷ Array Equation → Unifying
step equations = maybe (Done true) first (uncons equations)
  where
  first { head: Tuple left right, tail } = case left, right of
    TVar x, TVar y →
      if x == y then Loop tail else Loop (eliminate x (TVar y) tail)
    TVar x, _ → bindVar x right tail
    _, TVar x → bindVar x left tail
    _, _ → sameHead left right tail

-- `x := term` in the rest, unless `x` occurs in `term`.
bindVar ∷ Int → Term → Array Equation → Unifying
bindVar x term rest =
  if elem x (tyVarsT term) then Done false
  else Loop (eliminate x term rest)

eliminate ∷ Int → Term → Array Equation → Array Equation
eliminate x term = map substituted
  where
  sigma = { ty: singleton x term, row: empty }
  substituted (Tuple left right) =
    Tuple (substT sigma left) (substT sigma right)

-- Neither side is a variable: the heads must agree.
sameHead ∷ Term → Term → Array Equation → Unifying
sameHead left right rest = case left of
  TBase one → clashUnless (map (agree one) (baseOf right))
  TArrow a c → clashUnless (map (arrows a c) (arrowOf right))
  -- Unreachable: `step` takes every equation with a variable side
  -- first (Lean's `_ => false` covers the same case).
  TVar _ → Done false
  TRecord fields tails →
    clashUnless (map (records fields tails) (recordOf right))
  where
  clashUnless = maybe (Done false) identity
  agree one other = if one == other then Loop rest else Done false
  arrows a c { parameter, result } =
    Loop (cons (Tuple a parameter) (cons (Tuple c result) rest))
  records fields tails other =
    if null tails && null other.tails then fieldwise fields other.fields rest
    else Done false

-- Both closed: empty against empty, or the first field matched by label.
fieldwise ∷ Fields → Fields → Array Equation → Unifying
fieldwise fields others rest = maybe emptyBoth first (uncons fields)
  where
  emptyBoth = if null others then Loop rest else Done false
  first { head: Tuple label term, tail } =
    maybe (Done false) (matched term tail) (removeField label others)
  matched term tail { value, remaining } = Loop
    ( cons (Tuple term value)
        (cons (Tuple (TRecord tail []) (TRecord remaining [])) rest)
    )

removeField ∷ String → Fields → Maybe { value ∷ Term, remaining ∷ Fields }
removeField label fields = do
  at ← findIndex (eq label <<< fst) fields
  Tuple _ value ← index fields at
  remaining ← deleteAt at fields
  pure { value, remaining }

baseOf ∷ Term → Maybe Atomic
baseOf term = case term of
  TBase atomic → Just atomic
  TArrow _ _ → Nothing
  TVar _ → Nothing
  TRecord _ _ → Nothing

arrowOf ∷ Term → Maybe { parameter ∷ Term, result ∷ Term }
arrowOf term = case term of
  TBase _ → Nothing
  TArrow parameter result → Just { parameter, result }
  TVar _ → Nothing
  TRecord _ _ → Nothing

recordOf ∷ Term → Maybe { fields ∷ Fields, tails ∷ Array Int }
recordOf term = case term of
  TBase _ → Nothing
  TArrow _ _ → Nothing
  TVar _ → Nothing
  TRecord fields tails → Just { fields, tails }
