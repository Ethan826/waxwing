-- trusted surface: every diff needs token review; see docs/engineering.md
-- T-R0b §3.1: the declaration's rules. `D` (Sig4-Sig8) is computed from
-- the signature, never from the body; Sig3 relates the body's type to
-- the written result; Sig10 records `main`'s printability [VOR]. Paths
-- (§6; docs/findings.md "RT1's translator", reading 2): a constraint at
-- `constraints/i`, a parameter at `parameters/i`, a rigid variable at
-- `parameters/variables/i`, the result at `result`, the effect row's
-- label arguments at `result/row`, a joined pair at `joined/i`. Over
-- D1's generator types (spec §3.3; R0 Task 7.1b): Sig1 writes the rigid
-- variables at once, and the entries are returned unwritten, so that
-- they precede the body's, as in Task 3.2's problem.
module Features.Check.Generate.Signature
  ( calleeClauses
  , declaration
  , isEntry
  , parameterLocals
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either, note)
import Data.Foldable (sequence_, traverse_)
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe)
import Data.Traversable (sequence, traverse)
import Data.Tuple (Tuple(..))
import Domain.Recorded.Origin
  ( OriginKind(..)
  , Path(..)
  , PathRoot(..)
  , RowGroup(..)
  , RuleId(..)
  , Step(..)
  )
import Domain.Resolved (FunctionDecl, LocalId(..), Ty, VarId(..))
import Domain.Resolved as Resolved
import Domain.Syntax (Sort(..), Span, typeRefSpan)
import Domain.Type.Parts (rowArguments)
import Features.Check.Generate.Elab (GenTy, Ref(..))
import Features.Check.Generate.Facts (impliedOf, signatureTypes)
import Features.Check.Generate.Fault (GenerationFault(..))
import Features.Check.Generate.Fresh (sortVar)
import Features.Check.Generate.Gen
  ( Gen
  , GenAtom(..)
  , GenEntry(..)
  , GenReq(..)
  , Tagged
  , effected
  , emit
  , lifted
  , rigid
  )
import Features.Check.Generate.Context (Local)
import Features.Check.Generate.Inputs (Signature, Tables)
import Features.Check.Generate.Marked (MarkNaming(..), marked)
import Features.Check.Generate.Node (markersAt, tagged)
import Features.Check.Generate.Out (EffectItem(..))
import Features.Check.Generate.Translate (Naming(..), named, translate)

-- Where a signature rule emits: the declaration and a path.
type Place = { decl ∷ Resolved.FunctionId, path ∷ Path }

type Fallible = Either GenerationFault

-- `main` is the entry, as Resolve decides it (Resolve/Entry.purs
-- `isEntry`): the one function of that name.
isEntry ∷ FunctionDecl → Boolean
isEntry function = function.name == "main"

-- Sig2: `Γ₀(LocalId i) = ⟦T_i⟧ν_f` (Check/Function.purs `parameterLocal`),
-- with its marked type as declared (Generate.Marked `Declared`).
parameterLocals ∷ ∀ s. Tables → FunctionDecl → Fallible (Map LocalId (Local s))
parameterLocals tables function = Map.fromFoldable
  <$> sequence (Array.mapWithIndex local function.parameters)
  where
  local index parameter = Tuple (LocalId index)
    <$>
      ( paired <$> translate tables Rigidly parameter.ty
          <*> marked tables Declared parameter.ty
      )
  paired translated markedType = { ty: translated.ty, marked: markedType }

-- Sig1, written now; Sig3-Sig10, returned, given the body's type `τ_b`
-- and span (Sig3). An entry at `result` has the written result type's
-- span (T-R0b §6, "the node's"): `syntax` holds the parameters' types,
-- then the result's.
declaration
  ∷ ∀ s. Tables → FunctionDecl → GenTy s → Span → Gen s (Gen s Unit)
declaration tables function body bodySpan = do
  resultSpan ← lifted
    ( note ResultShape
        ( typeRefSpan <$> Array.index function.syntax
            (Array.length function.parameters)
        )
    )
  traverse_ rigid (Array.catMaybes (Array.mapWithIndex rigidAt function.sorts))
  effected (rigidEffects function)
  lifted (declared resultSpan)
  where
  declared resultSpan = ado
    parameters ← sequence (Array.mapWithIndex parameterAt function.parameters)
    result ← ownType tables (place InResult []) resultSpan function.result
    row ← rowFacts tables (place InResult [ Named "row" ])
      (fromMaybe function.span function.rowSpan)
      (rowArguments function.row)
    written ← translate tables Rigidly function.result
    in
      sequence_
        ( Array.mapWithIndex constraintAt function.constraints
            <> parameters
            <> [ result, row ]
            <> Array.mapWithIndex joinedAt function.joined
            <> [ entryAt resultSpan written.ty, bodyAt written.ty ]
        )
  place root more = { decl: function.id, path: Path { root, steps: more } }
  rigidAt index sort = map (rigidOf index) (sortVar sort)
  rigidOf index sort =
    { variable: VarId index
    , sort
    , path: Path
        { root: InParameters, steps: [ Named "variables", Index index ] }
    , rule: SigRule 1
    , span: function.span
    }
  constraintAt index = constraint (place InConstraints [ Index index ])
  parameterAt index parameter = ownType tables
    (place InParameters [ Index index ])
    parameter.span
    parameter.ty
  joinedAt index pair = sigAt (place InJoined [ Index index ]) 7
    [ tagged (EmitD (pairAtom RigidRef pair)) RowA 4 Types pair.span ]
  entryAt span written
    | isEntry function = sigAt (place InResult []) 10
        [ tagged (EmitBQ (GenPrintable written)) RowC 5 Contract span ]
    | otherwise = pure unit
  bodyAt written = sigAt (place InBody []) 3
    [ tagged (EmitB (GenEqual body written)) RowB 1 Body bodySpan ]

