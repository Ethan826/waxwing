module Features.Check.UseOrigin (Using, lacksStated) where

import Prelude
import Data.Array as Array
import Domain.Resolved (Requirement(..), VarId(..))
import Domain.Syntax (Span)
import Features.Check.DeclarationUse (Use)
import Features.Check.OriginStore (onOrigins)
import Features.Check.PartOrigin (OwnerKind, Seeded, seededAt)
import Features.Check.Scheme (Threaded)

-- Where a declaration is used and how (R005 Tranche B diagnostics R9):
-- the use's span, each supplied argument's (T6), and its kind.
type Using = { span ∷ Span, arguments ∷ Array Span, kind ∷ OwnerKind }

-- The written lacks a function's use states, each on its instantiated
-- meta, recorded with the use's span (diagnostic metadata for H's
-- location, T4: the use whose seeding stated a fact).
lacksStated ∷ Span → Array Requirement → Threaded Use → Threaded Use
lacksStated span constraints use = use
  { state = use.state
      { subst = onOrigins (seededAt seeded) use.state.subst }
  }
  where
  seeded = Array.concatMap (stated span use.value.scheme.base) constraints

stated ∷ Span → Int → Requirement → Array Seeded
stated span base = case _ of
  Lacks written → map (entry written.variable) written.labels
  Disjoint _ → []
  where
  entry (VarId index) label =
    { use: span, meta: base + index, label: label.span }
