module Features.Check.Atom (Atom(..)) where

import Prelude
import Features.Check.Flex (Flex)

-- A constant without its field type: what a row may hold that a meta can
-- be asked to hold, a label or a signature's rigid tail (an opaque row,
-- held whole or not at all). R005 Tranche B design §2.5; read by the
-- exclusion test (Features.Check.Homes) and named by H's refusal.
data Atom = LabelAtom String | RigidAtom Flex

derive instance eqAtom ∷ Eq Atom
derive instance ordAtom ∷ Ord Atom
