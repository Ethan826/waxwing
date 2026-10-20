module Features.Check.PartOrigin
  ( PartOrigin
  , Occurrence
  , Owner
  , OwnerKind(..)
  , Step(..)
  , Parameter
  , Seeded
  , noOrigins
  , madeOccurrence
  , occurrencesFrom
  , owned
  , occurrenceOf
  , occurrenceKey
  , requiredAt
  , requiredOf
  , parameterMade
  , parametersOf
  , seededAt
  , seededOf
  ) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe, maybe)
import Data.Tuple (Tuple(..))
import Domain.Syntax (Span, TypeRef)
import Domain.Type (Ty)
import Domain.Type.Record (RecordRow)
import Features.Check.Flex (Flex)

-- Diagnostic metadata about the parts of record rows (R005 Tranche B plan
-- §2.10, diagnostics R1-R11; decision 5 of 2026-10-17: kept apart from
-- every satisfiability decision). Written where rows and predicates are
-- made (Desugar, RowMerge.Use, Lambda, an argument's check) and read only
-- by the renderers; no solving module imports it (a structural test).
-- Held by the substitution, so it reverts with it.
-- `occurrences`: each written row of two or more unknown tails, keyed by
-- its first predicate's identity; `predicates`: each predicate's
-- occurrence; `required`: for a meta, the written record type that first
-- supplied it a constant at an argument (R8's `is required here`);
-- `parameters`: unannotated lambda parameters; `seeded`: the written
-- lacks a use stated, for H's location (T4).
newtype PartOrigin = PartOrigin
  { occurrences ∷ Map Int Occurrence
  , predicates ∷ Map Int Int
  , required ∷ Map Int Span
  , parameters ∷ Array Parameter
  , seeded ∷ Array Seeded
  }

-- One written row desugared (plan §2.1): its predicates' location (T6),
-- where it sits in the type it was written in (`steps`, from that type's
-- root), its unknown tails in tail order (`parts`), the fresh tail that
-- replaced them (`result`), the row it became (`row`: the written fields
-- and rigid tails with `result`) and, when a declaration's use made it,
-- its owner.
type Occurrence =
  { site ∷ Maybe Span
  , steps ∷ Array Step
  , parts ∷ Array Int
  , result ∷ Flex
  , row ∷ RecordRow (Ty Flex) Flex
  , owner ∷ Maybe Owner
  }

-- R1's owner: the callee or constructor, how it was used (R9), the
-- variable each of its instantiated metas stands for, and the record type
-- as its declaration writes it (R5, R8's `written here`).
type Owner =
  { name ∷ String
  , kind ∷ OwnerKind
  , names ∷ Map Int String
  , written ∷ Maybe TypeRef
  }

-- A function value passed on, a partial application, a direct call, or a
-- constructor's use.
data OwnerKind = Reference | PartlyApplied | Call | Construction

derive instance eqOwnerKind ∷ Eq OwnerKind

-- A step from a type's root to a row: a record's field, an arrow's
-- parameter or result, anything else (an applied type's argument, an
-- effect label's).
data Step = Field String | Parameter | Result | Other

derive instance eqStep ∷ Eq Step

-- An unannotated lambda parameter: its type's meta and its lambda (R9's
-- `annotate this lambda's parameters`). R1's parameter names arrive with
-- the merge literal (Task 7), which alone can name them.
type Parameter = { meta ∷ Int, lambda ∷ Span }

-- A written `lacks` a use stated on one of its metas: the use's span, the
-- meta, and the label's span (Because's `Lacks` reason).
type Seeded = { use ∷ Span, meta ∷ Int, label ∷ Span }

noOrigins ∷ PartOrigin
noOrigins = PartOrigin
  { occurrences: Map.empty
  , predicates: Map.empty
  , required: Map.empty
  , parameters: []
  , seeded: []
  }

-- An occurrence whose predicates have the identities `ids`, the first of
-- which keys it.
madeOccurrence ∷ Array Int → Occurrence → PartOrigin → PartOrigin
madeOccurrence ids found (PartOrigin origins) =
  maybe (PartOrigin origins) keyed (Array.head ids)
  where
  keyed first = PartOrigin origins
    { occurrences = Map.insert first found origins.occurrences
    , predicates = foldl (byFirst first) origins.predicates ids
    }
  byFirst first table id = Map.insert id first table

-- The occurrences keyed from identity `first` on, in order.
occurrencesFrom ∷ Int → PartOrigin → Array (Tuple Int Occurrence)
occurrencesFrom first (PartOrigin origins) = Array.filter later
  (Map.toUnfoldable origins.occurrences)
  where
  later (Tuple key _) = key >= first

-- The occurrence keyed `key`, its owner given.
owned ∷ Int → Owner → PartOrigin → PartOrigin
owned key owner (PartOrigin origins) = PartOrigin origins
  { occurrences = Map.update withOwner key origins.occurrences }
  where
  withOwner found = pure found { owner = pure owner }

occurrenceOf ∷ Int → PartOrigin → Maybe Occurrence
occurrenceOf predicate (PartOrigin origins) =
  Map.lookup predicate origins.predicates
    >>= flip Map.lookup origins.occurrences

-- The identity that keys a predicate's occurrence.
occurrenceKey ∷ Int → PartOrigin → Maybe Int
occurrenceKey predicate (PartOrigin origins) =
  Map.lookup predicate origins.predicates

-- The first written type that supplied the meta a constant is kept.
requiredAt ∷ Int → Span → PartOrigin → PartOrigin
requiredAt meta span (PartOrigin origins) = PartOrigin origins
  { required = Map.insertWith keepFirst meta span origins.required }
  where
  keepFirst first _ = first

requiredOf ∷ Int → PartOrigin → Maybe Span
requiredOf meta (PartOrigin origins) = Map.lookup meta origins.required

parameterMade ∷ Parameter → PartOrigin → PartOrigin
parameterMade parameter (PartOrigin origins) = PartOrigin origins
  { parameters = Array.snoc origins.parameters parameter }

parametersOf ∷ PartOrigin → Array Parameter
parametersOf (PartOrigin origins) = origins.parameters

seededAt ∷ Array Seeded → PartOrigin → PartOrigin
seededAt added (PartOrigin origins) = PartOrigin origins
  { seeded = origins.seeded <> added }

seededOf ∷ PartOrigin → Array Seeded
seededOf (PartOrigin origins) = origins.seeded
