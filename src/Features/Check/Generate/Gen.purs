-- trusted surface: every diff needs token review; see docs/engineering.md
-- D1's generation primitives (docs/plans/r0-generation-continuation.md
-- §3.3; R0 Task 7.1a). They partition `Gen`'s parts: only `fresh` and
-- `rigid` write variables, only `positioned` and `slots` write sites
-- (and so `types`), only `emit` writes entries; `lifted` stops
-- generation with Task 3.2's fault. A rule module builds its whole
-- recorded problem through them, and a type's recorded and checked forms
-- come from one call. `Gen` never sees a witness, so it may be monadic.
--
-- Labelled amendments to §3.3's sketch: `fresh` takes the variable's
-- sort and its T-R0b stored position, which `VarInfo` holds and the role
-- alone does not fix (`Inst i` takes the callee's sort); `rigid` writes
-- a signature variable (Sig1), which §3.3 left unassigned; `emit` takes
-- the rule's `At` and each entry's spec row, kind and span, so entries
-- carry Task 3.2's origins; `lifted` is the fault channel (ruling on
-- Q3).
module Features.Check.Generate.Gen
  ( module Exports
  , GenAtom(..)
  , GenEntry(..)
  , GenReq(..)
  , GenSite
  , Minted
  , Rigid
  , Tagged
  , emit
  , fresh
  , lifted
  , positioned
  , rigid
  , slots
  ) where

import Prelude
import Data.Array (mapWithIndex)
import Data.Either (Either(..), either)
import Data.Foldable (traverse_)
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..), snd)
import Domain.Checked.Internal (Instantiation, Open(..))
import Domain.Elaborating.Types (UseSort)
import Domain.Recorded.Atom
  ( Atom(..)
  , Callee
  , CheckedName(..)
  , OutsideKind
  , Quant(..)
  , ReqAtom(..)
  , Role
  , Var(..)
  , VarSort
  )
import Domain.Recorded.Origin (OriginKind, Path, RuleId, SpecRow)
import Domain.Syntax (Span)
import Domain.Type (Ty(..), VarId)
import Features.Check.Generate.Elab.Internal (Gen) as Exports
import Features.Check.Generate.Elab.Internal
  ( Elab
  , Gen(..)
  , GenTy
  , Handle(..)
  , Piece(..)
  , Ref
  , elabSlots
  , elabTy
  , forget
  , recorded
  )
import Features.Check.Generate.Elab.Log as Log
import Features.Check.Generate.Fault (GenerationFault)
import Features.Check.Generate.Out (At, Item(..), Out, emit, varsOut) as Out

-- A fresh variable ⟨path, role⟩ with its site-table entry (§5.2).
type Minted =
  { path ∷ Path
  , role ∷ Role
  , sort ∷ VarSort
  , position ∷ CheckedName
  , rule ∷ RuleId
  , span ∷ Span
  }

-- A signature variable, at its checked `Rigid i` (Sig1, §5.2).
type Rigid =
  { variable ∷ VarId, sort ∷ VarSort, path ∷ Path, rule ∷ RuleId, span ∷ Span }

-- T-R0b §2.4's entries over generator variables, so every variable an
-- atom mentions is a minted handle or a rigid variable.
data GenAtom s
  = GenEqual (GenTy s) (GenTy s)
  | GenLacks (Ref s) String
  | GenDisjoint (Ref s) (Ref s)
  | GenFf

data GenReq s = GenPrintable (GenTy s) | GenComparable (GenTy s)

type GenSite s = { callee ∷ Callee, slots ∷ Array (Ref s) }

data GenEntry s
  = EmitD (GenAtom s)
  | EmitB (GenAtom s)
  | EmitBQ (GenReq s)
  | EmitOutside OutsideKind
  | EmitAdm (GenSite s)
  | EmitSplit (GenSite s)

-- An entry with its spec row, origin kind and span (Generate.Out).
type Tagged s =
  { entry ∷ GenEntry s, row ∷ SpecRow, kind ∷ OriginKind, span ∷ Span }

