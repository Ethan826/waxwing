-- The most general unifier of a problem's original equations, in the
-- one-tail fragment (Task 4.2; docs/plans/r0-entailed-ground.md §2):
-- Robinson's unification in Martelli and Montanari's transformation
-- form, with Rémy's row rule. Rigid variables are constants. A failure
-- is `Nothing`, which every reader takes as "no reduction". The rule
-- names (R1-R5) are the note's.
module Features.Check.Entailed.Mgu
  ( Theta
  , mgu
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array (elem, filter, length, mapMaybe, nub)
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded.Atom (RTExpr(..), Role(..), Var(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..), Step(..)) as Origin
import Features.Check.Entailed.Merge (Fields, substitute)
import Features.Check.Mentions (isRigid, mentions)

type Theta = Map Var RTExpr

type Equation = Tuple RTExpr RTExpr

-- `fresh` counts the row variables R5 has made; `taken` is every
-- variable the problem names, so a made one is never one of them.
type State =
  { equations ∷ Array Equation
  , theta ∷ Theta
  , fresh ∷ Int
  , taken ∷ Map Var Unit
  }

mgu ∷ Map Var Unit → Array Equation → Maybe Theta
mgu taken equations =
  tailRec step (Just { equations, theta: Map.empty, fresh: 0, taken })

step ∷ Maybe State → Step (Maybe State) (Maybe Theta)
step = maybe (Done Nothing) next
  where
  next state = maybe (Done (Just state.theta)) (popped state)
    (Array.uncons state.equations)
  popped state { head: Tuple one other, tail } =
    Loop (solve one other state { equations = tail })

-- One equation against the rest. R3 and R4″ are every failing arm.
solve ∷ RTExpr → RTExpr → State → Maybe State
solve one other state
  | one == other = Just state -- R1
  | otherwise = case one, other of
      TVar variable, _ | not (isRigid variable) → binding variable other state
      _, TVar variable | not (isRigid variable) → binding variable one state
      Arrow left right, Arrow left' right' →
        Just (pushed [ Tuple left left', Tuple right right' ] state) -- R2
      App head arguments, App head' arguments'
        | head == head' && length arguments == length arguments' →
            Just (pushed (Array.zip arguments arguments') state) -- R2′
      Record fields tails, Record fields' tails' →
        rows { fields, tails } { fields: fields', tails: tails' } state
      _, _ → Nothing

-- R5. Common labels give field equations; then the tails' row.
rows ∷ Fields → Fields → State → Maybe State
rows left right state =
  if repeats left || repeats right then Nothing
  else tailed (only left right) (only right left) left.tails right.tails
    (pushed common state)
  where
  common = mapMaybe (paired right) left.fields

-- A record's tail in the fragment: none, or one row variable.
data Tail = Closed | Tailed Var

tailed
  ∷ Fields → Fields → Array Var → Array Var → State → Maybe State
tailed onlyLeft onlyRight leftTails rightTails state =
  case tailOf leftTails, tailOf rightTails of
    Closed, Closed → when' (none onlyLeft && none onlyRight) state
    Closed, Tailed tail → whenFlexible tail (none onlyRight)
      (binding tail (closed onlyLeft) state)
    Tailed tail, Closed → whenFlexible tail (none onlyLeft)
      (binding tail (closed onlyRight) state)
    Tailed tail, Tailed tail'
      | tail == tail' → when' (none onlyLeft && none onlyRight) state
      | otherwise → apart onlyLeft onlyRight tail tail' state
  where
  tailOf tails = maybe Closed Tailed (Array.head tails)
  closed added = Record added.fields []
  whenFlexible tail holds bound =
    if holds && not (isRigid tail) then bound else Nothing

-- R5's rows with two distinct tails: `ρ` on the left, `ρ′` on the
-- right; the fresh row binds in sequence.
apart ∷ Fields → Fields → Var → Var → State → Maybe State
apart onlyLeft onlyRight tail tail' state =
  case none onlyLeft, none onlyRight of
    true, true
      | not (isRigid tail) → binding tail (Record [] [ tail' ]) state
      | not (isRigid tail') → binding tail' (Record [] [ tail ]) state
      | otherwise → Nothing
    false, true | not (isRigid tail') →
      binding tail' (Record onlyLeft.fields [ tail ]) state
    true, false | not (isRigid tail) →
      binding tail (Record onlyRight.fields [ tail' ]) state
    false, false | not (isRigid tail || isRigid tail') →
      binding tail (Record onlyRight.fields [ row ]) made
        >>= binding tail' (Record onlyLeft.fields [ row ])
    _, _ → Nothing
  where
  index = freshIndex state
  row = madeRow index
  made = state { fresh = index + 1 }

-- R4 and every R5 binding: the current θ applied to the image first,
-- the occurs check over fields and tails, then the binding applied to
-- the remaining equations and to θ's images (θ stays idempotent).
binding ∷ Var → RTExpr → State → Maybe State
binding variable image state =
  substitute state.theta image >>= checked
  where
  checked found =
    if mentions (eq variable) found then Nothing
    else eliminated variable found state

eliminated ∷ Var → RTExpr → State → Maybe State
eliminated variable found state = do
  equations ← traverse both state.equations
  theta ← traverse (substitute single) state.theta
  pure state { equations = equations, theta = Map.insert variable found theta }
  where
  single = Map.singleton variable found
  both (Tuple one other) =
    Tuple <$> substitute single one <*> substitute single other

pushed ∷ Array Equation → State → State
pushed added state = state { equations = added <> state.equations }

-- A row variable the problem does not name, at a path generation never
-- writes (`entailed` is no constructor field), skipping any it does.
freshIndex ∷ State → Int
freshIndex state = tailRec next state.fresh
  where
  next index =
    if Map.member (madeRow index) state.taken then Loop (index + 1)
    else Done index

madeRow ∷ Int → Var
madeRow index = FreshVar
  ( Origin.Path
      { root: Origin.InBody
      , steps: [ Origin.Named "entailed", Origin.Index index ]
      }
  )
  Rest

paired ∷ Fields → Tuple String RTExpr → Maybe Equation
paired other (Tuple label value) =
  map (Tuple value <<< snd) (Array.find (eq label <<< fst) other.fields)

only ∷ Fields → Fields → Fields
only this other = this { fields = filter absent this.fields }
  where
  absent (Tuple label _) = not (elem label (map fst other.fields))

none ∷ Fields → Boolean
none = Array.null <<< _.fields

repeats ∷ Fields → Boolean
repeats found = length (nub labels) /= length labels
  where
  labels = map fst found.fields

when' ∷ Boolean → State → Maybe State
when' holds state = if holds then Just state else Nothing
