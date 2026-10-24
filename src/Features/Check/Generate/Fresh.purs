-- Problem variables (T-R0b §2.3, §5.2) as D1's handles (spec §3.3; R0
-- Task 7.1b): a fresh one by its canonical name `⟨p, role⟩` with its
-- site-table entry, minted by `Generate.Gen.fresh`; a callee's or
-- owner's variables named at an occurrence (`θ`); and the paths that
-- name nodes (§6).
module Features.Check.Generate.Fresh
  ( Instance
  , auxiliary
  , child
  , childAt
  , childOf
  , instances
  , nodeRes
  , sortVar
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..), maybe)
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Elaborating.Types (UseSort)
import Domain.Elaborating.Types as Use
import Domain.Recorded.Atom (CheckedName(..), Role(..), VarSort(..))
import Domain.Recorded.Origin (Path(..), RuleId, Step(..))
import Domain.Resolved (VarId(..))
import Domain.Syntax (Sort(..), Span)
import Features.Check.Generate.Elab (GenTy, Handle, Ref(..))
import Features.Check.Generate.Gen (Gen, fresh)
import Features.Check.Generate.Node (flex)
import Features.Check.Generate.Translate (Naming(..))

-- An occurrence's variables: the naming `θ`, the instantiation's slots
-- in the callee's order, with the sort each is read by, the `adm`
-- site's handles and the `split` site's (the record-row ones).
type Instance s =
  { naming ∷ Naming s
  , slots ∷ Array (Tuple UseSort (GenTy s))
  , all ∷ Array (Ref s)
  , rows ∷ Array (Ref s)
  }

-- `⟨p, inst i⟩` for each variable of a callee, owner or effect that is
-- not an effect row, at its instantiation slot `Slot p i` (§5.2). The
-- checked instantiation holds no effect-row slot (Check/
-- DeclarationUse.purs `typeArgument`), so slot `i` is the `i`th one
-- here when, as Resolve numbers them, effect rows come last (checked on
-- the corpus by T5's slot positions).
instances
  ∷ ∀ s. Path → RuleId → Span → Array Sort → Gen s (Instance s)
instances path rule span sorts = made
  <$> traverse minted (Array.mapWithIndex Tuple sorts)
  where
  minted (Tuple index sort) = maybe (pure Nothing) (mint index)
    (sortVar sort)
  mint index varSort = Just <<< Tuple varSort <$> fresh
    { path
    , role: Inst (VarId index)
    , rule
    , span
    , sort: varSort
    , position: Slot path index
    }
  made found =
    { naming: Instantiated (map (map handleOf) found)
    , slots: map slotOf (Array.catMaybes found)
    , all: map (FlexRef <<< handleOf) (Array.catMaybes found)
    , rows: map (FlexRef <<< handleOf)
        (Array.filter isRow (Array.catMaybes found))
    }
  handleOf (Tuple _ handle) = handle
  slotOf (Tuple varSort handle) = Tuple (useOf varSort) (flex handle)
  isRow (Tuple varSort _) = varSort == SortRow

-- A child's path: the parent's with these steps after it.
child ∷ Path → Array Step → Path
child (Path path) more = Path path { steps = path.steps <> more }

-- `Constructor/field` or `Constructor/field/index` (§6's `Call/args/2`).
childOf ∷ Path → String → String → Path
childOf path constructor field = child path (steps constructor field)

childAt ∷ Path → String → String → Int → Path
childAt path constructor field index = child path
  (steps constructor field <> [ Index index ])

steps ∷ String → String → Array Step
steps constructor field = [ Named constructor, Named field ]

-- A fresh variable with no checked-IR position (§5.2, §5.3).
auxiliary
  ∷ ∀ s. Path → RuleId → Role → VarSort → Span → Gen s (Handle s)
auxiliary path rule role sort span = fresh
  { path, role, rule, span, sort, position: Auxiliary }

-- `⟨p, res⟩`: the node's own type, positioned at `NodeType p` (§5.2).
nodeRes ∷ ∀ s. Path → RuleId → Span → Gen s (Handle s)
nodeRes path rule span = fresh
  { path, role: Res, rule, span, sort: SortType, position: NodeType path }

-- A variable's sort in the problem; effect rows are never translated.
sortVar ∷ Sort → Maybe VarSort
sortVar = case _ of
  TypeSort → Just SortType
  RecordSort → Just SortRow
  RowSort → Nothing

useOf ∷ VarSort → UseSort
useOf = case _ of
  SortType → Use.TypeSort
  SortRow → Use.RecordSort
