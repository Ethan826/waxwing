-- Problem variables (T-R0b §2.3, §5.2): a fresh one by its canonical name
-- `⟨p, role⟩` with its site-table entry, a callee's or owner's variables
-- named at an occurrence (`θ`), the declaration's own (`ν_f`), and the
-- paths that name nodes (§6).
module Features.Check.Generate.Fresh
  ( FreshAt
  , Naming
  , auxiliary
  , child
  , childAt
  , childOf
  , fresh
  , instVars
  , instNaming
  , nodeRes
  , rigidNaming
  , sortVar
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom
  ( CheckedName(..)
  , Quant(..)
  , Role(..)
  , Var(..)
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin (Path(..), RuleId, Step(..))
import Domain.Resolved (VarId(..))
import Domain.Syntax (Sort(..), Span)

-- How a declaration's `VarId`s read at one place: `ν_f` or `θ` (§2.2).
type Naming = VarId → Var

-- Where a fresh variable is introduced and what it is.
type FreshAt =
  { path ∷ Path
  , role ∷ Role
  , rule ∷ RuleId
  , span ∷ Span
  , sort ∷ VarSort
  , position ∷ CheckedName
  }

-- Inside the declaration: its rigid variable `i` (Sig1).
rigidNaming ∷ Naming
rigidNaming = RigidVar

-- At an occurrence at `path`: the fresh `⟨path, inst i⟩` (§2.2).
instNaming ∷ Path → Naming
instNaming path = FreshVar path <<< Inst

-- A fresh, flexible variable with its entry; the key agrees with the
-- origin's path and role by construction (Task 3.1 carry).
fresh ∷ FreshAt → Tuple Var VarInfo
fresh at = Tuple (FreshVar at.path at.role)
  { sort: at.sort
  , quant: Exists
  , origin: { path: at.path, role: Just at.role, rule: at.rule, span: at.span }
  , position: at.position
  }

-- `⟨p, inst i⟩` for each variable of a callee, owner or effect that is not
-- an effect row, at its instantiation slot `Slot p i` (§5.2).
instVars ∷ Path → RuleId → Span → Array Sort → Array (Tuple Var VarInfo)
instVars path rule span sorts = Array.catMaybes
  (Array.mapWithIndex instVar sorts)
  where
  instVar index sort = map (made index) (sortVar sort)
  made index sort = fresh
    { path
    , role: Inst (VarId index)
    , rule
    , span
    , sort
    , position: Slot path index
    }

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
auxiliary ∷ Path → RuleId → Role → VarSort → Span → Tuple Var VarInfo
auxiliary path rule role sort span = fresh
  { path, role, rule, span, sort, position: Auxiliary }

-- `⟨p, res⟩`: the node's own type, positioned at `NodeType p` (§5.2).
nodeRes ∷ Path → RuleId → Span → Tuple Var VarInfo
nodeRes path rule span = fresh
  { path, role: Res, rule, span, sort: SortType, position: NodeType path }

-- A variable's sort in the problem; effect rows are never translated.
sortVar ∷ Sort → Maybe VarSort
sortVar = case _ of
  TypeSort → Just SortType
  RecordSort → Just SortRow
  RowSort → Nothing
