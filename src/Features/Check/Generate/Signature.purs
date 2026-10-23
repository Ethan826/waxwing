-- T-R0b §3.1: the declaration's rules. `D` (Sig4-Sig8) is computed from
-- the signature, never from the body; Sig3 relates the body's type to
-- the written result; Sig10 records `main`'s printability [VOR]. Paths
-- (§6; docs/findings.md "RT1's translator", reading 2): a constraint at
-- `constraints/i`, a parameter at `parameters/i`, a rigid variable at
-- `parameters/variables/i`, the result at `result`, the effect row's
-- label arguments at `result/row`, a joined pair at `joined/i`.
module Features.Check.Generate.Signature
  ( calleeClauses
  , declaration
  , isEntry
  , parameterLocals
  ) where

import Prelude
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (fromMaybe)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Atom (Atom(..), RTExpr, ReqAtom(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path(..)
  , PathRoot(..)
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (FunctionDecl, LocalId(..), Ty, VarId)
import Domain.Resolved as Resolved
import Domain.Syntax (Span)
import Domain.Type.Parts (rowArguments)
import Features.Check.Generate.Facts (impliedOf, signatureTypes)
import Features.Check.Generate.Fresh (Naming, rigidNaming)
import Features.Check.Generate.Inputs (Signature, Tables)
import Features.Check.Generate.Out
  ( Item(..)
  , Listed
  , Out
  , concatOut
  , emit
  , listed
  , markersAt
  )
import Features.Check.Generate.Rigid (rigidVariables)
import Features.Check.Generate.Translate (translate)

-- Where a signature rule emits: the declaration and a path.
type Place = { decl ∷ Resolved.FunctionId, path ∷ Path }

-- `main` is the entry, as Resolve decides it (Resolve/Entry.purs
-- `isEntry`): the one function of that name.
isEntry ∷ FunctionDecl → Boolean
isEntry function = function.name == "main"

-- Sig2: `Γ₀(LocalId i) = ⟦T_i⟧ν_f` (Check/Function.purs `parameterLocal`).
parameterLocals ∷ Tables → FunctionDecl → Map LocalId RTExpr
parameterLocals tables function = Map.fromFoldable
  (Array.mapWithIndex local function.parameters)
  where
  local index parameter = Tuple (LocalId index)
    (translate tables rigidNaming parameter.ty).ty

-- Sig1, Sig3-Sig10, given the body's type `τ_b` and span (Sig3).
declaration ∷ Tables → FunctionDecl → RTExpr → Span → Out
declaration tables function body bodySpan = concatOut
  ( [ rigidVariables function ]
      <> Array.mapWithIndex constraintAt function.constraints
      <> Array.mapWithIndex parameterAt function.parameters
      <>
        [ ownType tables (place InResult []) function.span function.result
        , rowFacts tables (place InResult [ Named "row" ])
            (fromMaybe function.span function.rowSpan)
            (rowArguments function.row)
        ]
      <> Array.mapWithIndex joinedAt function.joined
      <> [ entryAt, bodyAt ]
  )
  where
  place root more = { decl: function.id, path: Path { root, steps: more } }
  constraintAt index = constraint (place InConstraints [ Index index ])
  parameterAt index parameter = ownType tables
    (place InParameters [ Index index ])
    parameter.span
    parameter.ty
  joinedAt index pair = sigAt (place InJoined [ Index index ]) 7
    [ listed (ToD (pairAtom rigidNaming pair)) RowA 4 Types pair.span ]
  written ty = (translate tables rigidNaming ty).ty
  entryAt
    | isEntry function = sigAt (place InResult []) 10
        [ listed (ToBQ (Printable (written function.result))) RowC 5
            Contract
            function.span
        ]
    | otherwise = concatOut []
  bodyAt = sigAt (place InBody []) 3
    [ listed (ToB (Equal body (written function.result))) RowB 1 Body
        bodySpan
    ]

-- θ(D_g) for E3 and E5: a callee's clauses under the occurrence's
-- naming, written (constraints in order) then implied (Sig6's facts,
-- Sig7's pairs, Sig8's facts).
calleeClauses
  ∷ Tables
  → Naming
  → Signature
  → { written ∷ Array Atom, implied ∷ Array Atom }
calleeClauses tables naming callee =
  { written: Array.concatMap (requirementAtoms naming) callee.constraints
  , implied: Array.concatMap _.beside found
      <> map (pairAtom naming) callee.joined
      <> Array.concatMap _.passed found
  }
  where
  found = map (impliedOf tables naming) (signatureTypes callee)

sigAt ∷ Place → Int → Array Listed → Out
sigAt place rule = emit
  { decl: place.decl, path: place.path, rule: SigRule rule }

-- Sig4 per label (the label's span), Sig5 per pair (contract).
constraint ∷ Place → Resolved.Requirement → Out
constraint place = case _ of
  Resolved.Lacks clause → sigAt place 4
    ( map (lacked clause.variable)
        clause.labels
    )
  Resolved.Disjoint clause → sigAt place 5
    [ listed (ToD (pairAtom rigidNaming clause)) RowA 2 Contract
        clause.span
    ]
  where
  lacked variable label = listed
    ( ToD
        ( Lacks (rigidNaming variable)
            label.name
        )
    )
    RowA
    1
    Contract
    label.span

-- Sig6 (record labels, A3), then Sig8 (declared types' clauses, A5, and
-- §2.2's markers) for one of `f`'s parameter or result types.
ownType ∷ Tables → Place → Span → Ty VarId → Out
ownType tables place span ty = concatOut
  [ sigAt place 6 (map (lacksEntry RowA 3 span) found.beside)
  , sigAt place 8
      ( map (lacksEntry RowA 5 span) found.passed
          <> markersAt Types span (translate tables rigidNaming ty).marks
      )
  ]
  where
  found = impliedOf tables rigidNaming ty

-- Sig6 and Sig8 over the effect row's label arguments (no markers: the
-- row is erased, so nothing there is translated).
rowFacts ∷ Tables → Place → Span → Array (Ty VarId) → Out
rowFacts tables place span types = concatOut
  [ sigAt place 6
      ( map (lacksEntry RowA 3 span)
          (Array.concatMap _.beside found)
      )
  , sigAt place 8
      ( map (lacksEntry RowA 5 span)
          (Array.concatMap _.passed found)
      )
  ]
  where
  found = map (impliedOf tables rigidNaming) types

lacksEntry ∷ RowGroup → Int → Span → Atom → Listed
lacksEntry group number span atom = listed (ToD atom) group number Types
  span

requirementAtoms ∷ Naming → Resolved.Requirement → Array Atom
requirementAtoms naming = case _ of
  Resolved.Lacks clause → map (lacking clause.variable) clause.labels
  Resolved.Disjoint clause → [ pairAtom naming clause ]
  where
  lacking variable label = Lacks (naming variable) label.name

pairAtom ∷ ∀ r. Naming → { variables ∷ Tuple VarId VarId | r } → Atom
pairAtom naming { variables: Tuple one other } =
  Disjoint (naming one) (naming other)
