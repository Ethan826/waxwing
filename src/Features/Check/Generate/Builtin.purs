-- T-R0b §3.5, E18 and E19: `print`, `show` and `crash`, as references
-- and as calls. A reference is a checked `Lambda` (Check/Show.purs,
-- Operation.purs `crashRef`), so its parameter `π = ⟨p, param 0⟩` is at
-- `ParamType p 0` and `crash`'s result at `LambdaBody p` (§5.2, §18.69
-- Q12). The requirement atom `pr` [VOR] is origin body (C1). A call with
-- other than one argument gets every argument's entries and no `pr`: its
-- arity is a static rule (class a). Checked nodes as today's (D1 spec
-- §3.5; R0 Task 7.1b): the lambda binds `LocalId (-1)` and its body
-- applies the builtin to it; `print`'s row is its declared `Console`.
module Features.Check.Generate.Builtin
  ( Builtin(..)
  , builtinCall
  , builtinRef
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..), maybe')
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..), Role(..), VarSort(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (Expr, LocalId(..))
import Domain.Row (EffectRef(..), Label(..), Mark(..), Row(..), closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..), TyRow)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Ref)
import Features.Check.Generate.Fresh (childAt, nodeRes)
import Features.Check.Generate.Gen
  ( Gen
  , GenEntry(..)
  , GenReq(..)
  , emit
  , fresh
  , positioned
  )
import Features.Check.Generate.Node (Ruled, fixed, flex, tagged)

data Builtin = PrintBuiltin | ShowBuiltin | CrashBuiltin

-- E18: `π → Unit`, `π → Text`, `π → ⟨p, res⟩`; `pr π`.
builtinRef ∷ ∀ s. Context s → Path → Span → Builtin → Gen s (Ruled s)
builtinRef context path span builtin = do
  parameter ← fresh
    { path
    , role: Param 0
    , rule: ExprRule 18
    , span
    , sort: SortType
    , position: ParamType path 0
    }
  result ← resultOf
  read ← positioned (ParamType path 0) (flex parameter)
  pure
    { ty: TFun (flex parameter) (rowOf builtin) result.ty
    , node: fixed (lambda span builtin <$> read <*> result.read)
    , emits: emit (at context path (ExprRule 18))
        [ tagged (EmitBQ (GenPrintable (flex parameter))) RowC 1 Body span ]
    }
  where
  resultOf = case builtin of
    PrintBuiltin → pure { ty: TUnit, read: pure TUnit }
    ShowBuiltin → pure { ty: TText, read: pure TText }
    CrashBuiltin → crashResult
  crashResult = do
    crashed ← fresh
      { path
      , role: Res
      , rule: ExprRule 18
      , span
      , sort: SortType
      , position: LambdaBody path
      }
    read ← positioned (LambdaBody path) (flex crashed)
    pure { ty: flex crashed, read }

-- E19: `Unit`, `Text`, `⟨p, res⟩`; `pr τ_e` when there is one argument.
-- Arguments at `Print/args/i` (`Show/…`, `Crash/…`).
builtinCall
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Builtin
  → Array Expr
  → Gen s (Ruled s)
builtinCall recur context path span builtin arguments = do
  generated ← sequence (Array.mapWithIndex argument arguments)
  ty ← resultOf
  pure
    { ty
    , node: fixed (called span builtin <$> traverse _.expr generated)
    , emits: do
        emit (at context path (ExprRule 19))
          (map printable (single generated))
        traverse_ _.emits generated
    }
  where
  argument index = recur context (childAt path (label builtin) "args" index)
  single generated =
    if Array.length generated == 1 then generated else []
  printable found = tagged (EmitBQ (GenPrintable found.ty)) RowC 1 Body span
  resultOf = case builtin of
    PrintBuiltin → pure TUnit
    ShowBuiltin → pure TText
    CrashBuiltin → flex <$> nodeRes path (ExprRule 19) span

-- The builtin applied to its one argument (Check/Operation.purs
-- `printCall`). Another count is refused today (E_ARITY) and by the
-- static rule, so no witness exists for it; its node only keeps `build`
-- total: the builtin applied, as a call of its reference would be.
called ∷ Span → Builtin → Array Checked.Expr → Checked.Node
called span builtin arguments = maybe' (const placeholder) single
  (Array.uncons arguments)
  where
  placeholder = Checked.Apply (unitAt span) arguments
  single found =
    if Array.null found.tail then applied builtin found.head else placeholder

-- `fn(x) => b(x)` over the parameter's and the body's checked types.
lambda ∷ Span → Builtin → Ty Open → Ty Open → Checked.Node
lambda span builtin parameter result = Checked.Lambda
  [ { local: Just local, ty: parameter } ]
  (Checked.Expr { ty: result, span, node: applied builtin value })
  where
  local = LocalId (-1)
  value = Checked.Expr { ty: parameter, span, node: Checked.Local local }

applied ∷ Builtin → Checked.Expr → Checked.Node
applied = case _ of
  PrintBuiltin → Checked.Print
  ShowBuiltin → Checked.Show
  CrashBuiltin → Checked.Crash

unitAt ∷ Span → Checked.Expr
unitAt span = Checked.Expr { ty: TUnit, span, node: Checked.UnitValue }

-- `print`'s declared row (Check/Operation.purs `console`); `show` and
-- `crash` have a fresh row today, the closed empty row here (§12.1's
-- fallback).
rowOf ∷ ∀ s. Builtin → TyRow (Ref s)
rowOf = case _ of
  PrintBuiltin → Row [ Label ConsoleEffect [] NoFail ] Nothing
  ShowBuiltin → closedRow
  CrashBuiltin → closedRow

label ∷ Builtin → String
label = case _ of
  PrintBuiltin → "Print"
  ShowBuiltin → "Show"
  CrashBuiltin → "Crash"
