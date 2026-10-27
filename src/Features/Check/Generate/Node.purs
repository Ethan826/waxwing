-- trusted surface: every diff needs token review; see docs/engineering.md
-- What a generation rule gives (D1 spec §3.3-§3.5; R0 Task 7.1b): a
-- node's generator type, its checked IR as an `Elab` (read only through
-- `positioned`, `slots` and the request constructors, so `build` reads
-- what the value records), and its entries as a `Gen` not yet run.
-- Entries are kept apart so that a parent writes its own before its
-- children's, in Task 3.2's order (pre-order), although it needs the
-- children's types to write them; variables and sites are keyed maps,
-- so `fresh` and `positioned` run as the walk meets them.
module Features.Check.Generate.Node
  ( Generated
  , Ruled
  , arrowOf
  , fixed
  , flex
  , instanceArrow
  , markedFlex
  , markedRecord
  , markedRef
  , markersAt
  , none
  , recordOf
  , stagedArrow
  , tagged
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Open)
import Domain.Checked.Internal as Checked
import Domain.Recorded.Atom (OutsideKind(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , InstanceSig
  , MRow
  , MTy(..)
  )
import Domain.Recorded.Origin
  ( OriginKind
  , Path
  , RowGroup(..)
  , SpecRow(..)
  )
import Domain.Row (closedRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..))
import Domain.Type.Record (recordRow)
import Features.Check.Generate.Elab (Elab, GenTy, Handle, Ref(..))
import Features.Check.Generate.Gen (Gen, GenEntry(..), Tagged, refVar)
import Features.Check.Generate.Out (TypeMarker(..))

-- An expression's result: its type, its marked type (a-min §2, recorded
-- at `NodeAt`), its checked node, its entries.
type Generated s =
  { ty ∷ GenTy s
  , marked ∷ MTy
  , expr ∷ Elab s Checked.Expr
  , emits ∷ Gen s Unit
  }

-- What a rule gives `expr`: the node given its own checked type, which
-- `expr` reads at `NodeType p` (an over-applied call's saturated node
-- is typed from it, Generate.Call).
type Ruled s =
  { ty ∷ GenTy s
  , marked ∷ MTy
  , node ∷ Elab s (Ty Open → Checked.Node)
  , emits ∷ Gen s Unit
  }

-- A node that does not need its own type.
fixed ∷ ∀ s. Elab s Checked.Node → Elab s (Ty Open → Checked.Node)
fixed = map const

none ∷ ∀ s. Gen s Unit
none = pure unit

flex ∷ ∀ s. Handle s → GenTy s
flex = TVar <<< FlexRef

-- `σ₁ → … → σₙ → τ`, by Array.foldr (a loop). Every effect position of
-- an arrow generation builds is a meta today, so it is the closed empty
-- row (§12.1's fallback, Task 7.1 ruling, provisional).
arrowOf ∷ ∀ s. Array (GenTy s) → GenTy s → GenTy s
arrowOf parameters result = Array.foldr stage result parameters
  where
  stage parameter rest = TFun parameter closedRow rest

-- The marked arrow over parameters from `supplied` on (Check/Stages.purs
-- `stages`): stage k's row is the fresh `⟨p, stage k⟩`, the last stage's
-- is `last`, the signature's own row (a callee's, a lambda's).
stagedArrow
  ∷ Path
  → { supplied ∷ Int, parameters ∷ Array MTy, last ∷ MRow, result ∷ MTy }
  → MTy
stagedArrow path found =
  Array.foldr stage found.result (Array.mapWithIndex Tuple rest)
  where
  rest = Array.drop found.supplied found.parameters
  final = Array.length found.parameters - 1
  stage (Tuple index parameter) =
    MArrow parameter (rowAt (found.supplied + index))
  rowAt k
    | k == final = found.last
    | otherwise = { labels: [], tail: Just (EffFresh path (Stage k)) }

-- A use's type after `supplied` arguments, from its instance at p: the
-- rest of its stages are the instance's own (a reference supplies none).
instanceArrow ∷ Path → Int → InstanceSig → MTy
instanceArrow path supplied sig = stagedArrow path
  { supplied, parameters: sig.parameters, last: sig.row, result: sig.result }

-- A reference's or handle's marked type: its problem variable, named as
-- the recorded atoms name it (`refVar`).
markedRef ∷ ∀ s. Ref s → MTy
markedRef = MVar <<< refVar

markedFlex ∷ ∀ s. Handle s → MTy
markedFlex = markedRef <<< FlexRef

markedRecord ∷ ∀ s. Array (Tuple String MTy) → Array (Ref s) → MTy
markedRecord fields tails = MRecord fields (map refVar tails)

-- A record, its fields by label and its tails in order (Domain.Type.Record).
recordOf ∷ ∀ s. Array (Tuple String (GenTy s)) → Array (Ref s) → GenTy s
recordOf fields tails = TRecord (recordRow fields tails)

tagged ∷ ∀ s. GenEntry s → RowGroup → Int → OriginKind → Span → Tagged s
tagged entry group number kind span =
  { entry, row: SpecRow group number, kind, span }

-- The rows T-R0b gives §2.2's markers under every rule (O5, F8, O3;
-- docs/findings.md "RT1's translator", reading 7).
markersAt ∷ ∀ s. OriginKind → Span → Array TypeMarker → Array (Tagged s)
markersAt kind span = map marked
  where
  marked = case _ of
    OverRecords → tagged (EmitOutside DataOverRecords) RowO 5 kind span
    Application → tagged (EmitOutside DataApplication) RowF 8 kind span
    HandlerMark → tagged (EmitOutside HandlerType) RowO 3 kind span
