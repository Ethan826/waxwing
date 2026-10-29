-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.2, E16: a block's items, each `let` extending `Γ` for the
-- items after it, monomorphically (§5.1). Children:
-- `Block/items/i/Let/value` (`…/Defer/value`, `…/Discard/value`),
-- `Block/result`. Checked nodes as today's (Check/Block.purs; D1 spec
-- §3.5, R0 Task 7.1b).
module Features.Check.Generate.Block (block) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe, maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (Base(..), OutsideKind(..))
import Domain.Recorded.Effect (MTy(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, LocalId)
import Domain.Resolved as Resolved
import Domain.Syntax (Span)
import Domain.Type (Ty(..))
import Features.Check.Generate.Context (Context, Recur, at, bindLocal)
import Features.Check.Generate.Elab (Elab)
import Features.Check.Generate.Elab.Log (Log)
import Features.Check.Generate.Elab.Log as Log
import Features.Check.Generate.Fresh (childAt, childOf)
import Features.Check.Generate.Gen (Gen, GenEntry(..), emit)
import Features.Check.Generate.Node (Generated, Ruled, fixed, tagged)
import Features.Check.Generate.Obligation (agreeEqual)

-- What one item contributes: the environment after it, its checked
-- item and its entries.
type Visited s =
  { context ∷ Context s, item ∷ Elab s Checked.Item, emits ∷ Gen s Unit }

-- E16: items in order, each `let` extending `Γ` for the items after it;
-- `defer e` gives `eq τ_e Unit` (B1) and `Outside Deferred` (O6) at the
-- item's path with its span (reading 19). The block's type is the
-- result's. One left fold (a loop) carries the environment, each step
-- binding a `Gen` already run and keeping its item in a join list, so a
-- block of thousands of items costs no stack.
block
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Array Resolved.Item
  → Expr
  → Gen s (Ruled s)
block recur context path items result = do
  done ← Array.foldl step (pure { context, items: Log.none })
    (Array.mapWithIndex Tuple items)
  final ← recur done.context (childOf path "Block" "result") result
  let visited = Log.entries done.items
  pure
    { ty: final.ty
    , marked: final.marked
    , node: fixed (Checked.Block <$> traverse _.item visited <*> final.expr)
    , emits: traverse_ _.emits visited *> final.emits
    }
  where
  step walked (Tuple index found) = walked >>= visit index found
  visit index found done = added done
    <$> itemOf recur done.context (childAt path "Block" "items" index) found

added
  ∷ ∀ s
  . { context ∷ Context s, items ∷ Log (Visited s) }
  → Visited s
  → { context ∷ Context s, items ∷ Log (Visited s) }
added done visited =
  { context: visited.context, items: done.items <> Log.one visited }

itemOf
  ∷ ∀ s. Recur s → Context s → Path → Resolved.Item → Gen s (Visited s)
itemOf recur context path = case _ of
  Resolved.Let _ local value → letItem context local
    <$> recur context (childOf path "Let" "value") value
  Resolved.Defer span value → deferred context path span
    <$> recur context (childOf path "Defer" "value") value
  Resolved.Discard value → discarded context
    <$> recur context (childOf path "Discard" "value") value

discarded ∷ ∀ s. Context s → Generated s → Visited s
discarded context found =
  { context, item: Checked.Discard <$> found.expr, emits: found.emits }

letItem ∷ ∀ s. Context s → Maybe LocalId → Generated s → Visited s
letItem context local found =
  { context: maybe context
      (bindLocal <@> { ty: found.ty, marked: found.marked } <@> context)
      local
  , item: Checked.Let local <$> found.expr
  , emits: found.emits
  }

deferred ∷ ∀ s. Context s → Path → Span → Generated s → Visited s
deferred context path span found =
  { context
  , item: Checked.Defer <$> found.expr
  , emits: do
      emit (at context path (ExprRule 16))
        [ agreeEqual span found.ty TUnit found.marked (MBase UnitBase)
        , tagged (EmitOutside Deferred) RowO 6 Body span
        ]
      found.emits
  }
