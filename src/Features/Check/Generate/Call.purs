-- T-R0b §3.2, E3-E6: references to and calls of functions and
-- constructors. Each occurrence instantiates the callee's or owner's
-- variables as `⟨p, inst i⟩` (θ), so two occurrences share none
-- (G-fresh). The declared count `n` comes from the signature, so the
-- over-application case is syntactic (§4). Index order (docs/findings.md
-- "RT1's translator", reading 4): the rule's listed entries, then the
-- markers of the types it translated (T₁ … Tₙ, then the result).
module Features.Check.Generate.Call
  ( call
  , construct
  , ctorRef
  , functionRef
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..), fst)
import Domain.Recorded.Atom
  ( Atom(..)
  , Callee(..)
  , RTExpr(..)
  , Var
  , VarInfo
  , VarSort(..)
  )
import Domain.Recorded.Origin (OriginKind(..), Path, RowGroup(..), RuleId(..))
import Domain.Resolved (CtorId, Expr, FunctionId)
import Domain.Syntax (Span)
import Features.Check.Generate.Context (Context, Recur, at)
import Features.Check.Generate.Fresh (childAt, instNaming, instVars, nodeRes)
import Features.Check.Generate.Lookup (calleeOf, ctorShape)
import Features.Check.Generate.Out
  ( Generated
  , Item(..)
  , Listed
  , concatOut
  , emit
  , listed
  , markersAt
  , varsOut
  )
import Features.Check.Generate.Signature (calleeClauses)
import Features.Check.Generate.Translate (arrowOf, translate, translateAll)

-- An instantiated callee or constructor: its parameter (or field) types
-- and result under θ, its listed entries and variables, and the markers
-- of those types.
type Instance =
  { parameters ∷ Array RTExpr
  , result ∷ RTExpr
  , entries ∷ Array Listed
  , vars ∷ Array (Tuple Var VarInfo)
  , markers ∷ Array Listed
  }

type Node = { path ∷ Path, span ∷ Span, rule ∷ RuleId, label ∷ String }

-- E3: `θ(⟦T₁ → … → R⟧)`.
functionRef ∷ Context → Path → Span → FunctionId → Generated
functionRef context path span function = referenced context path
  (ExprRule 3)
  (functionInstance context path span function (ExprRule 3))

-- E4: `θ(⟦fields → owner(args)⟧)`.
ctorRef ∷ Context → Path → Span → CtorId → Generated
ctorRef context path span ctor = referenced context path (ExprRule 4)
  (ctorInstance context path span ctor (ExprRule 4))

-- E5: `g(e₁ … e_k)` against `g`'s `n` parameters.
call ∷ Recur → Context → Path → Span → FunctionId → Array Expr → Generated
call recur context path span function = applied recur context
  { path, span, rule: ExprRule 5, label: "Call" }
  (functionInstance context path span function (ExprRule 5))

-- E6: as E5, with the constructor's fields and owner.
construct ∷ Recur → Context → Path → Span → CtorId → Array Expr → Generated
construct recur context path span ctor = applied recur context
  { path, span, rule: ExprRule 6, label: "Construct" }
  (ctorInstance context path span ctor (ExprRule 6))

referenced ∷ Context → Path → RuleId → Instance → Generated
referenced context path rule found =
  { ty: arrowOf found.parameters found.result
  , out: concatOut
      [ varsOut found.vars
      , emit (at context path rule) (found.entries <> found.markers)
      ]
  }

-- E5/E6's arguments, each at `Call/args/i` (`Construct/args/i`):
-- `eq τ_{e_i} θ(T_i)` for `i ≤ min(k, n)` (F1); with `k > n`, `⟨p, res⟩`
-- and `eq θ(R) (τ_{e_{n+1}} → … → ⟨p, res⟩)` (B1). Every argument is
-- generated, whatever the count (G-dead).
applied ∷ Recur → Context → Node → Instance → Array Expr → Generated
applied recur context node found arguments =
  { ty: if overApplied then res else partial
  , out: concatOut
      ( [ varsOut (found.vars <> if overApplied then [ resVar ] else [])
        , emit (at context node.path node.rule)
            (found.entries <> equations <> over <> found.markers)
        ]
          <> map _.out generated
      )
  }
  where
  generated = Array.mapWithIndex argument arguments
  argument index = recur context (childAt node.path node.label "args" index)
  count = Array.length found.parameters
  overApplied = Array.length arguments > count
  resVar = nodeRes node.path node.rule node.span
  res = TVar (fst resVar)
  partial = arrowOf (Array.drop (Array.length arguments) found.parameters)
    found.result
  equations = Array.zipWith equation generated found.parameters
  equation given declared = body RowF 1 (Equal given.ty declared)
  over =
    if overApplied then
      [ body RowB 1 (Equal found.result (arrowOf rest res)) ]
    else []
  rest = map _.ty (Array.drop count generated)
  body group number atom = listed (ToB atom) group number Body node.span

-- E3's entries (origin inst): θ(D_g) written (F2) and implied (F3), the
-- `adm` site of every reference (F7, every `inst` slot) and a `split`
-- site when `g` has a record-row variable (H2, those slots).
functionInstance
  ∷ Context → Path → Span → FunctionId → RuleId → Instance
functionInstance context path span function rule =
  { parameters: parameters.tys
  , result: result.ty
  , entries: map (inst RowF 2 <<< ToB) clauses.written
      <> map (inst RowF 3 <<< ToB) clauses.implied
      <> [ inst RowF 7 (ToAdm { callee, slots: map fst vars }) ]
      <> splitSite
  , vars
  , markers: markersAt InstOrigin span (parameters.marks <> result.marks)
  }
  where
  callee = CalleeFunction function
  signature = calleeOf context.signatures function
  naming = instNaming path
  vars = instVars path rule span signature.sorts
  parameters = translateAll context.tables naming signature.parameters
  result = translate context.tables naming signature.result
  clauses = calleeClauses context.tables naming signature
  rows = Array.mapMaybe rowSlot vars
  rowSlot (Tuple var info) =
    if info.sort == SortRow then Just var else Nothing
  splitSite =
    if Array.null rows then []
    else [ inst RowH 2 (ToSplit { callee, slots: rows }) ]
  inst group number item = listed item group number InstOrigin span

-- E4's entries (origin inst): `disjoint` per joined pair of the
-- constructor (F8; reading 8: not the fields' implied `lacks`).
ctorInstance ∷ Context → Path → Span → CtorId → RuleId → Instance
ctorInstance context path span ctor rule =
  { parameters: fields.tys
  , result: owner.ty
  , entries: map joinedPair shape.joined
  , vars: instVars path rule span shape.sorts
  , markers: markersAt InstOrigin span (fields.marks <> owner.marks)
  }
  where
  shape = ctorShape context.tables ctor
  naming = instNaming path
  fields = translateAll context.tables naming shape.fields
  owner = translate context.tables naming shape.owner
  joinedPair { variables: Tuple one other } = listed
    (ToB (Disjoint (naming one) (naming other)))
    RowF
    8
    InstOrigin
    span