-- The declaration's rigid marks (its `nofail(k)` names) and effect-row
-- variables, once each (a-min §10 `rigidMarks`, `effectRigids`).
rigidEffects ∷ FunctionDecl → Array EffectItem
rigidEffects function = map RigidMark (Array.nub function.markVariables)
  <> Array.catMaybes (Array.mapWithIndex effectRow function.sorts)
  where
  effectRow index = case _ of
    RowSort → Just (EffectRigid (VarId index))
    _ → Nothing

-- θ(D_g) for E3 and E5: a callee's clauses under the occurrence's
-- naming, written (constraints in order) then implied (Sig6's facts,
-- Sig7's pairs, Sig8's facts).
calleeClauses
  ∷ ∀ s
  . Tables
  → Naming s
  → Signature
  → Fallible { written ∷ Array (GenAtom s), implied ∷ Array (GenAtom s) }
calleeClauses tables naming callee = clauses
  <$> traverse (impliedOf tables naming) (signatureTypes callee)
  <*> traverse (requirementAtoms naming) callee.constraints
  <*> traverse (namedPair naming) callee.joined
  where
  clauses found written pairs =
    { written: Array.concat written
    , implied: Array.concatMap _.beside found
        <> pairs
        <> Array.concatMap _.passed found
    }

sigAt ∷ ∀ s. Place → Int → Array (Tagged s) → Gen s Unit
sigAt place rule = emit
  { decl: place.decl, path: place.path, rule: SigRule rule }

-- Sig4 per label (the label's span), Sig5 per pair (contract).
constraint ∷ ∀ s. Place → Resolved.Requirement → Gen s Unit
constraint place = case _ of
  Resolved.Lacks clause → sigAt place 4
    (map (lacked clause.variable) clause.labels)
  Resolved.Disjoint clause → sigAt place 5
    [ tagged (EmitD (pairAtom RigidRef clause)) RowA 2 Contract
        clause.span
    ]
  where
  lacked variable label = tagged
    (EmitD (GenLacks (RigidRef variable) label.name))
    RowA
    1
    Contract
    label.span

-- Sig6 (record labels, A3), then Sig8 (declared types' clauses, A5, and
-- §2.2's markers) for one of `f`'s parameter or result types.
ownType ∷ ∀ s. Tables → Place → Span → Ty VarId → Fallible (Gen s Unit)
ownType tables place span ty = owned <$> impliedOf tables Rigidly ty
  <*> translate tables Rigidly ty
  where
  owned found translated = do
    sigAt place 6 (map (lacksEntry span) found.beside)
    sigAt place 8
      ( map (passedEntry span) found.passed
          <> markersAt Types span translated.marks
      )

-- Sig6 and Sig8 over the effect row's label arguments (no markers: the
-- row is erased, so nothing there is translated).
rowFacts
  ∷ ∀ s. Tables → Place → Span → Array (Ty VarId) → Fallible (Gen s Unit)
rowFacts tables place span types = rowOut
  <$> traverse (impliedOf tables Rigidly) types
  where
  rowOut found = do
    sigAt place 6 (map (lacksEntry span) (Array.concatMap _.beside found))
    sigAt place 8 (map (passedEntry span) (Array.concatMap _.passed found))

lacksEntry ∷ ∀ s. Span → GenAtom s → Tagged s
lacksEntry span atom = tagged (EmitD atom) RowA 3 Types span

passedEntry ∷ ∀ s. Span → GenAtom s → Tagged s
passedEntry span atom = tagged (EmitD atom) RowA 5 Types span

requirementAtoms
  ∷ ∀ s. Naming s → Resolved.Requirement → Fallible (Array (GenAtom s))
requirementAtoms naming = case _ of
  Resolved.Lacks clause → lacking clause.labels <$> named naming clause.variable
  Resolved.Disjoint clause → pure <$> namedPair naming clause
  where
  lacking labels ref = map (GenLacks ref <<< _.name) labels

namedPair
  ∷ ∀ s r
  . Naming s
  → { variables ∷ Tuple VarId VarId | r }
  → Fallible (GenAtom s)
namedPair naming { variables: Tuple one other } =
  GenDisjoint <$> named naming one <*> named naming other

pairAtom
  ∷ ∀ s r. (VarId → Ref s) → { variables ∷ Tuple VarId VarId | r } → GenAtom s
pairAtom naming { variables: Tuple one other } =
  GenDisjoint (naming one) (naming other)
