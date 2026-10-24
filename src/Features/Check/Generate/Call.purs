-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.2, E3-E6: references to and calls of functions and
-- constructors. Each occurrence instantiates the callee's or owner's
-- variables as `⟨p, inst i⟩` (θ), so two occurrences share none
-- (G-fresh). The declared count `n` comes from the signature, so the
-- over-application case is syntactic (§4). Index order (docs/findings.md
-- "RT1's translator", reading 4): the rule's listed entries, then the
-- markers of the types it translated (T₁ … Tₙ, then the result). The
-- checked node (D1 spec §3.5; R0 Task 7.1b) is today's (Check/Use.purs,
-- Call.purs): the instantiation read at `Slot p i`, and an over-applied
-- call `Apply (Call g θ a₁…aₙ) [aₙ₊₁…]`, whose saturated node's type is
-- B1's `τ_{e_{n+1}} → … → ⟨p, res⟩` read from the values already read.
module Features.Check.Generate.Call
  ( applied
  , call
  , construct
  , ctorRef
  , functionRef
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Traversable (sequence, traverse)
import Domain.Checked.Internal (Instantiation, Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (CtorId, Expr, FunctionId)
import Domain.Row (closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..))
import Features.Check.Generate.Callee (Called, ctorInstance, functionInstance)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fresh (childAt, nodeRes)
import Features.Check.Generate.Gen (Gen, GenAtom(..), GenEntry(..), emit)
import Features.Check.Generate.Node
  ( Generated
  , Ruled
  , arrowOf
  , fixed
  , flex
  , tagged
  )

-- The node's place and rule, and the spec row of its argument
-- equations: F1 for E5 and E6, B1 for E17.
type Node = { path ∷ Path, span ∷ Span, rule ∷ RuleId, row ∷ RowGroup }

-- How a named use's checked node is built from its instantiation and
-- arguments (Check/Call.purs `Node`).
type Made = Instantiation → Array Checked.Expr → Checked.Node

-- E3: `θ(⟦T₁ → … → R⟧)`.
functionRef ∷ ∀ s. Context s → Path → Span → FunctionId → Gen s (Ruled s)
functionRef context path span function =
  referenced context path (ExprRule 3) (Checked.FunctionRef function)
    <$> functionInstance context path span function (ExprRule 3)

-- E4: `θ(⟦fields → owner(args)⟧)`.
ctorRef ∷ ∀ s. Context s → Path → Span → CtorId → Gen s (Ruled s)
ctorRef context path span ctor =
  referenced context path (ExprRule 4)
    (Checked.CtorRef ctor) <$> ctorInstance context path span ctor (ExprRule 4)

-- E5: `g(e₁ … e_k)` against `g`'s `n` parameters.
call
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → FunctionId
  → Array Expr
  → Gen s (Ruled s)
call recur context path span function arguments = do
  found ← functionInstance context path span function (ExprRule 5)
  generated ← traverse (argument recur context path "Call")
    (Array.mapWithIndex { index: _, expr: _ } arguments)
  applied context { path, span, rule: ExprRule 5, row: RowF }
    (Checked.Call function)
    found
    generated

-- E6: as E5, with the constructor's fields and owner.
construct
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → CtorId
  → Array Expr
  → Gen s (Ruled s)
construct recur context path span ctor arguments = do
  found ← ctorInstance context path span ctor (ExprRule 6)
  generated ← traverse (argument recur context path "Construct")
    (Array.mapWithIndex { index: _, expr: _ } arguments)
  applied context { path, span, rule: ExprRule 6, row: RowF }
    (Checked.Construct ctor)
    found
    generated

referenced
  ∷ ∀ s
  . Context s
  → Path
  → RuleId
  → (Instantiation → Checked.Node)
  → Called s
  → Ruled s
referenced context path rule made found =
  { ty: arrowOf found.parameters found.result
  , node: fixed (made <$> found.slots)
  , emits: emit (at context path rule) (found.entries <> found.markers)
  }

-- An argument at `Call/args/i` (`Construct/args/i`). Every argument is
-- generated, whatever the count (G-dead).
argument
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → String
  → { index ∷ Int, expr ∷ Expr }
  → Gen s (Generated s)
argument recur context path label found = recur context
  (childAt path label "args" found.index)
  found.expr

-- E5/E6's arguments (and E17's): `eq τ_{e_i} θ(T_i)` for `i ≤ min(k, n)`
-- (F1; B1 for E17); with `k > n`, `⟨p, res⟩` and `eq θ(R) (τ_{e_{n+1}}
-- → … → ⟨p, res⟩)` (B1).
applied
  ∷ ∀ s
  . Context s
  → Node
  → Made
  → Called s
  → Array (Generated s)
  → Gen s (Ruled s)
applied context node made found generated =
  if Array.length generated > count then
    overApplied <$> nodeRes node.path node.rule node.span
  else pure
    { ty: arrowOf (Array.drop (Array.length generated) found.parameters)
        found.result
    , node: fixed (made <$> found.slots <*> sequence (map _.expr generated))
    , emits: written []
    }
  where
  count = Array.length found.parameters
  rest = Array.drop count generated
  overApplied res =
    { ty: flex res
    , node: saturated node.span made <$> found.slots
        <*> sequence (map _.expr (Array.take count generated))
        <*> sequence (map _.expr rest)
    , emits: written
        [ body RowB 1
            (GenEqual found.result (arrowOf (map _.ty rest) (flex res)))
        ]
    }
  written more = do
    emit (at context node.path node.rule)
      (found.entries <> equations <> more <> found.markers)
    traverse_ _.emits generated
  equations = Array.zipWith equation generated found.parameters
  equation given declared = body node.row 1 (GenEqual given.ty declared)
  body group number atom = tagged (EmitB atom) group number Body node.span

-- `Apply (g θ a₁…aₙ) [aₙ₊₁…]` (Check/Call.purs `overApplied`), the
-- saturated node typed `τ_{e_{n+1}} → … → τ`, `τ` the node's own type.
saturated
  ∷ Span
  → Made
  → Instantiation
  → Array Checked.Expr
  → Array Checked.Expr
  → Ty Open
  → Checked.Node
saturated span made instantiation supplied more ty = Checked.Apply
  (Checked.Expr { ty: Array.foldr stage ty more, span, node })
  more
  where
  node = made instantiation supplied
  stage value rest = TFun (Checked.typeOf value) closedRow rest
