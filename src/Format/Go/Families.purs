-- Runtime keys of `Fail` families (ADR 010; R001 design §3a). Existing
-- keys count down from -1 by the payload's declared head: `Int` -1, `Bool`
-- -2, `Unit` -3, a declared type -4 minus its id, and Text MinInt32 below
-- every other. A record's family is its sorted label set; label sets take
-- the keys from MinInt32 + 1 upwards, numbered in the sorted order of the
-- program's label lists, so the numbering is deterministic and lies
-- between Text's key and the declared types'. A program in which the two
-- ranges would meet is refused (`keyed`).
module Format.Go.Families
  ( RecordKeys
  , keyed
  , recordKeys
  , familiesFit
  , failKey
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), maybe)
import Data.Tuple (Tuple(..))
import Domain.Ids (TypeId(..))
import Domain.IR.Internal as IR
import Domain.Problem (Problem(..))
import Domain.Row (TypeHead(..))
import Domain.Syntax (Diagnostic, Span, problemAt)
import Format.Go.Context (children)

-- Each label set's key, by its sorted labels.
type RecordKeys = Map (Array String) Int

-- Each family the program fails or handles, at its first site in pre-order.
type Sites = Map TypeHead Span

-- Go's int is at least 32 bits wide; this is math.MinInt32.
textFailKey ∷ Int
textFailKey = -2147483648

-- The first declared type's key; the range counts down from it.
declaredFailKey ∷ Int
declaredFailKey = -4

-- The program, if its label-set keys stay below every declared type's.
-- Meeting them takes over two billion families and declarations, which
-- no source this compiler can hold reaches, so this is an invariant: a
-- refusal is a compiler failure, worded as the specializer's for a Fail
-- whose family has no key (Features.Specialize.Handlers).
keyed ∷ IR.Program → Either Diagnostic IR.Program
keyed program = maybe (Right program) judged (Map.findMax records)
  where
  found = sites program
  records = recordSites found
  highest = foldl highestData 0 (Map.keys found)
  -- Reported at the first site of the label set numbered last.
  judged last =
    if familiesFit (Map.size records) highest then Right program
    else Left (problemAt (Internal "Fail without a family") last.value)

recordKeys ∷ IR.Program → RecordKeys
recordKeys program = Map.fromFoldable
  (Array.mapWithIndex numbered (Array.fromFoldable (Map.keys records)))
  where
  records = recordSites (sites program)
  numbered index labels = Tuple labels (textFailKey + 1 + index)

-- Whether `count` label sets, keyed from MinInt32 + 1, stay below the key
-- of declared type `highest`, and below -4 when no declared type is a
-- family. Written as a difference, which cannot overflow an Int.
familiesFit ∷ Int → Int → Boolean
familiesFit count highest = count < declaredFailKey - textFailKey - highest

-- A label set the program never fails or handles (a compiler bug) has no
-- key; its site then lowers as a malformed value (Format.Go.Handle).
failKey ∷ RecordKeys → TypeHead → Maybe Int
failKey records = case _ of
  HeadInt → Just (-1)
  HeadBool → Just (-2)
  HeadUnit → Just (-3)
  HeadText → Just textFailKey
  HeadData (TypeId index) → Just (declaredFailKey - index)
  HeadRecord labels → Map.lookup labels records

-- A program without records has no record family, so it is not searched.
sites ∷ IR.Program → Sites
sites (IR.Program program)
  | Array.null program.records = Map.empty
  | otherwise = foldl function Map.empty program.functions
      where
      function found definition = visit found definition.body

-- Pre-order, as Format.Go.RecordUse walks: a node's family, then its
-- parts'.
visit ∷ Sites → IR.Expr → Sites
visit found (IR.Expr expression) = foldl visit (noted found)
  (children node <> IR.effectParts node)
  where
  node = expression.node
  noted reached = case node of
    IR.Abort head _ → first reached head expression.span
    IR.Handle _ clauses → foldl clause reached clauses
    _ → reached
  clause reached failure = first reached failure.family failure.span

first ∷ Sites → TypeHead → Span → Sites
first found head span = Map.alter kept head found
  where
  kept = maybe (Just span) Just

recordSites ∷ Sites → Map (Array String) Span
recordSites found = Map.fromFoldable
  (Array.mapMaybe labelled (Map.toUnfoldable found))
  where
  labelled (Tuple head span) = case head of
    HeadRecord labels → Just (Tuple labels span)
    _ → Nothing

highestData ∷ Int → TypeHead → Int
highestData highest = case _ of
  HeadData (TypeId index) → max highest index
  _ → highest
