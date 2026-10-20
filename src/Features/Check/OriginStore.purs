module Features.Check.OriginStore (originsOf, onOrigins) where

import Features.Check.PartOrigin (PartOrigin)
import Features.Check.Subst (Subst(..))

-- The substitution's part metadata (Features.Check.PartOrigin), read by
-- the renderers and written where rows are made; apart from
-- Features.Check.Subst, whose file has no room.
originsOf ∷ Subst → PartOrigin
originsOf (Subst bindings) = bindings.origins

onOrigins ∷ (PartOrigin → PartOrigin) → Subst → Subst
onOrigins change (Subst bindings) = Subst bindings
  { origins = change bindings.origins }
