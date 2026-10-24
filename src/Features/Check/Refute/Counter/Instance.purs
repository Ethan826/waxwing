-- `ρ` applied to atoms of the projection (CX refute/statements.md §4):
-- the atoms and `ρ`'s keys are numbered together, type variables and row
-- variables apart, then `substProblem ρ` (Counter/Term.purs) is applied
-- once, in parallel. Ground expressions become terms at `B ⊕ Nat`. Also
-- `Scoped P`: `D` mentions only rigid variables of its sort.
module Features.Check.Refute.Counter.Instance
  ( atomRows
  , groundTerm
  , instantiate
  , unscoped
  ) where

import Prelude
import Data.Array (concatMap, filter, notElem)
import Data.Map (Map, empty, fromFoldable, insert, lookup)
import Data.Maybe (maybe')
import Data.Traversable (mapAccumL)
import Data.Traversable.Accum (Accum)
import Data.Tuple (Tuple(..), snd)
import Domain.Recorded.Atom (Var)
import Domain.Verdict.Counter (CXGround(..), CXSubst(..), GroundFields)
import Features.Check.Refute.Counter.Term
  ( Atom(..)
  , Atomic(..)
  , Fields
  , Term(..)
  , substProblem
  )
import Features.Check.Refute.Sig
  ( SigAtom(..)
  , SigEntry
  , SigExpr(..)
  , SigProblem
  , SigVar(..)
  )

type Numbering = { ty ∷ Map SigVar Int, row ∷ Map Var Int, next ∷ Int }

-- `substProblem ρ` on the entries' atoms, numbered.
instantiate ∷ CXSubst → Array SigEntry → Array Atom
instantiate (CXSubst rho) entries =
  substProblem { ty: fromFoldable tys.value, row: fromFoldable rows.value }
    atoms.value
  where
  atoms = mapAccumL atomOf start (map _.atom entries)
  tys = mapAccumL tyBinding atoms.accum rho.ty
  rows = mapAccumL rowBinding tys.accum rho.row
  start = { ty: empty, row: empty, next: 0 }
  tyBinding names (Tuple var ground) =
    mapped (flip Tuple (groundTerm ground)) (tyNumber (Named var) names)
  rowBinding names (Tuple var fields) =
    mapped (flip Tuple { fields: groundFields fields, tails: [] })
      (rowNumber var names)

groundTerm ∷ CXGround → Term
groundTerm ground = case ground of
  GroundBase base → TBase (Known base)
  GroundFresh n → TBase (Fresh n)
  GroundArrow parameter result →
    TArrow (groundTerm parameter) (groundTerm result)
  GroundRecord fields → TRecord (groundFields fields) []

-- The variables of `D` outside the rigid list of their sort, each
-- occurrence (Scoped P when empty). `toSig` puts no generalized
-- variable in `D`; one there would be unscoped too, and is reported by
-- the caller as unprojectable.
unscoped ∷ SigProblem → { ty ∷ Array SigVar, row ∷ Array Var }
unscoped problem =
  { ty: filter outsideTy (concatMap atomTyVars atoms)
  , row: filter (flip notElem problem.rigidRow) (concatMap atomRows atoms)
  }
  where
  atoms = map _.atom problem.d
  outsideTy var = case var of
    Named name → notElem name problem.rigidTy
    Generalized _ → true

groundFields ∷ GroundFields → Fields
groundFields = map field
  where
  field (Tuple label ground) = Tuple label (groundTerm ground)

atomOf ∷ Numbering → SigAtom → Accum Numbering Atom
atomOf names atom = case atom of
  SigEqual left right → equalOf (termOf names left) right
  SigLacks row label → mapped (flip Lacks label) (rowNumber row names)
  SigDisjoint one other → disjointOf (rowNumber one names) other
  SigFf → { accum: names, value: Ff }

equalOf ∷ Accum Numbering Term → SigExpr → Accum Numbering Atom
equalOf first right = mapped (Equal first.value) (termOf first.accum right)

disjointOf ∷ Accum Numbering Int → Var → Accum Numbering Atom
disjointOf first other =
  mapped (Disjoint first.value) (rowNumber other first.accum)

termOf ∷ Numbering → SigExpr → Accum Numbering Term
termOf names expression = case expression of
  SigBase base → { accum: names, value: TBase (Known base) }
  SigArrow parameter result → arrowOf (termOf names parameter) result
  SigTVar var → mapped TVar (tyNumber var names)
  SigRecord fieldList tails →
    recordOf (mapAccumL fieldOf names fieldList) tails

arrowOf ∷ Accum Numbering Term → SigExpr → Accum Numbering Term
arrowOf first result = mapped (TArrow first.value) (termOf first.accum result)

recordOf ∷ Accum Numbering Fields → Array Var → Accum Numbering Term
recordOf fields tails =
  mapped (TRecord fields.value) (mapAccumL (flip rowNumber) fields.accum tails)

fieldOf ∷ Numbering → Tuple String SigExpr → Accum Numbering (Tuple String Term)
fieldOf names (Tuple label value) = mapped (Tuple label) (termOf names value)

tyNumber ∷ SigVar → Numbering → Accum Numbering Int
tyNumber var names = maybe' fresh known (lookup var names.ty)
  where
  known value = { accum: names, value }
  fresh _ =
    { accum: names
        { ty = insert var names.next names.ty, next = names.next + 1 }
    , value: names.next
    }

rowNumber ∷ Var → Numbering → Accum Numbering Int
rowNumber var names = maybe' fresh known (lookup var names.row)
  where
  known value = { accum: names, value }
  fresh _ =
    { accum: names
        { row = insert var names.next names.row, next = names.next + 1 }
    , value: names.next
    }

mapped ∷ ∀ a b. (a → b) → Accum Numbering a → Accum Numbering b
mapped f { accum, value } = { accum, value: f value }

atomTyVars ∷ SigAtom → Array SigVar
atomTyVars atom = case atom of
  SigEqual left right → exprTyVars left <> exprTyVars right
  SigLacks _ _ → []
  SigDisjoint _ _ → []
  SigFf → []

exprTyVars ∷ SigExpr → Array SigVar
exprTyVars expression = case expression of
  SigBase _ → []
  SigArrow parameter result → exprTyVars parameter <> exprTyVars result
  SigTVar var → [ var ]
  SigRecord fieldList _ → concatMap (exprTyVars <<< snd) fieldList

atomRows ∷ SigAtom → Array Var
atomRows atom = case atom of
  SigEqual left right → exprRows left <> exprRows right
  SigLacks row _ → [ row ]
  SigDisjoint one other → [ one, other ]
  SigFf → []

exprRows ∷ SigExpr → Array Var
exprRows expression = case expression of
  SigBase _ → []
  SigArrow parameter result → exprRows parameter <> exprRows result
  SigTVar _ → []
  SigRecord fieldList tails → concatMap (exprRows <<< snd) fieldList <> tails
