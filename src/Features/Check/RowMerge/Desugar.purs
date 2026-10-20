module Features.Check.RowMerge.Desugar
  ( desugaredType
  , module Features.Check.RowMerge.Several
  ) where

import Prelude
import Prim hiding (Row)
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (mapAccumL)
import Data.Tuple (Tuple(..))
import Domain.Row (HandlerRows, Label(..))
import Domain.Row as EffectRow
import Domain.Syntax (Span)
import Domain.Type (Ty(..), TyRow)
import Domain.Type.Record (recordRow)
import Features.Check.Disjoint (seedApart)
import Features.Check.RowMerge.Chain
  ( finished
  , isMeta
  , pairedWith
  , predicateFor
  )
import Features.Check.RowMerge.Merge (Row)
import Features.Check.PartOrigin (Step(..))
import Features.Check.RowMerge.Occurrence (nextPredicate)
import Features.Check.RowMerge.Several (severalUnknownBy)
import Features.Check.RowStore (Because(..))
import Features.Check.Subst (Flex(..), Subst)

-- What a step of the traversal returns: the substitution reached and the
-- part rebuilt (Data.Traversable's `Accum`).
type Built a = { accum ∷ Subst, value ∷ a }

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
