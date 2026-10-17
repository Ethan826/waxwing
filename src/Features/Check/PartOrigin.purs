module Features.Check.PartOrigin (PartOrigin, noOrigins) where

-- Diagnostic metadata about the parts of record rows (R005 Tranche B plan,
-- Architecture): where each part was made, the lambda parameter or the
-- instantiated type it came from and the variable that owns it. Written
-- by the checker where rows are made and read only by the renderers of
-- Task 6; no solver module reads it. Held by the substitution, so it
-- reverts with it. Empty until Task 6 writes it.
newtype PartOrigin = PartOrigin {}

noOrigins ∷ PartOrigin
noOrigins = PartOrigin {}
