-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.3, E24-E28: record literals, extension, selection, update and
-- removal. Each operand is equated with a record of fresh variables of
-- this node (§4), whatever its solved shape; per-label entries and
-- variables carry the label's span (§6; docs/findings.md "RT1's
-- translator", reading 14). Children: `RecordLiteral/fields/i/value`,
-- `RecordExtension/items/i/Given/value` (or `…/Spreading/value`),
-- `FieldAccess/record`; E27 and E28 are Generate.Update. Checked nodes
-- as today's (Check/Record.purs, Extension.purs; D1 spec §3.5, R0 Task
-- 7.1b).
module Features.Check.Generate.Record
  ( extension
  , fieldAccess
  , literal
  , shape
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..))
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..), Role(..), VarSort(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (Expr, FieldValue, LiteralItem(..))
import Domain.Syntax (FieldName, Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Elab (Ref(..))
import Features.Check.Generate.Fresh
  ( auxiliary
  , child
  , childAt
  , childOf
  , nodeRes
  )
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , Tagged
  , emit
  , fresh
  )
import Features.Check.Generate.Node
  ( Ruled
  , fixed
  , flex
  , recordOf
  , tagged
  )

-- E24: `{ l̄: τ̄ }`, no entry (labels are distinct, so it is defined).
literal
  ∷ ∀ s. Recur s → Context s → Path → Array FieldValue → Gen s (Ruled s)
literal recur context path fields = built <$> sequence
  (Array.mapWithIndex value fields)
  where
  built generated =
    { ty: recordOf (Array.zip (map _.name fields) (map _.ty generated)) []
    , node: fixed
        ( Checked.RecordLiteral <$> traverse field
            (Array.zip fields generated)
        )
    , emits: traverse_ _.emits generated
    }
  value index found = recur context
    (child (childAt path "RecordLiteral" "fields" index) [ Named "value" ])
    found.value
  field (Tuple found generated) = { label: found.name, value: _ }
    <$> generated.expr

-- E25: per spread `j` (from 1), `eq τ_{s_j} { ...⟨p, spread j⟩ }`, then
-- `eq ⟨p, res⟩ { l̄: τ̄, ...⟨p, spread 1⟩ … }` (B2). Several spreads are
-- in the model with no marker (S1 reads their roles).
extension
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Array LiteralItem
  → Gen s (Ruled s)
extension recur context path span items = do
  generated ← sequence (Array.mapWithIndex item items)
  let pairs = Array.zip items generated
  spreads ← traverse spreadVar
    (Array.mapWithIndex Tuple (Array.mapMaybe spreading pairs))
  res ← flex <$> nodeRes path (ExprRule 25) span
  pure
    { ty: res
    , node: fixed (Checked.RecordExtension <$> traverse checkedItem pairs)
    , emits: do
        emit (at context path (ExprRule 25))
          ( map spreadAtom spreads
              <>
                [ shape RowB 2 span
                    ( GenEqual res
                        ( recordOf (Array.mapMaybe given pairs)
                            (map tailOf spreads)
                        )
                    )
                ]
          )
        traverse_ _.emits generated
    }
  where
  item index = case _ of
    Given found → recur context (itemPath index "Given") found.value
    Spreading _ value → recur context (itemPath index "Spreading") value
  itemPath index form = child (childAt path "RecordExtension" "items" index)
    [ Named form, Named "value" ]
  given (Tuple found result) = case found of
    Given field → Just (Tuple field.name result.ty)
    Spreading _ _ → Nothing
  spreading (Tuple found result) = case found of
    Given _ → Nothing
    Spreading itemSpan _ → Just { span: itemSpan, ty: result.ty }
  spreadVar (Tuple index found) = { found, handle: _ }
    <$> auxiliary path (ExprRule 25) (Spread (index + 1)) SortRow found.span
  tailOf spread = FlexRef spread.handle
  spreadAtom spread = shape RowB 2 spread.found.span
    (GenEqual spread.found.ty (recordOf [] [ tailOf spread ]))
  checkedItem (Tuple found result) = case found of
    Given field → Checked.Given <<< { label: field.name, value: _ }
      <$> result.expr
    Spreading _ _ → Checked.Spreading <$> result.expr

-- E26: `eq τ_e { l: ⟨p, field l⟩, ...⟨p, rest⟩ }` (B4); the field is
-- positioned at the node, the rest an auxiliary.
fieldAccess
  ∷ ∀ s
  . Recur s
  → Context s
  → Path
  → Span
  → Expr
  → FieldName
  → Gen s (Ruled s)
fieldAccess recur context path span value label = do
  operand ← recur context (childOf path "FieldAccess" "record") value
  field ← fresh
    { path
    , role: Field label.name
    , rule: ExprRule 26
    , span: label.span
    , sort: SortType
    , position: NodeType path
    }
  rest ← auxiliary path (ExprRule 26) Rest SortRow span
  pure
    { ty: flex field
    , node: fixed (Checked.FieldAccess <@> label.name <$> operand.expr)
    , emits: do
        emit (at context path (ExprRule 26))
          [ shape RowB 4 label.span
              ( GenEqual operand.ty
                  (recordOf [ Tuple label.name (flex field) ] [ FlexRef rest ])
              )
          ]
        operand.emits
    }

-- A record-shape atom (origin body) at a span.
shape ∷ ∀ s. RowGroup → Int → Span → GenAtom s → Tagged s
shape group number span atom = tagged (EmitB atom) group number Body span
