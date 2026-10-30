-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.5, E17: operation references and performs (split from
-- Generate.Effect, amin tranche 1 parallel batch, step 0). Each marker's
-- condition is syntactic (§3.5): decided from the node and the tables,
-- never a solved type. Children: `Perform/args/k`. Checked nodes as
-- today's (Check/Operation.purs; D1 spec §3.5, R0 Task 7.1b): a perform
-- is a named call (Generate.Call `applied`).
module Features.Check.Generate.Perform
  ( operationRef
  , perform
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Traversable (sequence)
import Domain.Checked.Internal as Checked
import Domain.Ids (EffectId)
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, TyRow, VarId(..))
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..))
import Domain.Syntax (Span)
import Domain.Type (Ty(..)) as Type
import Features.Check.Generate.Call (applied)
import Features.Check.Generate.Callee (Called, atUse, recordInstance)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Effect (marker)
import Features.Check.Generate.Fresh (childAt, instances)
import Features.Check.Generate.Gen (Gen, emit, lifted, slots)
import Features.Check.Generate.Lookup (operationShape)
import Features.Check.Generate.Node
  ( Ruled
  , arrowOf
  , fixed
  , instanceArrow
  , markersAt
  , mintedStages
  )
import Features.Check.Generate.Opening (openedRow)
import Features.Check.Generate.Translate (translate, translateAll)

-- E17, a reference: `θ(⟦T̄ → result⟧)`.
operationRef
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Ruled s)
operationRef context path span effect index = referenced
  =<< operation context path span effect index
  where
  referenced found = ruled found <$ mintedStages path 0 found.instance
  ruled found =
    { ty: arrowOf found.parameters found.result
    , marked: instanceArrow path 0 found.instance
    , node: fixed (Checked.OperationRef effect index <$> found.slots)
    , emits: emit (at context path (ExprRule 17))
        (found.entries <> found.markers)
    }

-- E17, a call: `eq τ_{e_k} θ(⟦T_k⟧)` per argument up to the operation's
-- `n` parameters (B1), typed as E5 types a call (amendment, Task 4.3: a
-- perform is checked as a named call, Check/Operation.purs `named`, so
-- the rule takes E5's cases, where §3.5 wrote `θ(⟦result⟧)` alone):
-- `θ(⟦result⟧)` with `n` arguments, the arrow of the rest with fewer,
-- and with more `⟨p, res⟩` and `eq θ(⟦result⟧) (τ_{e_{n+1}} → … → ⟨p,
-- res⟩)` (B1), as RT8's read-back found. The arguments are generated
-- before the operation is looked up.
perform
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → EffectId
  → Int
  → Array Expr
  → Gen s (Ruled s)
perform recur context path span effect index arguments = do
  generated ← sequence (Array.mapWithIndex argument arguments)
  found ← operation context path span effect index
  applied context { path, span, rule: ExprRule 17, row: RowB }
    (Checked.Perform effect index)
    found
    generated
  where
  argument place = recur context (childAt path "Perform" "args" place)

-- The operation instantiated. When the effect has parameters, `Outside
-- EffectArgument` (O2, origin body): their link to the handler's
-- instantiation runs through the erased row and is not recorded. Then
-- the markers of `T̄` and the result (origin inst). Both follow the
-- argument equations, so they are the instance's markers.
operation
  ∷ ∀ s. Context s → Path → Span → EffectId → Int → Gen s (Called s)
operation context path span effect index = do
  shape ← lifted (operationShape context.tables effect index)
  inst ← instances path (ExprRule 17) span shape.sorts
  parameters ← lifted (translateAll context.tables inst.naming shape.parameters)
  result ← lifted (translate context.tables inst.naming shape.result)
  read ← slots path inst.slots
  found ← lifted
    ( atUse context path shape.parameters
        (operationRow effect shape.sorts)
        shape.result
    )
  let markedTypes = openedRow path found
  recordInstance path markedTypes
  pure
    { parameters: parameters.tys
    , result: result.ty
    , entries: []
    , markers: marker (not (Array.null shape.sorts)) EffectArgument 2 span
        <> markersAt InstOrigin span (parameters.marks <> result.marks)
    , slots: read
    , instance: markedTypes
    }

-- An operation's row, as Check/Operation.purs `operationUse` writes it:
-- its own effect over the effect's parameters, plain, closed.
operationRow ∷ ∀ a. EffectId → Array a → TyRow VarId
operationRow effect parameters = Row
  [ Label (UserEffect effect) (Array.mapWithIndex parameter parameters)
      Plain
  ]
  Nothing
  where
  parameter index _ = Type.TVar (VarId index)
