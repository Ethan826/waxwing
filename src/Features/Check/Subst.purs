module Features.Check.Subst
  ( Flex(..)
  , Subst(..)
  , RowPair
  , empty
  , isEmpty
  , substitute
  , substituteRow
  , postpone
  , walk
  , walkRow
  , resolve
  , resolveRow
  , resolveLabel
  , boundAt
  , metaOf
  ) where

import Prelude
import Prim hiding (Row)
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Tuple (Tuple, snd)
import Domain.Row (Label(..), Row(..), isBare, isPure, mapHandlerRows, openRow)
import Domain.Type
  ( Substitution
  , Ty(..)
  , TyRow
  , VarId
  , foldStages
  , stagesThrough
  )
import Domain.Type as Type
import Domain.Type.Parts (mapRecord)
import Features.Check.Aliases (Aliases, jumped, noAliases)
import Features.Check.MarkStore (MarkStore, RowMode, emptyMarks, resolveMark)
import Features.Check.Occurrence (OccurrenceId, Sides)
import Features.Check.Search (Stack(..), stackItems)
import Features.Check.TailWatch (TailWatch, emptyWatch)

-- A checker variable: a signature's own variable, which is fixed inside
-- its function and unifies only with itself, or a meta, which stands for
-- one use's still unknown type or row and may be bound to any. A variable
-- has one sort by construction, so a meta is looked up by its position:
-- a type's variable in `types`, a row's tail in `rows`.
data Flex = Rigid VarId | Meta Int

derive instance eqFlex ∷ Eq Flex
derive instance ordFlex ∷ Ord Flex

-- Triangular: a binding may mention other bound metas. Binding a meta then
-- never rewrites earlier bindings; `resolve` follows the links on demand.
-- Row unification extends a row meta with a fresh tail meta; `fresh` is
-- the next, counting down from -1, so it never meets a checker meta,
-- which counts up from 0 (Features.Check.Scheme). `postponed`: row pairs
-- whose unification met a Fail label with a deferred key (design §2), in
-- order, to be retried by Features.Check.Unify `settleRows`. `links`
-- (design §6): an occurrence and the occurrence it is the same label as,
-- recorded by every row unification, the first per occurrence kept;
-- nothing in unification reads them. `relays`: where a clause row's labels
-- came from, followed only past a clause-row hop (Features.Check.Links).
-- `marks` (FX008): the bindings of mark metas and the mark edges, kept with
-- the substitution so that a postponed pair that reverts takes its edges
-- with it. `watch` (FX008):
-- the tails the restricted registry watches, with those bound since it
-- last looked; data, so it reverts the same way. `lacks` (R001): the
-- labels each record tail may never hold, a meta's or a signature's rigid
-- one's (Features.Check.Lacks).
newtype Subst = Subst
  { types ∷ Map Int (Ty Flex)
  , rows ∷ Map Int (TyRow Flex)
  , fresh ∷ Int
  , postponed ∷ Array RowPair
  , links ∷ Map OccurrenceId OccurrenceId
  , relays ∷ Map OccurrenceId OccurrenceId
  , marks ∷ MarkStore (Ty Flex)
  , watch ∷ TailWatch
  , aliases ∷ Aliases
  , lacks ∷ Map Flex (Set String)
  }

-- A postponed pair keeps where its sides were written and how it treats
-- marks, for its retry.
type RowPair =
  { left ∷ TyRow Flex, right ∷ TyRow Flex, sides ∷ Sides, mode ∷ RowMode }

empty ∷ Subst
empty = Subst
  { types: Map.empty
  , rows: Map.empty
  , fresh: -1
  , postponed: []
  , links: Map.empty
  , relays: Map.empty
  , marks: emptyMarks
  , watch: emptyWatch
  , aliases: noAliases
  , lacks: Map.empty
  }

-- No meta is bound, so resolving under it changes no type. (Mark bindings
-- are not counted: Check strips every mark after resolving.)
isEmpty ∷ Subst → Boolean
isEmpty (Subst bindings) = Map.isEmpty bindings.types
  && Map.isEmpty bindings.rows

-- One pass: each bound meta becomes its binding, which is not revisited.
-- Domain.Type's substitution is exactly this, and is defined even on
-- cyclic substitutions.
substitute ∷ Subst → Ty Flex → Ty Flex
substitute subst = Type.substitute (substitution subst)

substituteRow ∷ Subst → TyRow Flex → TyRow Flex
substituteRow subst = Type.substituteRow (substitution subst)

