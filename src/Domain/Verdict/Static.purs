-- Classes a and b′ (T-R0a §3.2): a static rule or a language policy
-- was broken. Not verdicts; reported beside the recorded problem.
-- Domain.Verdict re-exports these types; they live here so that
-- Domain.Verdict stays under the file budget (Task 2.3 ruling (a)).
module Domain.Verdict.Static
  ( PolicyCode(..)
  , Site
  , StaticCode(..)
  , StaticRefusal(..)
  ) where

import Domain.Recorded (Path)

-- The codes are over today's `Problem` constructors (ruling R5); which
-- raise site gives which is Features.Check.Generate.Static (Task 2.3),
-- and which `Problem` is raised where, Generate.Static.Problem (3.2).
data StaticRefusal
  = StaticRule StaticCode Site
  | Policy PolicyCode Site

-- Class a: the refusal reads written text and declarations only. The
-- last four are raised in Resolve alone (Task 3.2): names not bound or
-- bound twice, a name that cannot be called, and a variable or type
-- argument of the wrong sort.
data StaticCode
  = StaticArity
  | StaticEntry
  | StaticFieldArity
  | StaticFunctionNeedsCall
  | StaticTypeArguments
  | StaticHandlerMissing
  | StaticHandlerDuplicate
  | StaticHandlerOperation
  | StaticFailNeedsConcrete
  | StaticNofailOnFail
  | StaticMarkVariable
  | StaticUnbound
  | StaticDuplicate
  | StaticNotCallable
  | StaticSort

-- Class b′: a language policy (R005 Tranche B, D8 and D9).
data PolicyCode = PolicySameDisjoint | PolicyRepeatedTail

-- A node's path (T-R0b §6).
type Site = Path
