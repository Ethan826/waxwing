-- trusted surface: every diff needs token review; see docs/engineering.md
-- An occurrence's callee, constructor owner or operation instantiated
-- (T-R0b §3.2, E3-E6; D1 spec §3.3, R0 Task 7.1b): its `⟨p, inst i⟩`
-- minted, its types under θ, the entries the reference itself records
-- and its instantiation read at `Slot p i`. The signature is read
-- first, then the types it holds.
module Features.Check.Generate.Callee
  ( Called
  , ctorInstance
  , functionInstance
  ) where

import Prelude
import Data.Array as Array
import Data.Traversable (traverse)
import Data.Tuple (Tuple(..))
import Domain.Checked.Internal (Instantiation)
import Domain.Recorded.Atom (Callee(..))
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId)
import Domain.Resolved (CtorId, FunctionId)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context)
import Features.Check.Generate.Elab (Elab, GenTy)
import Features.Check.Generate.Fresh (instances)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , Tagged
  , lifted
  , slots
  )
import Features.Check.Generate.Lookup (calleeOf, ctorShape)
import Features.Check.Generate.Node (markersAt, tagged)
import Features.Check.Generate.Signature (calleeClauses)
import Features.Check.Generate.Translate (named, translate, translateAll)

-- An instantiated callee, owner or operation: its parameter (or field)
-- types and result under θ, its listed entries, the markers of those
-- types, and its instantiation as read.
type Called s =
  { parameters ∷ Array (GenTy s)
  , result ∷ GenTy s
  , entries ∷ Array (Tagged s)
  , markers ∷ Array (Tagged s)
  , slots ∷ Elab s Instantiation
  }

-- E3's entries (origin inst): θ(D_g) written (F2) and implied (F3), the
-- `adm` site of every reference (F7, every `inst` slot) and a `split`
-- site when `g` has a record-row variable (H2, those slots). The
-- signature is read first, then the types it holds.
functionInstance
  ∷ ∀ s
  . Context s
  → Path
  → Span
  → FunctionId
  → RuleId
  → Gen s (Called s)
functionInstance context path span function rule = do
  signature ← lifted (calleeOf context.signatures function)
  inst ← instances path rule span signature.sorts
  parameters ← lifted
    (translateAll context.tables inst.naming signature.parameters)
  result ← lifted (translate context.tables inst.naming signature.result)
  clauses ← lifted (calleeClauses context.tables inst.naming signature)
  read ← slots path inst.slots
  pure
    { parameters: parameters.tys
    , result: result.ty
    , entries: map (instOf RowF 2 <<< EmitB) clauses.written
        <> map (instOf RowF 3 <<< EmitB) clauses.implied
        <> [ instOf RowF 7 (EmitAdm { callee, slots: inst.all }) ]
        <> splitSite inst.rows
    , markers: markersAt InstOrigin span (parameters.marks <> result.marks)
    , slots: read
    }
  where
  callee = CalleeFunction function
  splitSite rows =
    if Array.null rows then []
    else [ instOf RowH 2 (EmitSplit { callee, slots: rows }) ]
  instOf group number entry = tagged entry group number InstOrigin span

-- E4's entries (origin inst): `disjoint` per joined pair of the
-- constructor (F8; reading 8: not the fields' implied `lacks`).
ctorInstance
  ∷ ∀ s. Context s → Path → Span → CtorId → RuleId → Gen s (Called s)
ctorInstance context path span ctor rule = do
  shape ← lifted (ctorShape context.tables ctor)
  inst ← instances path rule span shape.sorts
  fields ← lifted (translateAll context.tables inst.naming shape.fields)
  owner ← lifted (translate context.tables inst.naming shape.owner)
  pairs ← lifted (traverse (pairOf inst.naming) shape.joined)
  read ← slots path inst.slots
  pure
    { parameters: fields.tys
    , result: owner.ty
    , entries: map joinedPair pairs
    , markers: markersAt InstOrigin span (fields.marks <> owner.marks)
    , slots: read
    }
  where
  pairOf naming { variables: Tuple one other } =
    GenDisjoint <$> named naming one <*> named naming other
  joinedPair atom = tagged (EmitB atom) RowF 8 InstOrigin span
