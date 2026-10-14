module Features.Specialize.Printable
  ( groundPrintable
  , site
  , checkSites
  ) where

import Prelude
import Data.Array as Array
import Data.Either (Either(..))
import Data.Foldable (foldl, traverse_)
import Data.Map as Map
import Domain.IR.Internal as IR
import Domain.Problem (Problem(..), TypeName)
import Domain.Syntax (Diagnostic, problemAt)
import Domain.Type (Ty)
import Features.Check.Functional (Functional, containsFunction, functional)
import Features.Check.TypeName (typeName)
import Features.Specialize.Copy (modify)
import Features.Specialize.Ground (Grounds, groundOf, groundType)
import Features.Specialize.Intern (funTypes)
import Features.Specialize.State
  ( Env
  , PrintSite
  , Specializing
  , State
  , WorkKind(..)
  )

-- Whether `show`, `Console.print` and `crash` accept a value of this ground
-- type: it holds no function or handler, nested in data or not. `holders`
-- are the declared types that store one (Check.Functional), so `Box(Int)`
-- with a function field is refused whatever its arguments are.
groundPrintable ∷ Functional → Ty Void → Boolean
groundPrintable holders = not <<< containsFunction holders

-- Notes a print site's argument, already specialized, for `checkSites`:
-- its ground type is known only once every type of the program is filled.
site ∷ Specializing IR.Expr → Specializing IR.Expr
site copied = do
  IR.Expr value ← copied
  modify (noted { span: value.span, ty: value.ty })
  pure (IR.Expr value)
  where
  noted found state = state
    { prints = Map.insert state.counts.prints found state.prints
    , counts = state.counts { prints = state.counts.prints + 1 }
    }

-- The first noted site, in specialization order, whose ground type is not
-- printable (BACKLOG E017); the error is at the site, as at check time.
-- Sites of builtin types need no tables, so a program that prints only
-- those builds none.
checkSites ∷ Env → State → Either Diagnostic Unit
checkSites env state = if Array.null structured then Right unit else judged
  where
  structured = Array.filter built (Array.fromFoldable (Map.values state.prints))
  judged = groundsOf state >>= judgeAll
  judgeAll known = traverse_ (judge { env, holders, known }) structured
  holders = functional env.ctors

-- A noted type that is not a builtin needs the ground types of the program.
built ∷ PrintSite → Boolean
built found = case found.ty of
  IR.TInt → false
  IR.TBool → false
  IR.TUnit → false
  IR.TText → false
  _ → true

-- The ground type of every output type, in creation order (each names only
-- earlier ones), with the arrow table and effect layouts.
groundsOf ∷ State → Either Diagnostic Grounds
groundsOf state = map withTypes (foldl (groundOf tables) (Right Map.empty) work)
  where
  tables = { table: funTypes state.arrows, effects: state.effects }
  work = Array.filter isType (Array.fromFoldable (Map.values state.work))
  isType found = found.kind == TypeWork
  withTypes types = { types, table: tables.table, effects: tables.effects }

type Judging = { env ∷ Env, holders ∷ Functional, known ∷ Grounds }

judge ∷ Judging → PrintSite → Either Diagnostic Unit
judge context found = groundType context.known found.span found.ty
  >>= refuse context found

refuse ∷ Judging → PrintSite → Ty Void → Either Diagnostic Unit
refuse context found ground
  | groundPrintable context.holders ground = Right unit
  | otherwise =
      typeName names found.span (map absurd ground)
        >>= notPrintable found
      where
      names =
        { types: context.env.types
        , variables: []
        , effects: context.env.effects
        }

notPrintable ∷ ∀ a. PrintSite → TypeName → Either Diagnostic a
notPrintable found name = Left (problemAt (NotPrintable name) found.span)
