-- T-R0b §3.4: a pattern matched against the scrutinee's type `τ_s`,
-- giving the extended environment `Γ'`. Each pattern contributes its own
-- equation against `τ_s` (P3-P7), closed or open by its syntax alone; no
-- growth rule and no `Outside PatternGrowth` (B13, kept proposed). A
-- sub-pattern is at `Ctor/args/k` or `Record/fields/k/pattern`.
module Features.Check.Generate.Pattern (Bound, pattern) where

import Prelude
import Data.Array (foldM)
import Data.Array as Array
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Atom(..)
  , Base(..)
  , CheckedName(..)
  , RTExpr(Base, TVar)
  , Role(..)
  , VarSort(..)
  )
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (CtorId, FieldPattern, Pattern(..), Rest(..))
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, at, bindLocal)
import Features.Check.Generate.Fault (Gen)
import Features.Check.Generate.Fresh
  ( child
  , childAt
  , fresh
  , instNaming
  , instVars
  )
import Features.Check.Generate.Lookup (ctorShape)
import Features.Check.Generate.Out
  ( Out
  , Item(..)
  , concatOut
  , noOut
  , emit
  , listed
  , markersAt
  , typeAt
  , varsOut
  )
import Features.Check.Generate.Translate (record, translate, translateAll)

-- The environment after the pattern, and what it contributed.
type Bound = { context ∷ Context, out ∷ Out }

pattern ∷ Context → Path → RTExpr → Pattern → Gen Bound
pattern context path scrutinee found = withType <$> rule found
  where
  withType bound = bound
    { out = concatOut [ typeAt path scrutinee, bound.out ] }
  -- P1 binds nothing; P2 binds `x ↦ τ_s`.
  rule = case _ of
    Wildcard _ → pure { context, out: noOut }
    Bind _ local → pure
      { context: bindLocal local scrutinee context, out: noOut }
    IntLit span _ → pure (literal context path span scrutinee IntBase)
    BoolLit span _ → pure (literal context path span scrutinee BoolBase)
    Ctor span ctor parts → ctorPattern context path span scrutinee ctor
      parts
    Record span fields rest → recordPattern context path span scrutinee
      fields
      rest

-- P3: `eq τ_s Int` / `eq τ_s Bool`.
literal ∷ Context → Path → Span → RTExpr → Base → Bound
literal context path span scrutinee base =
  { context
  , out: emit (at context path (PatternRule 3))
      [ listed (ToB (Equal scrutinee (Base base))) RowB 1 Body span ]
  }

-- P4: `eq τ_s θ(owner(args))` (B1), sub-pattern `k` against
-- `θ(⟦field_k⟧)`; markers of the owner, then the fields (origin inst).
ctorPattern
  ∷ Context → Path → Span → RTExpr → CtorId → Array Pattern → Gen Bound
ctorPattern context path span scrutinee ctor parts = do
  shape ← ctorShape context.tables ctor
  owner ← translate context.tables naming shape.owner
  fields ← translateAll context.tables naming shape.fields
  inner ← subPatterns context
    (Array.mapWithIndex sub (Array.zip parts fields.tys))
  pure
    { context: inner.context
    , out: concatOut
        [ varsOut (instVars path (PatternRule 4) span shape.sorts)
        , emit (at context path (PatternRule 4))
            ( [ listed (ToB (Equal scrutinee owner.ty)) RowB 1 Body span ]
                <> markersAt InstOrigin span (owner.marks <> fields.marks)
            )
        , inner.out
        ]
    }
  where
  naming = instNaming path
  sub index (Tuple part ty) =
    { path: childAt path "Ctor" "args" index, ty, pattern: part }

-- P5 (no rest, B12), P6 (`...`, B11), P7 (`...x`, B10, B9): `eq τ_s
-- { l̄: ⟨p, field l⟩ (, ...⟨p, rest⟩) }`; sub-pattern `l` against
-- `⟨p, field l⟩`, positioned at the sub-pattern; P7 binds `x` to
-- `{ ...⟨p, rest⟩ }`, its rest at `RestType p`, P6's an auxiliary.
recordPattern
  ∷ Context → Path → Span → RTExpr → Array FieldPattern → Rest → Gen Bound
recordPattern context path span scrutinee fields rest = bound
  <$> subPatterns context (map subOf fieldVars)
  where
  bound inner =
    { context: named rest inner.context
    , out: concatOut
        [ varsOut (map fst fieldVars <> restVars)
        , emit (at context path (PatternRule shape.rule))
            [ listed (ToB (Equal scrutinee written)) RowB shape.row Body
                span
            ]
        , inner.out
        ]
    }
  shape = restShape path rest
  fieldVars = Array.mapWithIndex fieldVar fields
  fieldVar index field = Tuple
    ( fresh
        { path
        , role: Field field.label
        , rule: PatternRule shape.rule
        , span: field.span
        , sort: SortType
        , position: PatternType (subPath index)
        }
    )
    { path: subPath index, pattern: field.pattern, label: field.label }
  subPath index = child (childAt path "Record" "fields" index)
    [ Named "pattern" ]
  restVar position = fresh
    { path
    , role: Rest
    , rule: PatternRule shape.rule
    , span
    , sort: SortRow
    , position
    }
  restVars = map restVar shape.rest
  tails = map fst restVars
  written = record (map labelled fieldVars) tails
  labelled (Tuple var field) = Tuple field.label (TVar (fst var))
  subOf (Tuple var field) =
    { path: field.path, ty: TVar (fst var), pattern: field.pattern }
  named = case _ of
    NamedRest local → bindLocal local (record [] tails)
    NoRest → identity
    IgnoredRest → identity

-- Each rest form's rule, spec row and rest variable's position.
restShape
  ∷ Path → Rest → { rule ∷ Int, row ∷ Int, rest ∷ Array CheckedName }
restShape path = case _ of
  NoRest → { rule: 5, row: 12, rest: [] }
  IgnoredRest → { rule: 6, row: 11, rest: [ Auxiliary ] }
  NamedRest _ → { rule: 7, row: 10, rest: [ RestType path ] }

-- Sub-patterns in order, each extending the environment the one before
-- left (binders are distinct: Resolve's `DuplicateBinder`).
subPatterns
  ∷ Context
  → Array { path ∷ Path, ty ∷ RTExpr, pattern ∷ Pattern }
  → Gen Bound
subPatterns context parts = finish
  <$> foldM step { context, outs: [] } parts
  where
  step done part = add done <$> pattern done.context part.path part.ty
    part.pattern
  add done bound =
    { context: bound.context, outs: Array.snoc done.outs bound.out }
  finish done = { context: done.context, out: concatOut done.outs }
