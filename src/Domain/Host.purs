-- Capability ports. The monad stays abstract, so Domain needs no Effect and
-- tests can pass fake records in place of the Node host.
module Domain.Host
  ( HostCode(..)
  , HostFailure(..)
  , ReadFailure(..)
  , Host
  ) where

import Data.Either (Either)
import Domain.Syntax (Position)
import Prelude (Unit)

-- The codes the CLI itself reports, apart from source diagnostics; Format.Wire
-- alone knows their spellings.
data HostCode
  = HostUsage
  | HostIo
  | HostTool

data HostFailure
  = IoFailure String
  | ToolFailure { message ∷ String, command ∷ String }

-- Reading source can also fail on bytes: the position of the first invalid
-- one, by the location convention. No other port can fail this way.
data ReadFailure
  = Unreadable HostFailure
  | InvalidUtf8 Position

-- `buildExecutable goSource binaryPath` and `runProgram goSource` own their
-- temporary directory and remove it before returning.
type Host m =
  { readSource ∷ String → m (Either ReadFailure String)
  , writeText ∷ String → String → m (Either HostFailure Unit)
  , buildExecutable ∷ String → String → m (Either HostFailure Unit)
  , runProgram ∷ String → m (Either HostFailure String)
  }
