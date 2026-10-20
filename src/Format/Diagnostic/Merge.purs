module Format.Diagnostic.Merge (undetermined, mustBe, partsList) where

import Prelude
import Data.Array as Array
import Data.Maybe (maybe)
import Data.String (joinWith)
import Domain.Problem.Merge
  ( Fault(..)
  , MergeAtom(..)
  , MergeHint(..)
  , MustBe
  , Subject(..)
  , Undetermined
  )
import Domain.Problem.Names (TypeName)

-- The texts of D4 and D6 (R005 Tranche B diagnostics §2, approved
-- 2026-10-17 and 2026-10-19; R9's hints as plan §10 decision 20 chose
-- them). Rows arrive as names; `name` prints them.
undetermined ∷ (TypeName → String) → Undetermined → String
undetermined name found = "Cannot tell " <> subject <> maybe "" hint found.hint
  where
  owned = maybe "" possessive found.owner
  path = nested found.path
  subject = case found.subject of
    HasField label → choice <> path <> " has field " <> label
    HoldsTail tail → choice <> path <> " holds " <> tail
    Holds → "what " <> owned <> partsList found.parts <> path <> " hold"
    Splits other → "how " <> owned <> partsList found.parts <> path
      <> " split "
      <> name other
  choice
    | Array.length found.parts == 2 = "whether " <> owned
        <> joinWith " or " found.parts
    | otherwise = "which of " <> owned <> alternatives found.parts
  hint = case _ of
    LambdaInPlaceOf owner → lambda <> owner
    LambdaInPlaceOfPartial owner → lambda <> "this partial application of "
      <> owner
    AnnotateLambda → "; annotate this lambda's parameters"
    RowArgumentsOf owner → "; write " <> possessive owner
      <> "row arguments in the enclosing signature or in a lambda "
      <> "parameter's annotation"
    OwnCall owner → "; no annotation can decide " <> partsList found.parts
      <> ", which belong to this call of "
      <> owner
  lambda = "; pass a lambda with annotated parameters in place of "

mustBe ∷ (TypeName → String) → MustBe → String
mustBe name found = maybe "" possessive found.owner <> name found.row
  <> nested found.path
  <> " must be "
  <> name found.other
  <> fault
  where
  fault = case found.fault of
    OnePart → ", so " <> joinWith ", " found.parts <> " cannot " <> holding
    NoPart
      | Array.length found.parts == 2 → ", but neither "
          <> joinWith " nor " found.parts
          <> " can "
          <> holding
      | otherwise → ", but none of " <> alternatives found.parts <> " can "
          <> holding
  holding = case found.atom of
    FieldAtom label → "have field " <> label
    TailAtom tail → "hold " <> tail

-- `A and B`, `A, B and C` (R3, R8).
partsList ∷ Array String → String
partsList = listed " and "

alternatives ∷ Array String → String
alternatives = listed " or "

listed ∷ String → Array String → String
listed last parts = maybe (joinWith ", " parts) joined (Array.unsnoc parts)
  where
  joined split
    | Array.null split.init = split.last
    | otherwise = joinWith ", " split.init <> last <> split.last

possessive ∷ String → String
possessive owner = owner <> "'s "

nested ∷ Array String → String
nested path
  | Array.null path = ""
  | otherwise = " (in field " <> joinWith "." path <> ")"
