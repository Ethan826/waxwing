-- R0 generation (T-R0b §1, §10): one declaration's recorded problem,
-- built syntax-directed from the resolved declaration, the tables and
-- the signatures it references. Total and deterministic; it reads no
-- checker state and branches on no solved shape (§4's applicative
-- invariant: Generate.Context holds everything a rule reads, and the
-- import rule in test/r0-generate-signature.test.mjs keeps every
-- checker module out of reach). Test-only in this tranche: compile does
-- not call it (ruling R6). The export list is an enumerated allowlist
-- with no production empty problem (ruling R2; Task 0.3 NB3), plus the
-- generation fault and its `Problem`. Since Task 7.1a every other
-- Generate.* module is importable by Generate* only (D1 spec §3.1 rule
-- E3), so the inputs, the fault's `Problem` and the static rules are
-- definitions here, not re-exports (rule E6), and the types are
-- re-exported by name; scripts/structure-elab.mjs pins the list.
module Features.Check.Generate
  ( module Exports
  , generate
  , generationInputs
  , generationProblem
  , staticRules
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Set as Set
import Domain.Recorded.Atom (Holders)
import Domain.Recorded.Internal (RecordedProblem)
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (FunctionDecl, exprSpan)
import Domain.Type (TypeId(..))
import Features.Check.Functional (functional)
import Features.Check.Generate.Assemble (assemble)
import Features.Check.Generate.Expr (expr)
import Domain.Problem (Problem)
import Domain.Resolved as Resolved
import Domain.Verdict.Static (StaticRefusal)
import Features.Check.Generate.Inputs (Inputs, Signatures, Tables)
import Features.Check.Generate.Inputs
  ( Inputs
  , Signatures
  , Tables
  ) as Exports
import Features.Check.Generate.Inputs as Inputs
import Features.Check.Generate.Fault (GenerationFault) as Exports
import Features.Check.Generate.Fault (GenerationFault)
import Features.Check.Generate.Fault as Fault
import Features.Check.Generate.Out (Out, concatOut)
import Features.Check.Generate.Signature (declaration, parameterLocals)
import Features.Check.Generate.Static.Rules as Static

-- Amendment (Task 3.2 fix round 1, controller ruling): the result is
-- `Either GenerationFault`: an id the inputs lack, or input not of the
-- shape Resolve guarantees, stops generation (Generate.Fault), mapped by
-- `generationProblem` to `Internal TableLookup` or `InputShape`.
generate
  ∷ Tables → Signatures → FunctionDecl → Either GenerationFault RecordedProblem
generate tables signatures function = do
  locals ← parameterLocals tables function
  body ← expr (context locals) (Path { root: InBody, steps: [] })
    function.body
  signature ← declaration tables function body.ty (exprSpan function.body)
  pure (problemOf tables function (concatOut [ signature, body.out ]))
  where
  context locals = { decl: function.id, tables, signatures, locals }

generationInputs ∷ Resolved.Program → Inputs
generationInputs = Inputs.generationInputs

generationProblem ∷ GenerationFault → Problem
generationProblem = Fault.generationProblem

staticRules
  ∷ Tables
  → Signatures
  → FunctionDecl
  → Either GenerationFault (Array StaticRefusal)
staticRules = Static.staticRules

problemOf ∷ Tables → FunctionDecl → Out → RecordedProblem
problemOf tables function =
  assemble { decl: function.id, holders: holdersOf tables }

-- Ruling K-a: every declared type of the program, and the complete set
-- of those whose constructors hold a function (Features.Check.Functional,
-- the set today's printability and comparability checks read). The
-- source-to-problem obligation is that this is the program's own set:
-- test/r0-holders.test.mjs checks direct and transitive containment,
-- and RT1's translator is a separate algorithm by the same author.
holdersOf ∷ Tables → Holders
holdersOf tables =
  { declared: Set.fromFoldable (Array.mapWithIndex declared tables.types)
  , holding: functional tables.ctors
  }
  where
  declared index _ = TypeId index
