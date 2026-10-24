-- The clauses a signature's types imply (T-R0b Sig6, Sig8; Check/
-- Implied.purs's `implied`, whose walk this follows): a record's own
-- labels for each of its tails (Sig6), and, where a tail is a declared
-- type's record argument, the labels that declaration writes beside its
-- parameter (Sig8, by Implied's `declared`). The two are kept apart
-- because they are two rules (docs/findings.md "RT1's translator",
-- reading 17). Atoms are over generator variables (D1 spec §3.3; R0
-- Task 7.1b), each tail named as the naming reads it.
module Features.Check.Generate.Facts
  ( Implied
  , impliedOf
  , signatureTypes
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Set as Set
import Data.Tuple (fst)
import Domain.Ids (TypeId(..))
import Domain.Resolved (Ty(..), TyRow, VarId)
import Domain.Syntax (Sort(..))
import Domain.Type.Parts (children, rowArguments, rowsOf)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Gen (GenAtom(..))
import Features.Check.Generate.Inputs (Tables)
import Features.Check.Generate.Translate (Naming, named)
import Features.Check.Implied (declared)

-- One type's `lacks` atoms under a naming: Sig6's and Sig8's.
type Implied s = { beside ∷ Array (GenAtom s), passed ∷ Array (GenAtom s) }

data Fact = Beside VarId (Array String) | Passed TypeId Int VarId

-- Facts of the type and of every type within it, in Implied's order:
-- its own, its children's, then its rows' arguments'. Recursion is over
-- written structure (`children` takes a spine's parts by a loop).
-- A declared type the tables lack is a fault (`UnknownType`).
impliedOf
  ∷ ∀ s
  . Tables
  → Naming s
  → Ty VarId
  → Either GenerationFault (Implied s)
impliedOf tables naming ty = facts tables ty >>= split
  where
  split found = { beside: _, passed: _ }
    <$> (Array.concat <$> traverse besideAtoms found)
    <*> (Array.concat <$> traverse passedAtoms found)
  besideAtoms = case _ of
    Beside tail labels → lacking tail labels
    Passed _ _ _ → pure []
  passedAtoms = case _ of
    Beside _ _ → pure []
    Passed owner position tail → lacking tail
      (Set.toUnfoldable (declared resolved owner position))
  lacking tail labels = lacksAll labels <$> named naming tail
  lacksAll labels ref = map (GenLacks ref) labels
  resolved = { types: tables.types, ctors: tables.ctors }

-- A signature's types in order: its parameters, its result, then its
-- effect row's label arguments (Sig6: "parameter, result and effect-row
-- types").
signatureTypes
  ∷ ∀ r
  . { parameters ∷ Array (Ty VarId)
    , result ∷ Ty VarId
    , row ∷ TyRow VarId
    | r
    }
  → Array (Ty VarId)
signatureTypes found = Array.snoc found.parameters found.result
  <> rowArguments found.row

facts ∷ Tables → Ty VarId → Either GenerationFault (Array Fact)
facts tables ty = joined <$> own <*> traverse inner (children ty)
  <*> traverse inner (Array.concatMap rowArguments (rowsOf ty))
  where
  joined mine parts rows = mine <> Array.concat parts <> Array.concat rows
  inner part = facts tables part
  own = case ty of
    TRecord row → pure (map (Beside <@> labelsOf row.fields) row.tails)
    TData owner arguments _ → passed tables owner arguments
    _ → pure []
  labelsOf fields = Set.toUnfoldable (Set.fromFoldable (map fst fields))

-- A type argument that is a record's tails, at its parameter's position
-- among the declaration's non-effect-row parameters (Implied's `slots`).
passed
  ∷ Tables → TypeId → Array (Ty VarId) → Either GenerationFault (Array Fact)
passed tables owner arguments = among <$> slots tables owner
  where
  among positions = Array.concat (Array.zipWith argument positions arguments)
  argument position = case _ of
    TRecord row → map (Passed owner position) row.tails
    _ → []

slots ∷ Tables → TypeId → Either GenerationFault (Array Int)
slots tables id@(TypeId owner) = maybe (Left (UnknownType id))
  (Right <<< positions)
  (Array.index tables.types owner)
  where
  positions info = Array.catMaybes (Array.mapWithIndex slot info.sorts)
  slot position sort = if sort == RowSort then Nothing else Just position