-- The only way to obtain a handle: it writes the variable's `VarInfo`
-- (quantifier `Exists`), so a second `fresh` of one `Var` shows in the
-- log (`DuplicateFresh`).
fresh ∷ ∀ s. Minted → Gen s (Handle s)
fresh minted = Handle variable <$ wrote (Out.varsOut [ Tuple variable info ])
  where
  variable = FreshVar minted.path minted.role
  info =
    { sort: minted.sort
    , quant: Exists
    , origin:
        { path: minted.path
        , role: Just minted.role
        , rule: minted.rule
        , span: minted.span
        }
    , position: minted.position
    }

rigid ∷ ∀ s. Rigid → Gen s Unit
rigid written = wrote (Out.varsOut [ Tuple (RigidVar written.variable) info ])
  where
  info =
    { sort: written.sort
    , quant: Forall written.variable
    , origin:
        { path: written.path
        , role: Nothing
        , rule: written.rule
        , span: written.span
        }
    , position: RigidName written.variable
    }

-- The only way to elaborate a generator type: logs it under its site
-- and returns its read. A `RigidName i` site reads nothing: its checked
-- type is `Rigid i` (§3.3's table); a handle logged there is reported.
positioned ∷ ∀ s. CheckedName → GenTy s → Gen s (Elab s (Ty Open))
positioned site ty = read site <$ sited site ty
  where
  read = case _ of
    RigidName index → pure (TVar (Rigid index))
    other → elabTy other ty

-- The same for an instantiation, each slot logged under `Slot path i`.
slots
  ∷ ∀ s
  . Path
  → Array (Tuple UseSort (GenTy s))
  → Gen s (Elab s Instantiation)
slots path written = elabSlots path written
  <$ traverseSites (mapWithIndex site written)
  where
  site index slot = Tuple (Slot path index) (snd slot)

-- The rule's entries at its path, indexed in listed order.
emit ∷ ∀ s. Out.At → Array (Tagged s) → Gen s Unit
emit at entries = wrote (Out.emit at (map listed entries))
  where
  listed tagged =
    { item: item tagged.entry
    , row: tagged.row
    , kind: tagged.kind
    , span: tagged.span
    }

lifted ∷ ∀ s a. Either GenerationFault a → Gen s a
lifted = either (Gen <<< Left) pure

item ∷ ∀ s. GenEntry s → Out.Item
item = case _ of
  EmitD atom → Out.ToD (atomOf atom)
  EmitB atom → Out.ToB (atomOf atom)
  EmitBQ requirement → Out.ToBQ (requirementOf requirement)
  EmitOutside kind → Out.ToOutside kind
  EmitAdm site → Out.ToAdm (siteOf site)
  EmitSplit site → Out.ToSplit (siteOf site)
  where
  siteOf site = { callee: site.callee, slots: map forget site.slots }

atomOf ∷ ∀ s. GenAtom s → Atom
atomOf = case _ of
  GenEqual left right → Equal (recorded left) (recorded right)
  GenLacks variable label → Lacks (forget variable) label
  GenDisjoint one other → Disjoint (forget one) (forget other)
  GenFf → Ff

requirementOf ∷ ∀ s. GenReq s → ReqAtom
requirementOf = case _ of
  GenPrintable ty → Printable (recorded ty)
  GenComparable ty → Comparable (recorded ty)

wrote ∷ ∀ s. Out.Out → Gen s Unit
wrote out = Gen (Right { value: unit, parts: Log.one (Wrote out) })

sited ∷ ∀ s. CheckedName → GenTy s → Gen s Unit
sited site ty =
  Gen (Right { value: unit, parts: Log.one (Sited site (recorded ty)) })

traverseSites ∷ ∀ s. Array (Tuple CheckedName (GenTy s)) → Gen s Unit
traverseSites = traverse_ sitedPair
  where
  sitedPair (Tuple site ty) = sited site ty
