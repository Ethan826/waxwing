-- G0's adapter (W §1.6; Task 4.4): a checked substitution as a
-- compilation witness, and Cov (W §4), the validator of any adapter's
-- witness. Shadow-only (ruling R6). `Recon` is empty (§18.69 Q6), so
-- Cov's domain is every flexible variable, auxiliaries included, until
-- G-D1 and G-Recon.
--
-- `substitutionWitness` binds every flexible variable and names none: a
-- variable whose image is a bare hole (`holeVar n` as a type, or as a
-- row's only part) is `Free n`; any other image is `Inline`, unchanged;
-- a variable the substitution leaves out is `Free` at a hole numbered
-- above every hole the substitution mentions, in `Ord Var` order (a
-- labelled choice: no checked-IR hole stands for it). A binding alone
-- establishes nothing: the witness is offered only if Cov accepts it,
-- the hole contract included (Strategy.HoleContract), and otherwise the
-- reason is the compilation's.
module Features.Check.Strategy.Witness
  ( coverage
  , substitutionWitness
  ) where

import Prelude
import Data.Array (concatMap, filter, head, length, mapWithIndex, null)
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (maximum)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse_)
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (Quant(..), RTExpr(..), Var, VarInfo, VarSort(..))
import Domain.Verdict (Compilation(..), NoWitnessReason(..))
import Domain.Verdict.Witness (Binding(..), Witness)
import Features.Check.Strategy.Candidate (Substitution)
import Features.Check.Strategy.HoleContract (holeContract)
import Features.Check.Strategy.ReadBack.Type (holesIn)

substitutionWitness ∷ RecordedProblem → Substitution → Compilation
substitutionWitness problem candidate =
  either NoWitness (const (Witnessed made)) (coverage problem made)
  where
  made = { bindings: bindingsOf problem candidate, names: [] }

-- Every variable of the domain has its binding, then the hole contract.
coverage ∷ RecordedProblem → Witness → Either NoWitnessReason Unit
coverage problem witness = do
  traverse_ covered (map fst (flexible problem))
  holeContract problem witness
  where
  covered variable
    | Map.member variable witness.bindings = Right unit
    | otherwise = Left (Uncovered variable)

bindingsOf ∷ RecordedProblem → Substitution → Map.Map Var Binding
bindingsOf problem candidate =
  Map.fromFoldable (present <> mapWithIndex freed absent)
  where
  domain = flexible problem
  present = Array.mapMaybe imaged domain
  imaged (Tuple variable info) =
    Tuple variable <<< binding info <$> Map.lookup variable candidate
  absent = filter (not <<< flip Map.member candidate) (map fst domain)
  freed index variable = Tuple variable (Free (fresh + index))
  fresh = maybe 0 (_ + 1)
    (maximum (concatMap holesIn (Array.fromFoldable (Map.values candidate))))

binding ∷ VarInfo → RTExpr → Binding
binding info image = maybe (Inline image) Free (bareHole info.sort image)

bareHole ∷ VarSort → RTExpr → Maybe Int
bareHole sort image = case image of
  TVar _ → whenSort SortType
  Record fields tails
    | null fields && length tails == 1 → whenSort SortRow
    | otherwise → Nothing
  Arrow _ _ → Nothing
  Base _ → Nothing
  App _ _ → Nothing
  where
  whenSort wanted =
    if sameSort wanted sort then head (holesIn image)
    else Nothing

sameSort ∷ VarSort → VarSort → Boolean
sameSort one other = case one, other of
  SortType, SortType → true
  SortRow, SortRow → true
  SortType, SortRow → false
  SortRow, SortType → false

flexible ∷ RecordedProblem → Array (Tuple Var VarInfo)
flexible problem = filter isFlexible (Map.toUnfoldable (fields problem).vars)
  where
  isFlexible (Tuple _ info) = case info.quant of
    Exists → true
    Forall _ → false
