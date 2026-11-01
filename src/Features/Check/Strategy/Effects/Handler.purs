-- trusted surface: every diff needs token review; see docs/engineering.md
-- E1's row equality and Definition 4.1, handler-type equality (statements
-- §4; spec §9's `Equal` row), on settled types. A check run is threaded
-- by its index j: each check passed moves j on by one, and the first
-- violated check stops the run at its j, so j is the check's place in
-- spec §9's pre-order (constructor and head, marks, then children left to
-- right). The type comparator is passed in, so Effects.Equal imports
-- this module and not the reverse; it threads the same index, so a
-- failure inside a handler's argument keeps its place in the obligation.
-- Rows are read by Effects.Rows' grouped normal form (R-A: Leijen 2005
-- with labels compared by key, Leijen 2017 §3): keys in the left row's
-- first-occurrence order, each with its count, then each pair's
-- arguments and mark; then one check that the right row has no other
-- key; then the tail. A keyless or unsettled row cannot be read: the
-- run stops at the row's first index (spec §4.2: a keyless recorded
-- label fails the first obligation whose matching reads it).
module Features.Check.Strategy.Effects.Handler
  ( Checks
  , Compare
  , check
  , handlerEqual
  , rowEqual
  , sequenced
  , withMarks
  ) where

import Prelude
import Data.Array (all, catMaybes, elem, foldl, length, nub, zipWith)
import Data.Either (Either(..))
import Data.Foldable (lookup)
import Data.Maybe (Maybe, fromMaybe, isNothing, maybe)
import Data.Tuple (Tuple(..), fst)
import Domain.Row (LabelKey)
import Domain.Verdict.EffectPackage (PLabel, PRow, PTy(..))
import Features.Check.Strategy.Effects.Judged (Context, Failure)
import Features.Check.Strategy.Effects.Package (key)
import Features.Check.Strategy.Effects.Rows (Grouped, grouped)
import Features.Check.Strategy.Effects.Term (sameTerm)

-- From the index of the next check: the index after the run, or the
-- first violated check.
type Checks = Int → Either Failure Int

type Compare = PTy → PTy → Checks

-- Which parts of each label pair a row comparison reads (the key and
-- count always): `arguments` false is a bare C row, `marks` false R
-- under Definition 4.1(d).
type Reading = { arguments ∷ Boolean, marks ∷ Boolean }

withMarks ∷ Reading
withMarks = { arguments: true, marks: true }

-- R under Definition 4.1(d): arguments compared in full, nested marks
-- included; only each label's own mark ignored.
marksIgnored ∷ Reading
marksIgnored = { arguments: true, marks: false }

-- A C row: keys (a `Fail` label's payload head among them) and marks.
bare ∷ Reading
bare = { arguments: false, marks: true }

check ∷ Boolean → Checks
check passed index
  | passed = Right (index + 1)
  | otherwise = Left { check: index, limit: false }

sequenced ∷ Array Checks → Checks
sequenced = foldl (>=>) pure

-- (a) the effect and argument count (with the constructor: the head),
-- (b) the handled marks, (a) the arguments, then (c) or (d).
handlerEqual
  ∷ Context → Compare → { left ∷ PTy, right ∷ PTy } → Checks
handlerEqual _ same pair = case pair.left, pair.right of
  PHandler left leftRows, PHandler right rightRows →
    check (sameHead left right)
      >=> check (sameTerm left.mark right.mark)
      >=> sequenced (zipWith same left.args right.args)
      >=> rowsEqual same leftRows rightRows
  _, _ → check false
  where
  sameHead left right = left.effect == right.effect
    && length left.args == length right.args

type HandlerRows = { inference ∷ PRow, clauses ∷ Maybe PRow }

-- (c) neither owns a C: R ≡ R′ with marks, which is also C ≡ C. (d)
-- either owns one: R ≡ R′ with top-level marks ignored, then clauseRow ≡
-- clauseRow′ bare, marks and tails compared; rule J: a side without a C
-- uses R itself (Domain.Row `clauseRow`). An image's C is any C.
rowsEqual ∷ Compare → HandlerRows → HandlerRows → Checks
rowsEqual same left right
  | isNothing left.clauses && isNothing right.clauses =
      rowEqual same withMarks left.inference right.inference
  | otherwise =
      rowEqual same marksIgnored left.inference right.inference
        >=> rowEqual same bare (clauseRow left) (clauseRow right)
      where
      clauseRow rows = fromMaybe rows.inference rows.clauses

rowEqual ∷ Compare → Reading → PRow → PRow → Checks
rowEqual same reading left right =
  maybe (check false) compared (Tuple <$> grouped left <*> grouped right)
  where
  compared (Tuple leftForm rightForm) =
    sequenced (map (keyEqual same reading leftForm rightForm) order)
      >=> check (all (flip elem order) (map fst rightForm.keyed))
      >=> check (leftForm.tail == rightForm.tail)
  -- `grouped` keyed every label, so none is dropped here.
  order = nub (catMaybes (map key left.labels))

keyEqual
  ∷ Compare → Reading → Grouped → Grouped → LabelKey → Checks
keyEqual same reading leftForm rightForm labelKey =
  check (length lefts == length rights)
    >=> sequenced (zipWith (pairEqual same reading) lefts rights)
  where
  lefts = labelsAt leftForm
  rights = labelsAt rightForm
  labelsAt form = fromMaybe [] (lookup labelKey form.keyed)

pairEqual ∷ Compare → Reading → PLabel → PLabel → Checks
pairEqual same reading left right =
  arguments >=> marks
  where
  arguments
    | reading.arguments = argumentsEqual same left.args right.args
    | otherwise = pure
  marks
    | reading.marks = check (sameTerm left.mark right.mark)
    | otherwise = pure

-- Labels of one key have one argument count when the record and package
-- are well formed; a count that differs stops the run at the arguments'
-- first index.
argumentsEqual ∷ Compare → Array PTy → Array PTy → Checks
argumentsEqual same lefts rights
  | length lefts == length rights = sequenced (zipWith same lefts rights)
  | otherwise = check false
