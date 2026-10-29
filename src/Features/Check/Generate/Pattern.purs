-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.4: a pattern matched against the scrutinee's type `τ_s`,
-- giving the extended environment `Γ'`. Each pattern contributes its own
-- equation against `τ_s` (P3-P7), closed or open by its syntax alone; no
-- growth rule and no `Outside PatternGrowth` (B13, kept proposed). A
-- sub-pattern is at `Ctor/args/k` or `Record/fields/k/pattern`. The
-- checked pattern (D1 spec §3.3; R0 Task 7.1b) carries `τ_s` read at
-- `PatternType p`, as today's carries the type it was checked against
-- (Check/Match.purs, RestBinder.purs); a constructor pattern holds no
-- instantiation, so P4's `⟨p, inst i⟩` is read only where a field's type
-- mentions it (spec §12.2). Its marked type, the scrutinee's, joins
-- `effects.nodes` at p (amin tranche 1, Task 3).
module Features.Check.Generate.Pattern (Bound, pattern) where

import Prelude
import Data.Array (foldM)
import Data.Array as Array
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom
  ( Base(..)
  , CheckedName(..)
  , Role(..)
  , VarSort(..)
  )
import Domain.Recorded.Effect (MTy(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (CtorId, FieldPattern, Pattern(..), Rest(..))
import Domain.Row (closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..))
import Features.Check.Generate.Callee (atUse, recordInstance)
import Features.Check.Generate.Context (Context, Local, at, bindLocal)
import Features.Check.Generate.Elab (Elab, Ref(..))
import Features.Check.Generate.Fresh (child, childAt, instances)
import Features.Check.Generate.Gen
  ( Gen
  , emit
  , fresh
  , effected
  , lifted
  , positioned
  )
import Features.Check.Generate.Lookup (ctorShape)
import Features.Check.Generate.Node
  ( flex
  , markedFlex
  , markedRecord
  , markersAt
  , none
  , recordOf
  )
import Features.Check.Generate.Obligation (agreeEqual, equalTagged)
import Features.Check.Generate.Out (EffectItem(..))
import Features.Check.Generate.PatternLeaf
  ( Shaped
  , literal
  , restShape
  , spanOf
  )
import Features.Check.Generate.Translate (translate, translateAll)

-- The environment after the pattern, its checked form and its entries.
type Bound s =
  { context ∷ Context s, pattern ∷ Elab s Checked.Pattern, emits ∷ Gen s Unit }

pattern ∷ ∀ s. Context s → Path → Local s → Pattern → Gen s (Bound s)
pattern context path typed found = do
  read ← positioned (PatternType path) scrutinee
  effected [ NodeAt path typed.marked ]
  shaped ← rule found
  pure
    { context: shaped.context
    , pattern: checked <$> read <*> shaped.shape
    , emits: shaped.emits
    }
  where
  scrutinee = typed.ty
  checked ty shape = Checked.Pattern { ty, span: spanOf found, shape }
  leaf shape = pure { context, shape: pure shape, emits: none }
  -- P1 binds nothing; P2 binds `x ↦ τ_s`.
  rule = case _ of
    Wildcard _ → leaf Checked.Wildcard
    Bind _ local → pure
      { context: bindLocal local typed context
      , shape: pure (Checked.Bind local)
      , emits: none
      }
    IntLit span value → pure
      ( literal context path span typed TInt (MBase IntBase)
          (Checked.IntLit value)
      )
    BoolLit span value → pure
      ( literal context path span typed TBool (MBase BoolBase)
          (Checked.BoolLit value)
      )
    Ctor span ctor parts → ctorPattern context path span typed ctor parts
    Record span fields rest → recordPattern context path span typed fields
      rest

-- P4: `eq τ_s θ(owner(args))` (B1), sub-pattern `k` against
-- `θ(⟦field_k⟧)`; markers of the owner, then the fields (origin inst).
ctorPattern
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → Local s
  → CtorId
  → Array Pattern
  → Gen s (Shaped s)
ctorPattern context path span typed ctor parts = do
  shape ← lifted (ctorShape context.tables ctor)
  inst ← instances path (PatternRule 4) span shape.sorts
  owner ← lifted (translate context.tables inst.naming shape.owner)
  fields ← lifted (translateAll context.tables inst.naming shape.fields)
  markedTypes ← lifted
    (atUse context path shape.fields closedRow shape.owner)
  -- A constructor pattern is a use of the constructor's signature, so
  -- it records that instance (controller ruling, Task 4 fix 1).
  recordInstance path markedTypes
  inner ← subPatterns context
    ( Array.mapWithIndex sub
        (Array.zip parts (Array.zip fields.tys markedTypes.parameters))
    )
  pure
    { context: inner.context
    , shape: Checked.Ctor ctor <$> sequence inner.patterns
    , emits: do
        emit (at context path (PatternRule 4))
          ( [ agreeEqual span typed.ty owner.ty typed.marked
                markedTypes.result
            ]
              <> markersAt InstOrigin span (owner.marks <> fields.marks)
          )
        inner.emits
    }
  where
  sub index (Tuple part (Tuple ty markedType)) =
    { path: childAt path "Ctor" "args" index
    , typed: { ty, marked: markedType }
    , pattern: part
    }

-- P5 (no rest, B12), P6 (`...`, B11), P7 (`...x`, B10, B9): `eq τ_s
-- { l̄: ⟨p, field l⟩ (, ...⟨p, rest⟩) }`; sub-pattern `l` against
-- `⟨p, field l⟩`, positioned at the sub-pattern; P7 binds `x` to
-- `{ ...⟨p, rest⟩ }`, its rest at `RestType p`, P6's an auxiliary.
recordPattern
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → Local s
  → Array FieldPattern
  → Rest
  → Gen s (Shaped s)
recordPattern context path span typed fields rest = do
  minted ← traverse fieldVar (Array.mapWithIndex Tuple fields)
  rests ← traverse restVar shape.rest
  inner ← subPatterns context (map subOf minted)
  restRead ← restOf (map FlexRef rests)
  pure
    { context: named (map FlexRef rests) inner.context
    , shape: Checked.Record
        <$> sequence (Array.zipWith labelled minted inner.patterns)
        <*> restRead
    , emits: do
        emit (at context path (PatternRule shape.rule))
          [ equalTagged RowB shape.row Body span typed.ty
              (written minted rests)
              typed.marked
              (markedWritten minted rests)
          ]
        inner.emits
    }
  where
  shape = restShape path rest
  fieldVar (Tuple index field) = { field, path: subPath index, handle: _ }
    <$> fresh
      { path
      , role: Field field.label
      , rule: PatternRule shape.rule
      , span: field.span
      , sort: SortType
      , position: PatternType (subPath index)
      }
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
  written minted rests = recordOf (map fieldType minted) (map FlexRef rests)
  markedWritten minted rests = markedRecord (map markedField minted)
    (map FlexRef rests)
  markedField found = Tuple found.field.label (markedFlex found.handle)
  fieldType found = Tuple found.field.label (flex found.handle)
  subOf found =
    { path: found.path
    , typed: { ty: flex found.handle, marked: markedFlex found.handle }
    , pattern: found.field.pattern
    }
  labelled found read = { label: found.field.label, pattern: _ } <$> read
  restOf tails = case rest of
    NamedRest local → map (Checked.NamedRest local)
      <$> positioned (RestType path) (recordOf [] tails)
    NoRest → pure (pure Checked.NoRest)
    IgnoredRest → pure (pure Checked.IgnoredRest)
  named tails = case rest of
    NamedRest local → bindLocal local
      { ty: recordOf [] tails, marked: markedRecord [] tails }
    NoRest → identity
    IgnoredRest → identity

type Part s = { path ∷ Path, typed ∷ Local s, pattern ∷ Pattern }

type Gathered s =
  { context ∷ Context s
  , patterns ∷ Array (Elab s Checked.Pattern)
  , emits ∷ Gen s Unit
  }

-- Sub-patterns in order, each extending the environment the one before
-- left (binders are distinct: Resolve's `DuplicateBinder`).
subPatterns ∷ ∀ s. Context s → Array (Part s) → Gen s (Gathered s)
subPatterns context = foldM step { context, patterns: [], emits: none }
  where
  step done part = add done <$> pattern done.context part.path part.typed
    part.pattern
  add done bound =
    { context: bound.context
    , patterns: Array.snoc done.patterns bound.pattern
    , emits: done.emits *> bound.emits
    }
