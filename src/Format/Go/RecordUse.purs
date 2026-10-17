module Format.Go.RecordUse (RecordUse, recordUse, note, closed) where

import Prelude
import Data.Array as Array
import Data.Foldable (foldl)
import Data.Maybe (Maybe(..), maybe)
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (snd)
import Domain.IR.Internal as IR
import Domain.IR.Parts as Parts
import Domain.IR.Internal (LayoutId(..), Ty(..))
import Format.Go.Context (children)

-- The record layouts whose compare and show helpers the program calls
-- (R001 design §5: helpers only when used). A comparison or print of a
-- record calls its helper; so does every declared type's helper, all of
-- which are emitted, for a record field; and a record helper calls the
-- helpers of the records it holds. A program without records has none.
type RecordUse = { compared ∷ Set Int, shown ∷ Set Int }

recordUse ∷ IR.Program → RecordUse
recordUse (IR.Program program)
  | Array.null program.records = noUse
  | otherwise =
      { compared: closed program.records (with stored found.compared)
      , shown: closed program.records (with (stored <> entry) found.shown)
      }
      where
      found = foldl function noUse program.functions
      function reached definition = visit reached definition.body
      stored = Array.concatMap fieldsOf program.ctors
      fieldsOf ctor = ctor.fields
      -- `main` prints its result (Format.Go).
      entry = map result (Array.filter isEntry program.functions)
      isEntry definition = definition.id == program.entry
      result definition = definition.result
      with types used = foldl note used types

noUse ∷ RecordUse
noUse = { compared: Set.empty, shown: Set.empty }

-- Every expression, in pre-order: what it compares and prints, then its
-- parts' (Format.Go.Cleanup walks the same parts).
visit ∷ RecordUse → IR.Expr → RecordUse
visit reached (IR.Expr expression) = foldl visit (noted reached)
  (children node <> Parts.effectParts node)
  where
  node = expression.node
  noted found = case node of
    IR.Compare _ left _ → found
      { compared = note found.compared (IR.typeOf left) }
    IR.Print value → printing value found
    IR.Show value → printing value found
    IR.Crash value → printing value found
    IR.Abort _ value → printing value found
    _ → found
  printing value found = found { shown = note found.shown (IR.typeOf value) }

-- A record type's layout joins `used`; any other type adds none.
note ∷ Set Int → Ty → Set Int
note used ty = maybe used inserted (layoutOf ty)
  where
  inserted index = Set.insert index used

-- The layouts among `roots`, and those their fields hold. A layout holds
-- only earlier layouts (Features.Specialize.Layouts), so one pass from the
-- last layout to the first reaches every one.
closed ∷ Array IR.RecordInfo → Set Int → Set Int
closed table roots = Array.foldr held roots
  (Array.mapWithIndex indexed table)
  where
  indexed index info = { index, info }
  held entry used
    | Set.member entry.index used = foldl note used
        (map snd entry.info.fields)
    | otherwise = used

layoutOf ∷ Ty → Maybe Int
layoutOf = case _ of
  TRecord (LayoutId index) → Just index
  _ → Nothing
