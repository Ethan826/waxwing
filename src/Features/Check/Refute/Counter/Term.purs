-- The call-site constraint language CX's check decides over (Lean
-- Composition/Syntax.lean, Subst.lean), at base `B ⊕ Nat`, with
-- variables numbered: type variables and row variables are separate
-- `Int` sorts, as in Lean. A port, definition for definition, of
-- `substT`, `substAtom` (Subst.lean), `labelsOf`, `rowVarsOf`,
-- `tyVarsOf` (Reduction.lean) and `wfT` (Unify/Wf.lean). Recursion
-- follows the term, so a term's depth is the stack it needs; the search
-- (Counter/Search.purs) hands the check only small sub-bodies.
module Features.Check.Refute.Counter.Term
  ( Atomic(..)
  , Fields
  , RowValue
  , Subst
  , Term(..)
  , Atom(..)
  , labelsOf
  , rowVarsOf
  , substProblem
  , substT
  , tyVarsOf
  , tyVarsT
  , wfT
  ) where

import Prelude
import Data.Array (concatMap, cons, elem, foldl, length, nub, null)
import Data.Foldable (all, any)
import Data.Map (Map, lookup)
import Data.Maybe (fromMaybe)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded.Atom (Base)

-- `B ⊕ Nat`: a recorded base, or a fresh base atom.
data Atomic = Known Base | Fresh Int

data Term
  = TBase Atomic
  | TArrow Term Term
  | TVar Int
  | TRecord Fields (Array Int)

type Fields = Array (Tuple String Term)

data Atom
  = Equal Term Term
  | Lacks Int String
  | Disjoint Int Int
  | Ff

-- What a row variable stands for: fields, then tails.
type RowValue = { fields ∷ Fields, tails ∷ Array Int }

-- A finite substitution, applied in parallel and once.
type Subst = { ty ∷ Map Int Term, row ∷ Map Int RowValue }

derive instance eqAtomic ∷ Eq Atomic
derive instance eqTerm ∷ Eq Term

substProblem ∷ Subst → Array Atom → Array Atom
substProblem sigma = concatMap (substAtom sigma)

-- `lacks` and `disjoint` on a bound row variable become facts about its
-- fields (`ff` when they settle it false) and tails.
substAtom ∷ Subst → Atom → Array Atom
substAtom sigma atom = case atom of
  Equal left right → [ Equal (substT sigma left) (substT sigma right) ]
  Lacks row label → lacking label (rowOf sigma row)
  Disjoint one other → apart (rowOf sigma one) (rowOf sigma other)
  Ff → [ Ff ]

substT ∷ Subst → Term → Term
substT sigma term = case term of
  TBase atomic → TBase atomic
  TArrow parameter result →
    TArrow (substT sigma parameter) (substT sigma result)
  TVar n → fromMaybe (TVar n) (lookup n sigma.ty)
  TRecord fields tails →
    withTails (map (substField sigma) fields) (expandTails sigma tails)
  where
  withTails fields expanded =
    TRecord (fields <> expanded.fields) expanded.tails

labelsOf ∷ Array Atom → Array String
labelsOf = nub <<< concatMap atomLabels

rowVarsOf ∷ Array Atom → Array Int
rowVarsOf = nub <<< concatMap atomRows

tyVarsOf ∷ Array Atom → Array Int
tyVarsOf = nub <<< concatMap atomTyVars

tyVarsT ∷ Term → Array Int
tyVarsT term = case term of
  TBase _ → []
  TArrow parameter result → tyVarsT parameter <> tyVarsT result
  TVar n → [ n ]
  TRecord fields _ → concatMap (tyVarsT <<< snd) fields

-- Well-formed: no tail and no repeated label in any record.
wfT ∷ Term → Boolean
wfT term = case term of
  TBase _ → true
  TArrow parameter result → wfT parameter && wfT result
  TVar _ → true
  TRecord fields tails →
    null tails && distinct (map fst fields) && all (wfT <<< snd) fields

substField ∷ Subst → Tuple String Term → Tuple String Term
substField sigma (Tuple label term) = Tuple label (substT sigma term)

rowOf ∷ Subst → Int → RowValue
rowOf sigma row = fromMaybe { fields: [], tails: [ row ] }
  (lookup row sigma.row)

expandTails ∷ Subst → Array Int → RowValue
expandTails sigma = foldl appended { fields: [], tails: [] }
  where
  appended so value = so
    { fields = so.fields <> part.fields, tails = so.tails <> part.tails }
    where
    part = rowOf sigma value

lacking ∷ String → RowValue → Array Atom
lacking label value =
  settled (elem label (map fst value.fields))
    <> map (flip Lacks label) value.tails

apart ∷ RowValue → RowValue → Array Atom
apart one other =
  settled (any (flip elem otherLabels) oneLabels)
    <> concatMap (lacksIn other.tails) oneLabels
    <> concatMap (lacksIn one.tails) otherLabels
    <> concatMap pairedWith one.tails
  where
  oneLabels = map fst one.fields
  otherLabels = map fst other.fields
  lacksIn tails label = map (flip Lacks label) tails
  pairedWith tail = map (Disjoint tail) other.tails

settled ∷ Boolean → Array Atom
settled false = []
settled true = [ Ff ]

distinct ∷ Array String → Boolean
distinct labels = length (nub labels) == length labels

atomLabels ∷ Atom → Array String
atomLabels atom = case atom of
  Equal left right → termLabels left <> termLabels right
  Lacks _ label → [ label ]
  Disjoint _ _ → []
  Ff → []

termLabels ∷ Term → Array String
termLabels term = case term of
  TBase _ → []
  TArrow parameter result → termLabels parameter <> termLabels result
  TVar _ → []
  TRecord fields _ → concatMap fieldLabels fields
  where
  fieldLabels (Tuple label value) = cons label (termLabels value)

atomRows ∷ Atom → Array Int
atomRows atom = case atom of
  Equal left right → termRows left <> termRows right
  Lacks row _ → [ row ]
  Disjoint one other → [ one, other ]
  Ff → []

termRows ∷ Term → Array Int
termRows term = case term of
  TBase _ → []
  TArrow parameter result → termRows parameter <> termRows result
  TVar _ → []
  TRecord fields tails → concatMap (termRows <<< snd) fields <> tails

atomTyVars ∷ Atom → Array Int
atomTyVars atom = case atom of
  Equal left right → tyVarsT left <> tyVarsT right
  Lacks _ _ → []
  Disjoint _ _ → []
  Ff → []
