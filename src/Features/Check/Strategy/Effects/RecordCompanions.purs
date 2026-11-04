-- trusted surface: every diff needs token review; see docs/engineering.md
-- Record validation's check 4 (spec §4.1; dossier §18.148 (2)): the
-- companions an owner obligation requires, against one table. A
-- companion's identity is the owner's declaration, path and rule with
-- the companion's role; it records a site, a source and a target:
--   `Install` over `MHandler` (R, C), rule E21, role `InstallSite`:
--     `Consumed InstallR 0`          `InstallR`,      R into ρ
--     `Consumed AtInstalledC 0`      `AtInstalledC`,  C, else R, into ρ
--   `Install` over any other type, rule E21, role `InstallSite`:
--     `UnframedWith`                 `Unsupported UnframedInstall`
--   `HandlerLit`, rule E20, role `LiteralSite`, each clause row c_k:
--     `Consumed (ClauseIntoR k) 0`   `ClauseIntoR k`, c_k into R
--     `Consumed (ClauseIntoC k) 0`   `ClauseIntoC k`, c_k into C
--   `Defer`, rule E16, role `DeferRegistration`:
--     `DeferInto`                    `AtDefer`,       d into enclosing
-- ρ is the `Install`'s `ambient`; R, C, c_k (`HandlerLit`'s) and d
-- (`Defer`'s `row`) are read as rows of their variable alone, as
-- generation records them (Generate.Effect `installed`, Generate.Literal
-- `literalAt`, Generate.Obligation `deferAt`). An owner violates check 4
-- unless its identity is the table's, each required companion occurs
-- exactly once, and no other owner has its provenance (owners counted by
-- provenance whatever their values; BACKLOG R034 (10), dossier
-- §18.161 (2)); a companion-kind obligation (those consumption sites, an
-- `UnframedInstall`) violates it unless some owner requires it. The
-- flags (`marks`, `bare`) are check 0's. Local record consistency only:
-- this does not show that generation recorded every source site that
-- needs an owner (U6 stays open). The table is spread over two places
-- (review M6): the owner side in `ownerOf` and its helpers (`installed`,
-- `literalRows`), the companion kinds in `companionKind` and
-- `companionSite`. A new companion kind needs both: an owner's row that
-- requires it, and its site in `companionSite`.
module Features.Check.Strategy.Effects.RecordCompanions
  ( Companions
  , companionWrong
  , companionsOf
  ) where

import Prelude
import Data.Array
  ( any
  , concat
  , concatMap
  , filter
  , length
  , mapMaybe
  , mapWithIndex
  )
import Data.Foldable (all)
import Data.Maybe (Maybe(..), fromMaybe, maybe, maybe')
import Domain.Recorded.Effect
  ( EVar
  , MRow
  , MTy(..)
  , Obligation(..)
  , Placed
  , Position
  , Provenance(..)
  , SiteKind(..)
  , SiteRole(..)
  , UnsupportedKind(..)
  )
import Domain.Recorded.Origin (Path, RuleId(..))
import Domain.Resolved (FunctionId)

-- The record's obligations, every companion an owner among them
-- requires, and every owner's provenance; opaque, built by
-- `companionsOf` only.
newtype Companions = Companions
  { obligations ∷ Array (Placed Obligation)
  , required ∷ Array Companion
  , owners ∷ Array Provenance
  }

-- An obligation's identity at a site.
type Site =
  { decl ∷ FunctionId, path ∷ Path, rule ∷ RuleId, role ∷ SiteRole }

-- What a required companion records, flags aside.
data Records
  = Consumes { site ∷ SiteKind, source ∷ MRow, target ∷ MRow }
  | Unframed

type Companion = { provenance ∷ Provenance, records ∷ Records }

-- A row of the table: the owner's rule and role, and its companions at
-- the owner's site.
type Owner =
  { rule ∷ RuleId, role ∷ SiteRole, companions ∷ Site → Array Companion }

-- The rules generation records each owner under: E21 `with`, E20 a
-- handler literal, E16 `defer`.
withRule ∷ RuleId
withRule = ExprRule 21

literalRule ∷ RuleId
literalRule = ExprRule 20

deferRule ∷ RuleId
deferRule = ExprRule 16

companionsOf ∷ Array (Placed Obligation) → Companions
companionsOf obligations =
  Companions
    { obligations
    , required: concatMap requiredBy obligations
    , owners: mapMaybe ownedAt obligations
    }
  where
  ownedAt placed = map (const placed.provenance) (ownerOf placed.value)
  requiredBy placed = maybe [] (atOwner placed.provenance)
    (ownerOf placed.value)
  atOwner provenance owner = case provenance of
    AtSite site | identified owner site → owner.companions site
    _ → []

-- Check 4 for one recorded obligation.
companionWrong ∷ Companions → Placed Obligation → Boolean
companionWrong (Companions companions) placed =
  maybe' unowned owned (ownerOf placed.value)
  where
  owned owner = case placed.provenance of
    AtSite site | identified owner site →
      not (all once (owner.companions site)) || repeated site
    _ → true
  once companion =
    length (filter (fits companion) companions.obligations) == 1
  repeated site = length (filter (eq (AtSite site)) companions.owners) > 1
  unowned _ = companionKind placed.value
    && not (any (flip fits placed) companions.required)

-- Private.

-- The table (spec §4.1 check 4). No wildcard: a new obligation kind
-- fails to compile until it is placed.
ownerOf ∷ Obligation → Maybe Owner
ownerOf = case _ of
  Install install → Just
    { rule: withRule, role: InstallSite, companions: installed install }
  HandlerLit literal → Just
    { rule: literalRule, role: LiteralSite, companions: literalRows literal }
  Defer deferred → Just
    { rule: deferRule, role: DeferRegistration, companions: into deferred }
  Equal _ _ → Nothing
  Consume _ → Nothing
  Entry _ → Nothing
  FailConcrete _ → Nothing
  Unsupported _ → Nothing
  where
  into deferred site =
    [ consumes site DeferInto AtDefer (alone deferred.row) deferred.enclosing ]

installed
  ∷ { frame ∷ Position, handler ∷ MTy, ambient ∷ MRow }
  → Site
  → Array Companion
installed install site = case install.handler of
  MHandler _ rows →
    [ consumes site (Consumed InstallR 0) InstallR rows.inference
        install.ambient
    , consumes site (Consumed AtInstalledC 0) AtInstalledC
        (fromMaybe rows.inference rows.clauses)
        install.ambient
    ]
  _ → [ { provenance: AtSite site { role = UnframedWith }, records: Unframed } ]

literalRows
  ∷ { m ∷ Position, inference ∷ EVar, clauses ∷ EVar, clauseRows ∷ Array EVar }
  → Site
  → Array Companion
literalRows literal site = concat (mapWithIndex both literal.clauseRows)
  where
  both k row =
    [ consumes site (Consumed (ClauseIntoR k) 0) (ClauseIntoR k) (alone row)
        (alone literal.inference)
    , consumes site (Consumed (ClauseIntoC k) 0) (ClauseIntoC k) (alone row)
        (alone literal.clauses)
    ]

consumes ∷ Site → SiteRole → SiteKind → MRow → MRow → Companion
consumes site role kind source target =
  { provenance: AtSite site { role = role }
  , records: Consumes { site: kind, source, target }
  }

alone ∷ EVar → MRow
alone variable = { labels: [], tail: Just variable }

identified ∷ Owner → Site → Boolean
identified owner site = site.rule == owner.rule && site.role == owner.role

fits ∷ Companion → Placed Obligation → Boolean
fits companion placed = companion.provenance == placed.provenance
  && records companion.records placed.value

records ∷ Records → Obligation → Boolean
records = case _, _ of
  Consumes wanted, Consume found → wanted.site == found.site
    && wanted.source == found.source
    && wanted.target == found.target
  Unframed, Unsupported UnframedInstall → true
  _, _ → false

companionKind ∷ Obligation → Boolean
companionKind = case _ of
  Consume consume → companionSite consume.site
  Unsupported UnframedInstall → true
  _ → false

-- The consumption sites the table names. No wildcard.
companionSite ∷ SiteKind → Boolean
companionSite = case _ of
  InstallR → true
  AtInstalledC → true
  ClauseIntoR _ → true
  ClauseIntoC _ → true
  AtDefer → true
  AtCall → false
  AtPerform → false
  AtApply → false
  AtPipe → false
  AtStage _ → false
  AtCallback → false
  AtFail → false
  AtDeferredRow → false
