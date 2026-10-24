-- The CX refuter (T-R0a §5.1; plan Task 5.2): `cxSpec` pairs the
-- untrusted single-label search (Counter/Search.purs) with the check
-- that decides `CXChecked (withBody (toSig P) body) rho` and mints
-- nothing (Counter/Check.purs). Its soundness obligation, `cxStatement`,
-- is CX-KP with CX-PR (refute/statements.md §4, §4.1): stated, not
-- proved, so no `TheoremRef` exists and the refuter runs only as
-- `shadowRefuter cxStatement cxSpec` (§18.69 Q10), in the shadow
-- assembly (Features.Check.Decide.Shadow), never in Program.Compile
-- (ruling R6).
module Features.Check.Refute.Counter
  ( cxSpec
  , cxStatement
  ) where

import Domain.Verdict (RefuterName(..), StatementRef(..))
import Features.Check.Refute.Counter.Check (checkCX)
import Features.Check.Refute.Counter.Search (searchCX)
import Features.Check.Refute.Rules (RefuterSpec)

cxSpec ∷ RefuterSpec
cxSpec = { name: RefuterName "CX", search: searchCX, check: checkCX }

cxStatement ∷ StatementRef
cxStatement = StatementRef "CX-KP + CX-PR"
