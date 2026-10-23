-- T-R0b §3.3, E24-E28: record literals, extension, selection, update and
-- removal. Each operand is equated with a record of fresh variables of
-- this node (§4), whatever its solved shape; per-label entries and
-- variables carry the label's span (§6; docs/findings.md "RT1's
-- translator", reading 14). Children: `RecordLiteral/fields/i/value`,
-- `RecordExtension/items/i/Given/value` (or `…/Spreading/value`),
-- `FieldAccess/record`, `RecordUpdate/record`,
-- `RecordUpdate/fields/i/value`, `RecordRemoval/record`.
module Features.Check.Generate.Record
  ( extension
  , fieldAccess
  , literal
  , removal
  , update
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Atom(..)
  , CheckedName(..)
  , RTExpr(..)
  , Role(..)
  , Var
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (Expr, FieldValue, LiteralItem(..))
import Domain.Syntax (FieldName, Label, Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fresh
  ( auxiliary
  , child
  , childAt
  , childOf
  , fresh
  , nodeRes
  )
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , Listed
  , concatOut
  , emit
  , listed
  , varsOut
  )
import Features.Check.Generate.Translate (record)

-- E24: `{ l̄: τ̄ }`, no entry (labels are distinct, so it is defined).
literal ∷ Recur → Context → Path → Array FieldValue → Generated
literal recur context path fields =
  { ty: record (Array.zip (map _.name fields) (map _.ty generated)) []
  , out: concatOut (map _.out generated)
  }
  where
  generated = Array.mapWithIndex value fields
  value index field = recur context
    (child (childAt path "RecordLiteral" "fields" index) [ Named "value" ])
    field.value

-- E25: per spread `j` (from 1), `eq τ_{s_j} { ...⟨p, spread j⟩ }`, then
-- `eq ⟨p, res⟩ { l̄: τ̄, ...⟨p, spread 1⟩ … }` (B2). Several spreads are
-- in the model with no marker (S1 reads their roles).
extension ∷ Recur → Context → Path → Span → Array LiteralItem → Generated
extension recur context path span items =
  { ty: res
  , out: concatOut
      ( [ varsOut (Array.snoc (map _.var spreads) resVar)
        , emit (at context path (ExprRule 25))
            ( map spreadAtom spreads
                <> [ shape RowB 2 span (Equal res (record given tails)) ]
            )
        ]
          <> map _.out generated
      )
  }
  where
  generated = Array.mapWithIndex item items
  item index = case _ of
    Given field → recur context (itemPath index "Given") field.value
    Spreading _ value → recur context (itemPath index "Spreading") value
  itemPath index form = child (childAt path "RecordExtension" "items" index)
    [ Named form, Named "value" ]
  pairs = Array.zip items generated
  given = Array.mapMaybe givenField pairs
  givenField (Tuple found result) = case found of
    Given field → Just (Tuple field.name result.ty)
    Spreading _ _ → Nothing
  spreads = Array.mapWithIndex spreadVar (Array.mapMaybe spreading pairs)
  spreading (Tuple found result) = case found of
    Given _ → Nothing
    Spreading itemSpan _ → Just { span: itemSpan, ty: result.ty }
  spreadVar index found =
    { var: auxiliary path (ExprRule 25) (Spread (index + 1)) SortRow
        found.span
    , found
    }
  tails = map (fst <<< _.var) spreads
  spreadAtom spread = shape RowB 2 spread.found.span
    (Equal spread.found.ty (record [] [ fst spread.var ]))
  resVar = nodeRes path (ExprRule 25) span
  res = TVar (fst resVar)

-- E26: `eq τ_e { l: ⟨p, field l⟩, ...⟨p, rest⟩ }` (B4); the field is
-- positioned at the node, the rest an auxiliary.
fieldAccess ∷ Recur → Context → Path → Span → Expr → FieldName → Generated
fieldAccess recur context path span value label =
  { ty: TVar (fst field)
  , out: concatOut
      [ varsOut [ field, rest ]
      , emit (at context path (ExprRule 26))
          [ shape RowB 4 label.span (Equal operand.ty selected) ]
      , operand.out
      ]
  }
  where
  operand = recur context (childOf path "FieldAccess" "record") value
  field = fresh
    { path
    , role: Field label.name
    , rule: ExprRule 26
    , span: label.span
    , sort: SortType
    , position: NodeType path
    }
  rest = auxiliary path (ExprRule 26) Rest SortRow span
  selected = record [ Tuple label.name (TVar (fst field)) ] [ fst rest ]

-- E27: per field, `eq τ_e { l: ⟨p, upd l⟩, ...⟨p, updrest l⟩ }` and
-- `eq τ_{e_l} ⟨p, upd l⟩` (B7); the result is `τ_e`.
update ∷ Recur → Context → Path → Expr → Array FieldValue → Generated
update recur context path value fields =
  { ty: operand.ty
  , out: concatOut
      ( [ varsOut (Array.concatMap _.vars updated)
        , emit (at context path (ExprRule 27))
            (Array.concatMap _.entries updated)
        , operand.out
        ]
          <> map _.out generated
      )
  }
  where
  operand = recur context (childOf path "RecordUpdate" "record") value
  generated = Array.mapWithIndex given fields
  given index field = recur context
    (child (childAt path "RecordUpdate" "fields" index) [ Named "value" ])
    field.value
  updated = Array.zipWith updateOf fields generated
  updateOf field result = fieldUpdate path operand.ty field result.ty

fieldUpdate
  ∷ Path
  → RTExpr
  → FieldValue
  → RTExpr
  → { vars ∷ Array (Tuple Var VarInfo), entries ∷ Array Listed }
fieldUpdate path operand field given =
  { vars: [ upd, rest ]
  , entries:
      [ shape RowB 7 field.span (Equal operand updated)
      , shape RowB 7 field.span (Equal given (TVar (fst upd)))
      ]
  }
  where
  upd = auxiliary path (ExprRule 27) (Upd field.name) SortType field.span
  rest = auxiliary path (ExprRule 27) (UpdRest field.name) SortRow
    field.span
  updated = record [ Tuple field.name (TVar (fst upd)) ] [ fst rest ]

-- E28: `eq τ_e { l̄: ⟨p, field l⟩, ...⟨p, rest⟩ }` (B8); the result is
-- `{ ...⟨p, rest⟩ }`. Every variable is an auxiliary.
removal ∷ Recur → Context → Path → Span → Expr → Array Label → Generated
removal recur context path span value labels =
  { ty: record [] [ fst rest ]
  , out: concatOut
      [ varsOut (Array.snoc (map fieldVar labels) rest)
      , emit (at context path (ExprRule 28))
          [ shape RowB 8 span
              (Equal operand.ty (record (map removed labels) [ fst rest ]))
          ]
      , operand.out
      ]
  }
  where
  operand = recur context (childOf path "RecordRemoval" "record") value
  fieldVar label = auxiliary path (ExprRule 28) (Field label.name) SortType
    label.span
  removed label = Tuple label.name (TVar (fst (fieldVar label)))
  rest = auxiliary path (ExprRule 28) Rest SortRow span

-- A record-shape atom (origin body) at a span.
shape ∷ RowGroup → Int → Span → Atom → Listed
shape group number span atom = listed (ToB atom) group number Body span
