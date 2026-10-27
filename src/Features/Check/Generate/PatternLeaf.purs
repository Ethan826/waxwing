-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.4's leaves of the pattern rules (split from Generate.Pattern,
-- amin tranche 1 Task 3, for the line budget): what a shape gives, P3's
-- literal against `τ_s`, each rest form's rule, spec row and rest
-- position, and a pattern's span.
module Features.Check.Generate.PatternLeaf
  ( Shaped
  , literal
  , restShape
  , spanOf
  ) where

import Prelude
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (CheckedName(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path
  , RowGroup(..)
  , RuleId(..)
  )
import Domain.Resolved (Pattern(..), Rest(..))
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, at)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Gen (Gen, GenAtom(..), GenEntry(..), emit)
import Features.Check.Generate.Node (tagged)

type Shaped s =
  { context ∷ Context s, shape ∷ Elab s Checked.Shape, emits ∷ Gen s Unit }

-- P3: `eq τ_s Int` / `eq τ_s Bool`.
literal
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → GenTy s
  → GenTy s
  → Checked.Shape
  → Shaped s
literal context path span scrutinee base shape =
  { context
  , shape: pure shape
  , emits: emit (at context path (PatternRule 3))
      [ tagged (EmitB (GenEqual scrutinee base)) RowB 1 Body span ]
  }

-- Each rest form's rule, spec row and rest variable's position.
restShape
  ∷ Path → Rest → { rule ∷ Int, row ∷ Int, rest ∷ Array CheckedName }
restShape path = case _ of
  NoRest → { rule: 5, row: 12, rest: [] }
  IgnoredRest → { rule: 6, row: 11, rest: [ Auxiliary ] }
  NamedRest _ → { rule: 7, row: 10, rest: [ RestType path ] }

spanOf ∷ Pattern → Span
spanOf = case _ of
  Wildcard span → span
  Bind span _ → span
  IntLit span _ → span
  BoolLit span _ → span
  Ctor span _ _ → span
  Record span _ _ → span
