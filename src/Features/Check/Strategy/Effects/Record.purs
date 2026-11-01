-- trusted surface: every diff needs token review; see docs/engineering.md
-- Record validation, A2's step 0 (spec §4.1, rulings A4, A5): facts of
-- the recorded problem alone, checked before search and before any
-- package is read. `recordDefect` visits the record's entries in spec §5
-- item 1's order (obligations as recorded, then `instances`,
-- `annotations`, `nodes`, `ambient`, `signature`, keys in `Ord` order,
-- then the declared arities, then the domain coverage) and gives the
-- first entry that violates a check, with the index of its first
-- violated check:
--   0  a `Consume`'s `marks`/`bare` differ from the site table (spec §9);
--   1  a reference outside its permitted domain at its sort: type and
--      record-row variables in `vars` at their position's sort, effect
--      variables rigid (`effectRigids`) or recorded (`flexEff`, the
--      record-owned forced tails F among them), positions, rigid marks;
--      for the coverage entry, a `flexEff` member or position nothing
--      references;
--   2  a forced tail v in F outside spec §2.3's placement: v may be only
--      the clause-row tail of its instance's result and of exact copies
--      of that result type, or the tail of an `AtInstalledC` source that
--      is an exact copy of that clause row; or any `⟨q, result clauses⟩`
--      that is not in F, wherever it occurs (a ResultC at another path,
--      or one whose R is closed, which Effects.Forced omits; controller
--      ruling, Task 3);
--   3  a `Fail` payload that is a flexible variable with no
--      `FailConcrete` on it, a declared rigid or unknown variable, an
--      arrow, a handler, or a record with a tail;
--   5  an effect label or data type the recorded arities lack or count
--      otherwise, judged only when the arities are valid; for the
--      `InDeclarations` entry, invalid arities (Effects.RecordArity;
--      dossier §18.148 (1)).
-- These are spec §4.1's bullets in order. A defect in a table entry
-- or in the coverage is reported as `InRecord`, naming the table.
-- A recorded `AtDeferredRow` is no defect for lacking coverage (A4); its
-- flags are checked as any site's. Total: every input gives an answer.
module Features.Check.Strategy.Effects.Record
  ( recordDefect
  , siteFlags
  ) where

