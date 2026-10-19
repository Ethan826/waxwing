module Features.Check.Because
  ( Because(..)
  , Pair
  , WrittenLack
  , Lack
  , prefer
  , preferLack
  , rank
  , plain
  ) where

import Prelude
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple)
import Domain.Syntax (Span)

-- Why a record tail lacks a label or two tails are disjoint (R005 Tranche
-- B design §1.3): a written `where r lacks { a }` (its variable and the
-- label's span), a written `where r disjoint s` (its variables and the
-- clause's span), a type of the signature that writes the two tails into
-- one record (`Joined`: its variables and the later tail's span), a label
-- beside the tail in a type, or a row the checker made, whose span the
-- checker does not keep (`Implied`), and a literal's items (`Spread`).
-- (Task 4's `Equated`, a fact the sum rule read from an equation, went
-- with the sum rule in B2.) An obligation that decomposes passes its
-- reason on, so a violation knows which text it breaks. The plan's
-- `Implied { span }` is split in two: an implied pair needs its variables
-- for D2's text and a span for its note, an implied lack has neither (its
-- violation keeps Tranche A's shape text).
data Because
  = Lacks WrittenLack
  | Disjoint Pair
  | Joined Pair
  | Implied
  | Spread { earlier ∷ Span, later ∷ Span }

-- A written lack: the clause's variable and the label's span.
type WrittenLack = { variable ∷ String, span ∷ Span }

type Pair = { variables ∷ Tuple String String, span ∷ Span }

derive instance eqBecause ∷ Eq Because
derive instance ordBecause ∷ Ord Because

-- A lacked label's reason and, for a lack decomposed from a pair when a
-- meta was bound, that meta: where the label arrived (D2's `first written
-- here`, the store's `arrivedAt`).
type Lack = { because ∷ Because, from ∷ Maybe Int }

-- User decision 5: a written `lacks`, then a written `disjoint`, then an
-- implied fact, then a spread fact; between two of one kind the earlier
-- in source order. The constructors are declared in that order and each
-- one's fields compare its span first, so the derived order is the
-- precedence and `prefer` its minimum: commutative and associative, so
-- the reason kept never depends on the order facts arrive in. (Implied
-- pairs rank before implied lacks; neither has a source position to
-- compare with the other.)
prefer ∷ Because → Because → Because
prefer = min

-- The same for lacks; between two of one reason, the smaller meta.
preferLack ∷ Lack → Lack → Lack
preferLack = min

-- The kind's place in the precedence, 0 first.
rank ∷ Because → Int
rank = case _ of
  Lacks _ → 0
  Disjoint _ → 1
  Joined _ → 2
  Implied → 2
  Spread _ → 3

-- A lack no clause or pair explains.
plain ∷ Lack
plain = { because: Implied, from: Nothing }
