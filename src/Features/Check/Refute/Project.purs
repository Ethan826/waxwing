-- The projection `toSig` (T-R0a §5) from the recorded problem to CX's
-- `SigProblem`, which rules and refuters read, under CX
-- refute/statements.md §4.1's conditions: (1) names stay as recorded,
-- the rigid lists as they are and every other variable flexible; (2)
-- `D` atom for atom, and no projection (`Nothing`) when a `D` atom or a
-- `q` atom is outside `TExpr`; (3) the body's requirement atoms, `bq`,
-- are dropped; (4) each `app` occurrence in a body atom becomes its own
-- fresh flexible variable, shared with no other; (5) bases are the
-- recorded ones. `withBody` keeps the whole `D` (CX C1-P, C1-D). Arrow
-- spines are walked by a loop, as Domain.Type.Core's `stagesThrough`
-- walks them: a declaration of thousands of parameters has a spine as
-- long. Recursion enters parameters, fields and arguments only.
module Features.Check.Refute.Project
  ( toSig
  , withBody
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (catMaybes, filter, foldr, null, replicate)
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Foldable (elem)
import Data.Maybe (Maybe(..))
import Data.Traversable (mapAccumL, traverse)
import Data.Traversable.Accum (Accum)
import Data.Tuple (Tuple(..))
import Domain.Recorded (AtomId, RecordedProblem, fields)
import Domain.Recorded.Atom (Atom(..), RTExpr(..))
import Domain.Recorded.Origin (Entry)
import Features.Check.Refute.Sig
  ( SigAtom(..)
  , SigEntry
  , SigExpr(..)
  , SigProblem
  , SigVar(..)
  )

toSig ∷ RecordedProblem → Maybe SigProblem
toSig problem =
  if null view.q then map projected (traverse exactEntry view.d)
  else Nothing
  where
  view = fields problem
  projected d =
    { rigidTy: view.rigidTy
    , rigidRow: view.rigidRow
    , d
    , b: (mapAccumL generalizedEntry 0 view.b).value
    }

-- `withBody P B₀` with `B₀` the premises' atoms, in recorded order; `D`
-- whole. An id names every body atom that carries it: `AtomId` is not
-- unique across rules (docs/findings.md, "RT1's translator", item 3).
withBody ∷ SigProblem → NonEmptyArray AtomId → SigProblem
withBody problem premises = problem { b = filter cited problem.b }
  where
  cited entry = elem entry.id premises

exactEntry ∷ Entry Atom → Maybe SigEntry
exactEntry entry = map (entryOf entry) (exactAtom entry.value)

entryOf ∷ Entry Atom → SigAtom → SigEntry
entryOf entry atom = { id: entry.origin.atom, atom }

exactAtom ∷ Atom → Maybe SigAtom
exactAtom atom = case atom of
  Equal left right → SigEqual <$> exact left <*> exact right
  Lacks row label → Just (SigLacks row label)
  Disjoint one other → Just (SigDisjoint one other)
  Ff → Just SigFf

-- `D` is translated exactly: an `app` anywhere leaves it undefined.
exact ∷ RTExpr → Maybe SigExpr
exact expression = case expression of
  Base base → Just (SigBase base)
  Arrow _ _ → exactArrow (spineOf expression)
  TVar var → Just (SigTVar (Named var))
  Record fieldList tails →
    map (flip SigRecord tails) (traverse exactField fieldList)
  App _ _ → Nothing
  where
  exactField (Tuple label value) = map (Tuple label) (exact value)
  exactArrow { parameters, result } =
    foldr SigArrow <$> exact result <*> traverse exact parameters

-- The body's atoms, numbering `app` occurrences left to right.
generalizedEntry ∷ Int → Entry Atom → Accum Int SigEntry
generalizedEntry next entry = withEntry (generalizedAtom next entry.value)
  where
  withEntry { accum, value } = { accum, value: entryOf entry value }

generalizedAtom ∷ Int → Atom → Accum Int SigAtom
generalizedAtom next atom = case atom of
  Equal left right → both SigEqual (generalized next left) right
  Lacks row label → unchanged (SigLacks row label)
  Disjoint one other → unchanged (SigDisjoint one other)
  Ff → unchanged SigFf
  where
  unchanged value = { accum: next, value }

generalized ∷ Int → RTExpr → Accum Int SigExpr
generalized next expression = case expression of
  Base base → unchanged (SigBase base)
  Arrow _ _ → arrowed (spineOf expression)
  TVar var → unchanged (SigTVar (Named var))
  Record fieldList tails →
    record tails (mapAccumL generalizedField next fieldList)
  App _ _ → { accum: next + 1, value: SigTVar (Generalized next) }
  where
  unchanged value = { accum: next, value }
  record tails { accum, value } = { accum, value: SigRecord value tails }
  arrowed { parameters, result } =
    spined (mapAccumL generalized next parameters) result

generalizedField
  ∷ Int → Tuple String RTExpr → Accum Int (Tuple String SigExpr)
generalizedField next (Tuple label value) =
  labelled (generalized next value)
  where
  labelled { accum, value: field } = { accum, value: Tuple label field }

-- The second expression is numbered after the first.
both
  ∷ ∀ a. (SigExpr → SigExpr → a) → Accum Int SigExpr → RTExpr → Accum Int a
both make first second =
  { accum: rest.accum, value: make first.value rest.value }
  where
  rest = generalized first.accum second

-- The parameters numbered first, then the result; the arrows are rebuilt
-- by Array.foldr (a loop).
spined ∷ Accum Int (Array SigExpr) → RTExpr → Accum Int SigExpr
spined parameters result =
  { accum: rest.accum, value: foldr SigArrow rest.value parameters.value }
  where
  rest = generalized parameters.accum result

-- A spine's parameters and its result, which is not an arrow.
spineOf ∷ RTExpr → { parameters ∷ Array RTExpr, result ∷ RTExpr }
spineOf expression = { parameters: catMaybes taken.value, result: taken.accum }
  where
  taken = mapAccumL take expression (replicate (arrowCount expression) unit)
  take rest _ = case rest of
    Arrow parameter more → { accum: more, value: Just parameter }
    settled → { accum: settled, value: Nothing }

arrowCount ∷ RTExpr → Int
arrowCount expression = tailRec counted { found: 0, rest: expression }
  where
  counted { found, rest } = case rest of
    Arrow _ more → Loop { found: found + 1, rest: more }
    _ → Done found
