module Domain.Type
  ( module Domain.Ids
  , module Domain.Type.Core
  ) where

import Domain.Ids (TypeId(..))
import Domain.Type.Core
  ( Stages
  , Substitution
  , Ty(..)
  , TyRow
  , VarId(..)
  , foldStages
  , stagesThrough
  , substitute
  , spliceRecord
  , substituteRow
  )