import Prelude
import Data.Array (any, findIndex, findMap, mapMaybe, null)
import Data.Foldable (all, foldMap)
import Data.Map (Map, lookup)
import Data.Maybe (Maybe(..), maybe, maybe')
import Data.Set (Set, fromFoldable, member, subset)
import Domain.Recorded (RecordedProblem, fields)
import Domain.Recorded.Atom (Var, VarInfo, VarSort(..))
import Domain.Recorded.Effect
  ( ERole(..)
  , EVar(..)
  , MTy(..)
  , Obligation(..)
  , Position
  , SiteKind(..)
  )
import Domain.Resolved (FunctionId)
import Domain.Type (VarId)
import Domain.Verdict.Search (CheckAt)
import Features.Check.Strategy.Effects.Forced (forcedTails)
import Features.Check.Strategy.Effects.RecordEntries
  ( Entry
  , coverageAt
  , entriesOf
  )
import Features.Check.Strategy.Effects.RecordArity
  ( applicationsWrong
  , declarationsDefect
  , validArities
  )
import Features.Check.Strategy.Effects.RecordRefs (Refs)
import Domain.Recorded.Arity (Declarations)

-- The record's domains (spec §4.1), the forced tails F and the flexible
-- variables a `FailConcrete` names.
type Scope =
  { vars ∷ Map Var VarInfo
  , effectRigids ∷ Set VarId
  , flexEff ∷ Set EVar
  , positions ∷ Set Position
  , rigidMarks ∷ Set String
  , flexTy ∷ Set Var
  , forced ∷ Set EVar
  , concrete ∷ Set Var
  , arities ∷ Maybe Declarations
  }

-- The site table, spec §9. No wildcard: a new site fails to compile.
siteFlags ∷ SiteKind → { marks ∷ Boolean, bare ∷ Boolean }
siteFlags = case _ of
  AtCall → consumed
  AtPerform → consumed
  AtApply → consumed
  AtPipe → consumed
  AtStage _ → consumed
  AtCallback → consumed
  AtFail → consumed
  AtDefer → consumed
  AtDeferredRow → consumed
  ClauseIntoR _ → { marks: false, bare: false }
  InstallR → { marks: false, bare: false }
  ClauseIntoC _ → { marks: true, bare: true }
  AtInstalledC → { marks: true, bare: true }
  where
  consumed = { marks: true, bare: false }

recordDefect ∷ RecordedProblem → Maybe CheckAt
recordDefect problem =
  maybe' declared Just (findMap (defectAt scope) entries)
  where
  declared _ = maybe' coverage Just (declarationsDefect problem)
  recorded = fields problem
  scope = scopeOf problem
  entries = entriesOf problem
  coverage _ = uncovered recorded.decl scope entries

flagsWrong ∷ { site ∷ SiteKind, marks ∷ Boolean, bare ∷ Boolean } → Boolean
flagsWrong consume =
  siteFlags consume.site /= { marks: consume.marks, bare: consume.bare }

-- Checks 0-5 in order; the first violated one's index.
defectAt ∷ Scope → Entry → Maybe CheckAt
defectAt scope entry = map at (findIndex identity checks)
  where
  at check = { provenance: entry.provenance, check }
  checks =
    [ maybe false flagsWrong entry.consume
    , not (referencesKnown scope entry.refs)
    , any (flip member scope.forced) entry.refs.effects
        || any (unforced scope) (entry.refs.effects <> entry.refs.placed)
    , any (payloadWrong scope) entry.refs.payloads
    , false -- check 4 (companions) lands in parallel and replaces this
    , applicationsWrong scope.arities entry.refs
    ]

referencesKnown ∷ Scope → Refs → Boolean
referencesKnown scope refs = all (sorted SortType) refs.types
  && all (sorted SortRow) refs.rows
  && all effectKnown (refs.effects <> refs.placed)
  && all (flip member scope.positions) refs.positions
  && all (flip member scope.rigidMarks) refs.marks
  where
  sorted sort variable = maybe false (hasSort sort) (lookup variable scope.vars)
  hasSort sort info = info.sort == sort
  effectKnown = case _ of
    EffRigid variable → member variable scope.effectRigids
    fresh@(EffFresh _ _) → member fresh scope.flexEff

-- Every `⟨q, result clauses⟩` an entry names is in F, or at a placement
-- of a member of F, so one outside F is a defect.
unforced ∷ Scope → EVar → Boolean
unforced scope variable = case variable of
  EffFresh _ ResultClauses → not (member variable scope.forced)
  _ → false

payloadWrong ∷ Scope → MTy → Boolean
payloadWrong scope = case _ of
  MVar variable → not (member variable scope.flexTy)
    || not (member variable scope.concrete)
  MArrow _ _ _ → true
  MHandler _ _ → true
  MRecord _ tails → not (null tails)
  MBase _ → false
  MData _ _ _ → false

-- Check 1's last clause: every `flexEff` member and position is
-- referenced by some entry. Read only when no entry has a defect.
uncovered ∷ FunctionId → Scope → Array Entry → Maybe CheckAt
uncovered decl scope entries =
  if subset scope.flexEff effects && subset scope.positions positions then
    Nothing
  else Just { provenance: coverageAt decl, check: 1 }
  where
  refs = foldMap _.refs entries
  effects = fromFoldable (refs.effects <> refs.placed)
  positions = fromFoldable refs.positions

scopeOf ∷ RecordedProblem → Scope
scopeOf problem =
  { vars: recorded.vars
  , effectRigids: fromFoldable effects.effectRigids
  , flexEff: fromFoldable effects.flexEff
  , positions: fromFoldable effects.positions
  , rigidMarks: fromFoldable effects.rigidMarks
  , flexTy: fromFoldable recorded.flexTy
  , forced: fromFoldable (map _.forced (forcedTails problem))
  , concrete: fromFoldable (mapMaybe concreteOn effects.obligations)
  , arities: validArities problem
  }
  where
  recorded = fields problem
  effects = recorded.effects
  concreteOn placed = case placed.value of
    FailConcrete (MVar variable) → Just variable
    _ → Nothing

