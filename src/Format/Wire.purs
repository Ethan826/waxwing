-- The plain records the CLI writes to stderr. Runtime only serializes them.
module Format.Wire
  ( WireRecord(..)
  , PlainRecord
  , SourceRecord
  , ToolRecord
  , hostCodeName
  , usageRecord
  , failureRecord
  , sourceRecord
  ) where

import Domain.Host (HostCode(..), HostFailure(..))
import Domain.Syntax (Diagnostic, Span)
import Format.Diagnostic (wire)
import Format.Diagnostic.Note (WireNote)

type PlainRecord = { code ∷ String, message ∷ String }
type SourceRecord =
  { code ∷ String
  , message ∷ String
  , span ∷ Span
  , file ∷ String
  , related ∷ Array WireNote
  }

type ToolRecord =
  { ok ∷ Boolean, code ∷ String, message ∷ String, command ∷ String }

-- Three shapes, because the CLI's usage/IO, source and tool failures have
-- always carried different fields; one record type would add or drop some.
data WireRecord
  = PlainWire PlainRecord
  | SourceWire SourceRecord
  | ToolWire ToolRecord

hostCodeName ∷ HostCode → String
hostCodeName = case _ of
  HostUsage → "E_USAGE"
  HostIo → "E_IO"
  HostTool → "E_TOOL"

usageRecord ∷ String → WireRecord
usageRecord text = PlainWire { code: hostCodeName HostUsage, message: text }

failureRecord ∷ HostFailure → WireRecord
failureRecord = case _ of
  IoFailure text → PlainWire { code: hostCodeName HostIo, message: text }
  ToolFailure tool → ToolWire
    { ok: false
    , code: hostCodeName HostTool
    , message: tool.message
    , command: tool.command
    }

sourceRecord ∷ String → Diagnostic → WireRecord
sourceRecord file diagnostic = SourceWire
  { code: rendered.code
  , message: rendered.message
  , span: rendered.span
  , file
  , related: rendered.related
  }
  where
  rendered = wire diagnostic
