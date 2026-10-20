module Features.Check.RowMerge.Desugar
  ( desugaredRow
  , desugaredType
  , module Features.Check.RowMerge.Several
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldM, foldl)
import Data.Maybe (Maybe(..), maybe)
import Data.Set as Set
import Data.Traversable (mapAccumL)
import Data.Tuple (Tuple(..), fst)
import Domain.Row (HandlerRows, Label(..))
import Domain.Row as EffectRow
import Domain.Syntax (Span)
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Record (recordRow)
import Features.Check.Disjoint (requireApart, seedApart)
import Features.Check.Refused (Solving)
import Features.Check.Lacks (addLacks)
import Features.Check.RowMerge.Merge (Row)
import Features.Check.RowMerge.Predicate (made)
import Features.Check.PartOrigin (Step(..))
import Features.Check.RowMerge.Occurrence (nextPredicate, recorded)
import Features.Check.RowMerge.Several (severalUnknownBy)
import Features.Check.RowStore (Because(..), plain)
import Features.Check.Subst (Flex(..), Subst(..))
import Features.Check.UnifyFailure (Failure)

-- What a step of the traversal returns: the substitution reached and the
-- part rebuilt (Data.Traversable's `Accum`).
type Built a = { accum ∷ Subst, value ∷ a }

-- A row made with k ≥ 2 unknown tails (R005 Tranche B plan §2.1, T1):
-- the unknown tails m1 … mk, in the row's sorted tail order, become one
-- fresh meta t and `Merge m1 m2 t1`, `Merge t1 m3 t2`, …, `Merge t(k-2)
-- mk t`, folded from the left as PureScript writes `Union r s t` and as
-- research/row-merge-qt qt-preds.mjs `desugar` does; fields and rigid
-- tails stay in the row. Counted as written, as the prototype counts
-- them: a tail bound since is still a part. Each predicate's parts are
-- required disjoint when it is made (refused if they are not), and t,
-- fresh, lacks the row's labels and is apart from its rigid tails. One
-- desugaring per occurrence, no memo (§2.1).
desugaredRow
  ∷ Solving
  → Maybe Span
  → Row
  → Subst
  → Either Failure { row ∷ Row, subst ∷ Subst }
desugaredRow solving site written subst =
  if Array.length metas < 2 then Right { row: written, subst }
  else finished site [] (nextPredicate subst) written
    <$> foldM required { tail: first, subst } rest
  where
  metas = Array.filter isMeta written.tails
  first = maybe (Meta 0) identity (Array.head metas)
  rest = Array.drop 1 metas
  required found part = pairedWith (predicateFor site found part)
    <$> requireApart solving plain (predicateFor site found part).subst
      found.tail
      part

-- The same for a type made at instantiation, whose unknown tails are all
-- fresh: requiring two fresh tails apart only stores the pair
-- (Features.Check.Disjoint `requireApart`), so nothing can be refused.
freshRow
  ∷ Maybe Span → Array Step → Row → Subst → { row ∷ Row, subst ∷ Subst }
freshRow site steps written subst =
  if Array.length metas < 2 then { row: written, subst }
  else finished site steps (nextPredicate subst) written
    (foldl stored { tail: first, subst } rest)
  where
  metas = Array.filter isMeta written.tails
  first = maybe (Meta 0) identity (Array.head metas)
  rest = Array.drop 1 metas
  stored found part = pairedWith (predicateFor site found part)
    (seedApart found.tail part Implied (predicateFor site found part).subst)

-- Every record row of the type desugared, inner ones first. A type with
-- no row of two unknown tails is returned as it is, unbuilt.
desugaredType
  ∷ Maybe Span → Ty Flex → Subst → { ty ∷ Ty Flex, subst ∷ Subst }
desugaredType site ty subst =
  if severalUnknownBy isMeta ty then typeOf (rebuilt site [] subst ty)
  else { ty, subst }
  where
  typeOf found = { ty: found.value, subst: found.accum }

-- `Merge acc part t`, t fresh: the predicate made, its parts' pair not
-- yet.
predicateFor
  ∷ Maybe Span
  → { tail ∷ Flex, subst ∷ Subst }
  → Flex
  → { tail ∷ Flex, subst ∷ Subst }
predicateFor site found part =
  { tail: Meta fresh
  , subst: made site (single found.tail) (single part) (single (Meta fresh))
      (Subst bindings { fresh = fresh - 1 })
  }
  where
  Subst bindings = found.subst
  fresh = bindings.fresh
  single tail = { fields: [], tails: [ tail ] }

pairedWith
  ∷ { tail ∷ Flex, subst ∷ Subst } → Subst → { tail ∷ Flex, subst ∷ Subst }
pairedWith made reached = made { subst = reached }

-- The row with its unknown tails replaced by the last result, which
-- lacks the row's labels and is apart from its rigid tails; the
-- occurrence recorded, its predicates those made since `first`.
finished
  ∷ Maybe Span
  → Array Step
  → Int
  → Row
  → { tail ∷ Flex, subst ∷ Subst }
  → { row ∷ Row, subst ∷ Subst }
finished site steps first written found =
  { row: recordRow written.fields (rigids <> [ found.tail ])
  , subst: recorded site steps first written found.tail
      (foldl apart (addLacks found.tail labels found.subst) rigids)
  }
  where
  rigids = Array.filter (not <<< isMeta) written.tails
  labels = Set.fromFoldable (map fst written.fields)
  apart reached rigid = seedApart found.tail rigid Implied reached

-- `steps`: from the root of the type being desugared to `ty`, recorded
-- with each occurrence (diagnostic metadata).
rebuilt ∷ Maybe Span → Array Step → Subst → Ty Flex → Built (Ty Flex)
rebuilt site steps subst ty = case ty of
  TRecord written → record written.tails
    (mapAccumL (field site steps) subst written.fields)
  TData id arguments rows → dataType id
    (mapAccumL (rebuilt site other) subst arguments)
    rows
  TFun parameter row result → arrow
    (rebuilt site (Array.snoc steps Parameter) subst parameter)
    row
    result
  THandler label rows → handler rows (labelled site other subst label)
  _ → { accum: subst, value: ty }
  where
  other = Array.snoc steps Other
  record tails found = recordOf
    (freshRow site steps (recordRow found.value tails) found.accum)
  recordOf found = { accum: found.subst, value: TRecord found.row }
  dataType id found rows = over (TData id found.value)
    (mapAccumL (effectRow site other) found.accum rows)
  arrow found row result = arrowRow found.value
    (effectRow site other found.accum row)
    result
  arrowRow parameter found result = over (TFun parameter found.value)
    (rebuilt site (Array.snoc steps Result) found.accum result)
  handler rows found = over (THandler found.value)
    (handlerRows site other found.accum rows)

field
  ∷ Maybe Span
  → Array Step
  → Subst
  → Tuple String (Ty Flex)
  → Built (Tuple String (Ty Flex))
field site steps subst (Tuple name part) = over (Tuple name)
  (rebuilt site (Array.snoc steps (Field name)) subst part)

-- A handler's own rows (what its clauses may perform), each desugared:
-- their labels' arguments can hold records too (`Handler(Log with
-- State({ ...r, ...s }))`).
handlerRows
  ∷ Maybe Span
  → Array Step
  → Subst
  → HandlerRows (Ty Flex) Flex
  → Built (HandlerRows (Ty Flex) Flex)
handlerRows site steps subst rows = clauses
  (effectRow site steps subst rows.inference)
  where
  clauses found = maybe (over (withClauses Nothing) found)
    (clausesBuilt found)
    rows.clauses
  clausesBuilt found row = over (withClauses' found.value <<< Just)
    (effectRow site steps found.accum row)
  withClauses none inference = { inference, clauses: none }
  withClauses' inference found = { inference, clauses: found }

-- An effect row's label arguments desugared; its tail is an effect row's.
effectRow
  ∷ Maybe Span → Array Step → Subst → TyRow Flex → Built (TyRow Flex)
effectRow site steps subst (EffectRow.Row labels tail) = over
  (flip EffectRow.Row tail)
  (mapAccumL (labelled site steps) subst labels)

labelled
  ∷ Maybe Span
  → Array Step
  → Subst
  → Label (Ty Flex)
  → Built (Label (Ty Flex))
labelled site steps subst (Label effect arguments mark) = over relabel
  (mapAccumL (rebuilt site steps) subst arguments)
  where
  relabel found = Label effect found mark

over ∷ ∀ a b. (a → b) → Built a → Built b
over change found = { accum: found.accum, value: change found.value }

isMeta ∷ Flex → Boolean
isMeta = case _ of
  Meta _ → true
  Rigid _ → false
