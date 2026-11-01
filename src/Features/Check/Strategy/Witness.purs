-- trusted surface: every diff needs token review; see docs/engineering.md
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
-- the solved form and the hole contract included (Strategy.HoleContract),
-- and otherwise the reason is the compilation's.
module Features.Check.Strategy.Witness
  ( bindingsOf
  , coverage
  , flexDomain
  , substitutionWitness
  ) where

import Prelude
import Data.Array
  ( any
  , concatMap
  , elem
  , filter
  , find
  , head
  , length
  , mapMaybe
  , mapWithIndex
  , null
  )
import Data.Array as Array
import Data.Either (Either(..), either)
import Data.Foldable (maximum)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Traversable (traverse_)
import Data.Tuple (Tuple(..), fst, snd)
import Domain.Recorded (Fields, RecordedProblem, fields)
import Domain.Recorded.Atom (Quant(..), RTExpr(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Hole (holeIndex, holeVar)
import Domain.Verdict (Compilation(..), NoWitnessReason(..))
import Domain.Verdict.Witness (Binding(..), Witness)
import Features.Check.Strategy.Candidate (Substitution)
import Features.Check.Strategy.HoleContract (holeContract)
import Features.Check.Spine (spine)
import Features.Check.Strategy.ReadBack.Type (holesIn)

substitutionWitness ∷ RecordedProblem → Substitution → Compilation
substitutionWitness problem candidate =
  either NoWitness (const (Witnessed made))
    (coverage (flexDomain problem) problem made)
  where
  made = { bindings: bindingsOf problem candidate, names: [] }

-- Every variable of the domain has its binding, every binding is in
-- solved form (`solvedForm`), then the hole contract. The domain is an
-- argument (D1 spec §7; Task 7.1a): `flexDomain` while `Recon` is
-- empty, `Features.Check.Elaborate.covDomain` under D1. A `Set`, so
-- variables are judged in `Ord Var` order, as before. The solved form
-- runs here, not beside `coverage`, so neither `substitutionWitness`
-- nor Elaborate's re-check can offer a witness without it.
coverage
  ∷ Set Var → RecordedProblem → Witness → Either NoWitnessReason Unit
coverage domain problem witness = do
  traverse_ covered (Set.toUnfoldable domain ∷ Array Var)
  solvedForm problem witness
  holeContract problem witness
  where
  covered variable
    | Map.member variable witness.bindings = Right unit
    | otherwise = Left (Uncovered variable)

-- §18.76 item 2's solved form, U8's check (docs/plans/
-- r0-u8-solved-form.md §2): every variable in every binding's image, at
-- any depth, auxiliaries' bindings included, is a declared rigid at its
-- position's sort or a hole with one sort across the witness. A `Free n`
-- binding is hole `n` at its key's recorded sort. The variable named is
-- the first key, in `Ord Var` order, whose image breaks it.
solvedForm ∷ RecordedProblem → Witness → Either NoWitnessReason Unit
solvedForm problem witness =
  maybe (Right unit) (Left <<< UnsolvedImage <<< fst)
    (find breaks found)
  where
  view = fields problem
  found = map occurring (Map.toUnfoldable witness.bindings)
  occurring (Tuple variable bound) =
    Tuple variable (occurrencesOf view variable bound)
  twoSorts = Set.intersection (holesAt SortType) (holesAt SortRow)
  holesAt sort =
    Set.fromFoldable (concatMap (holesOfSort sort <<< snd) found)
  breaks (Tuple _ seen) = any (outside view twoSorts) seen

-- Each variable occurrence of a binding's image with its position's sort.
occurrencesOf ∷ Fields → Var → Binding → Array (Tuple VarSort Var)
occurrencesOf view variable = case _ of
  Inline image → occurrences image
  Free hole → maybe [] (freed hole) (Map.lookup variable view.vars)
  where
  freed hole info = [ Tuple info.sort (holeVar hole) ]

occurrences ∷ RTExpr → Array (Tuple VarSort Var)
occurrences ty = case ty of
  Arrow _ _ → concatMap occurrences parts.parameters
    <> occurrences parts.result
  Base _ → []
  TVar variable → [ Tuple SortType variable ]
  Record entries tails → concatMap (occurrences <<< snd) entries
    <> map (Tuple SortRow) tails
  App _ arguments → concatMap occurrences arguments
  where
  parts = spine ty

holesOfSort ∷ VarSort → Array (Tuple VarSort Var) → Array Int
holesOfSort wanted = mapMaybe atSort
  where
  atSort (Tuple sort variable)
    | sameSort wanted sort = holeIndex variable
    | otherwise = Nothing

-- Neither a declared rigid at its sort nor a hole of one sort.
outside ∷ Fields → Set Int → Tuple VarSort Var → Boolean
outside view twoSorts (Tuple sort variable) =
  maybe (not (elem variable declared)) (flip Set.member twoSorts)
    (holeIndex variable)
  where
  declared = case sort of
    SortType → view.rigidTy
    SortRow → view.rigidRow

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

-- Every flexible variable: Cov's domain while `Recon` is empty.
flexDomain ∷ RecordedProblem → Set Var
flexDomain = Set.fromFoldable <<< map fst <<< flexible

flexible ∷ RecordedProblem → Array (Tuple Var VarInfo)
flexible problem = filter isFlexible (Map.toUnfoldable (fields problem).vars)
  where
  isFlexible (Tuple _ info) = case info.quant of
    Exists → true
    Forall _ → false
