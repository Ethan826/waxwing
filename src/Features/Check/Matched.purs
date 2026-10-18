module Features.Check.Matched (Typed, Matched, PatternEnv, Against) where

import Data.Either (Either)
import Data.Map (Map)
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Resolved (CtorInfo, EffectInfo, LocalId, Ty, TypeInfo)
import Domain.Resolved as Resolved
import Domain.Syntax (Diagnostic, Span)
import Features.Check.Scheme (State, Threaded)

-- A pattern binder and its type.
type Typed = { id ∷ LocalId, ty ∷ Ty Open }

-- A checked pattern and the binders it brings into its arm.
type Matched = { pattern ∷ Checked.Pattern, locals ∷ Array Typed }

type PatternEnv r =
  { effects ∷ Array EffectInfo
  , types ∷ Array TypeInfo
  , ctors ∷ Array CtorInfo
  , variables ∷ Array String
  , introduced ∷ Map String Span
  | r
  }

-- Features.Check.Match's `patternAgainst`, passed to the modules it
-- imports (none may import Match, which imports them).
type Against r =
  PatternEnv r
  → State
  → Ty Open
  → Resolved.Pattern
  → Either Diagnostic (Threaded Matched)