-- The substitution with this row pair set aside, undecided.
postpone
  ∷ ∀ r
  . Subst
  → { left ∷ TyRow Flex
    , right ∷ TyRow Flex
    , sides ∷ Sides
    , mode ∷ RowMode
    | r
    }
  → Subst
postpone (Subst bindings) pair = Subst bindings
  { postponed = Array.snoc bindings.postponed
      { left: pair.left
      , right: pair.right
      , sides: pair.sides
      , mode: pair.mode
      }
  }

-- The type itself if it is not a bound meta, else the end of its chain.
-- Only a meta enters the loop: most types walked are not one, and the
-- loop's steps were a measurable share of checking a large body (T003).
walk ∷ Subst → Ty Flex → Ty Flex
walk (Subst bindings) start = case start of
  TVar (Meta _) → tailRec step start
  _ → start
  where
  step ty = case ty of
    TVar (Meta meta) → maybe (Done ty) Loop (Map.lookup meta bindings.types)
    _ → Done ty

-- The binding a row's tail leads to, with the meta that holds it; alias
-- hops are jumped (Features.Check.Aliases). Nothing unless the tail is bound.
boundAt ∷ Subst → Maybe Flex → Maybe (Tuple Int (TyRow Flex))
boundAt (Subst bindings) tail = (metaOf =<< tail) >>= jumped bindings.aliases
  bindings.rows
  isBare
  (openRow <<< Meta)

-- The row with its tail's bindings spliced in, by a loop, until the tail
-- is closed, rigid or an unbound meta. Labels stay unresolved. Chunks are
-- gathered on a stack and joined once, so a chain of 1,000 one-label
-- bindings costs no copy per binding.
walkRow ∷ Subst → TyRow Flex → TyRow Flex
walkRow subst row@(Row labels tail) =
  maybe row spliced (snd <$> boundAt subst tail)
  where
  spliced first = joined
    (tailRec step { chunks: Push labels Bottom, next: first })
  step pending = advance pending.chunks pending.next
  advance chunks (Row more rest) = maybe
    (Done { chunks: Push more chunks, tail: rest })
    (Loop <<< pushed chunks more)
    (snd <$> boundAt subst rest)
  pushed chunks more next = { chunks: Push more chunks, next }
  joined done = Row (Array.concat (stackItems done.chunks)) done.tail

-- Follows bindings until no bound meta remains. Only for acyclic
-- substitutions, which are all `unify` makes. Recursion is over the type's
-- structure only; a chain of meta-to-meta links is followed by `walk`, a
-- loop, so long chains cost no stack. An arrow's spine is followed
-- through bound metas by a loop, and a row's tail by `walkRow`.
resolve ∷ Subst → Ty Flex → Ty Flex
resolve subst ty = case walk subst ty of
  TData id arguments rows → TData id (map resolved arguments)
    (map (resolveRow subst) rows)
  THandler label rows → THandler (resolveLabel subst label)
    (mapHandlerRows (resolveRow subst) rows)
  arrow@(TFun _ _ _) → resolvedStages (stagesThrough (walk subst) arrow)
  TRecord row → mapRecord resolved row
  settled → settled
  where
  resolved argument = resolve subst argument
  resolvedStages found = foldStages stage (resolved found.result)
    found.arrows
  stage parameter row rest = TFun (resolved parameter)
    (resolveRow subst row)
    rest

resolveRow ∷ Subst → TyRow Flex → TyRow Flex
resolveRow subst row
  | isPure row = row
  | otherwise = resolvedLabels (walkRow subst row)
      where
      resolvedLabels (Row labels tail) = Row (map (resolveLabel subst) labels)
        tail

resolveLabel ∷ Subst → Label (Ty Flex) → Label (Ty Flex)
resolveLabel subst@(Subst bindings) (Label effect arguments mark) =
  Label effect (map (resolve subst) arguments)
    (resolveMark bindings.marks mark)

substitution ∷ Subst → Substitution Flex Flex
substitution (Subst bindings) = { types: replaced, rows: replacedRow }
  where
  replaced flex = maybe (TVar flex) identity (bound bindings.types flex)
  replacedRow flex = maybe (openRow flex) identity (bound bindings.rows flex)

-- The binding of a variable in one sort's table, if it is a bound meta.
bound ∷ ∀ a. Map Int a → Flex → Maybe a
bound table flex = flip Map.lookup table =<< metaOf flex

metaOf ∷ Flex → Maybe Int
metaOf = case _ of
  Meta meta → Just meta
  Rigid _ → Nothing
