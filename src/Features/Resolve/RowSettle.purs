module Features.Resolve.RowSettle
  ( Place
  , Known
  , Settled
  , settledPlaces
  ) where

import Prelude
import Control.Monad.Rec.Class (Step(..), tailRec)
import Data.Array as Array
import Data.Map (Map)
import Data.Map as Map
import Data.Maybe (Maybe(..), fromMaybe, maybe')
import Data.Set (Set)
import Data.Set as Set
import Data.Tuple (Tuple(..))
import Domain.Syntax as Syntax
import Features.Resolve.Occurrences (Occurrence)

-- A parameter by declaration and position; `true` is record sort.
type Place = Tuple Int Int

type Known = Map Place Boolean

-- The settled sorts, and the places whose sort their callers gave them.
type Settled = { known ∷ Known, given ∷ Set Place }

-- A use of a parameter, with the parameter's place.
type Site = { place ∷ Place, use ∷ Occurrence }

-- The sort of each row parameter that its uses or its callers fix. `uses`
-- are each declaration's uses of its own parameters (Sorts.ownUses). Two
-- phases alternate until neither adds a sort: callee to caller, then
-- caller to callee for the parameters still unconstrained. A parameter
-- left without a sort is effect sort.
settledPlaces ∷ Array Syntax.TypeDecl → Array (Array Occurrence) → Settled
settledPlaces declarations uses = tailRec (alternate sites places passed)
  { known: Map.empty, given: Set.empty }
  where
  sites = Array.sortWith offset
    (Array.concat (Array.mapWithIndex siteOf (Array.zip declarations uses)))
  places = Array.concat (Array.mapWithIndex placesOf declarations)
  passed = Map.fromFoldableWith (flip append) (Array.mapMaybe viaOf sites)

alternate
  ∷ Array Site
  → Array Place
  → Map Place (Array Site)
  → Settled
  → Step Settled Settled
alternate sites places passed settled =
  if Map.isEmpty fresh then Done settled { known = known }
  else Loop
    { known: Map.union fresh known
    , given: Set.union (Map.keys fresh) settled.given
    }
  where
  known = tailRec (calleeToCaller sites) settled.known
  open = Array.filter (not <<< flip Map.member known) places
  fresh = Map.fromFoldable (Array.mapMaybe (given passed known) open)

offset ∷ Site → Int
offset site = site.use.span.start.offset

siteOf ∷ Int → Tuple Syntax.TypeDecl (Array Occurrence) → Array Site
siteOf index (Tuple declaration found) = Array.mapMaybe site found
  where
  site use = map (placed use) (Array.findIndex (called use) parameters)
  parameters = declaration.parameters
  called use parameter = parameter.name == use.name
  placed use position = { place: Tuple index position, use }

placesOf ∷ Int → Syntax.TypeDecl → Array Place
placesOf index declaration = Array.mapMaybe place
  (Array.mapWithIndex Tuple declaration.parameters)
  where
  place (Tuple position parameter) =
    if parameter.sort == Syntax.RowSort then Just (Tuple index position)
    else Nothing

-- The sites that pass a parameter on, keyed by the callee's place.
viaOf ∷ Site → Maybe (Tuple Place (Array Site))
viaOf site = map via site.use.applied
  where
  via applied = Tuple (Tuple applied.callee applied.position) [ site ]

-- What a use shows of its parameter's sort: a direct use by its own place,
-- an argument by the settled sort of the parameter it is passed to.
useSort ∷ Known → Occurrence → Maybe Boolean
useSort known use = maybe' direct callee use.applied
  where
  direct _ = case use.sort of
    Syntax.RecordSort → Just true
    Syntax.RowSort → Just false
    Syntax.TypeSort → Nothing
  callee applied = Map.lookup (Tuple applied.callee applied.position) known

-- A parameter takes the sort of its first use that has one. Each round
-- reads only the previous round's sorts, so the result does not depend on
-- the order of the declarations.
calleeToCaller ∷ Array Site → Known → Step Known Known
calleeToCaller sites known =
  if Map.size next == Map.size known then Done known else Loop next
  where
  next = Array.foldl take known sites
  take found site =
    if Map.member site.place found then found
    else maybe' (const found) (insertAt found site.place)
      (useSort known site.use)

insertAt ∷ Known → Place → Boolean → Known
insertAt known place isRecord = Map.insert place isRecord known

-- A parameter still without a sort takes the one its first settled caller
-- passes it; callers that disagree are checked once the sorts settle.
given
  ∷ Map Place (Array Site) → Known → Place → Maybe (Tuple Place Boolean)
given passed known place = map (Tuple place)
  (Array.findMap callerSort (fromMaybe [] (Map.lookup place passed)))
  where
  callerSort site = Map.lookup site.place known
