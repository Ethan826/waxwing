-- R0 generation (T-R0b §1, §10): one declaration's recorded problem,
-- built syntax-directed from the resolved declaration, the tables and
-- the signatures it references. Total and deterministic; it reads no
-- checker state and branches on no solved shape (§4's applicative
-- invariant: Generate.Context holds everything a rule reads, and the
-- import rule in test/r0-generate-signature.test.mjs keeps every
-- checker module out of reach). Test-only in this tranche: compile does
-- not call it (ruling R6). The export list is an enumerated allowlist
-- with no production empty problem (ruling R2; Task 0.3 NB3), plus the
-- generation fault and its `Problem`.
module Features.Check.Generate
  ( module Exports
  , generate
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple (Tuple(..))
import Data.Set as Set
import Domain.Recorded.Atom (Holders, Quant(..), Var, VarInfo, VarSort(..))
import Domain.Recorded.Internal (RecordedProblem(..))
import Domain.Recorded.Origin (Path(..), PathRoot(..))
import Domain.Resolved (FunctionDecl, exprSpan)
import Domain.Type (TypeId(..))
import Features.Check.Functional (functional)
import Features.Check.Generate.Expr (expr)
import Features.Check.Generate.Inputs (Signatures, Tables)
import Features.Check.Generate.Inputs (Signatures, Tables) as Exports
import Features.Check.Generate.Fault
  ( GenerationFault
  , generationProblem
  ) as Exports
import Features.Check.Generate.Fault (GenerationFault)
import Features.Check.Generate.Out (Out, concatOut)
import Features.Check.Generate.Signature (declaration, parameterLocals)
import Features.Check.Generate.Static.Rules (staticRules) as Exports

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

problemOf ∷ Tables → FunctionDecl → Out → RecordedProblem
problemOf tables function out = RecordedProblem
  { decl: function.id
  , rigidTy: keys rigidType
  , rigidRow: keys rigidRow
  , flexTy: keys flexType
  , flexRow: keys flexRow
  , d: out.d
  , q: []
  , b: out.b
  , bq: out.bq
  , outside: out.outside
  , adm: out.adm
  , split: out.split
  , vars
  , types: Map.fromFoldable out.types
  , holders: holdersOf tables
  }
  where
  vars = Map.fromFoldable out.vars
  keys wanted = Array.mapMaybe (keyOf wanted)
    (Map.toUnfoldable vars ∷ Array (Tuple Var VarInfo))
  keyOf wanted (Tuple var info) =
    if wanted info then Just var else Nothing
  rigidType info = rigid info && info.sort == SortType
  rigidRow info = rigid info && info.sort == SortRow
  flexType info = not (rigid info) && info.sort == SortType
  flexRow info = not (rigid info) && info.sort == SortRow
  rigid info = case info.quant of
    Forall _ → true
    Exists → false

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
