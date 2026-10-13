module Format.Go.Data
  ( declarations
  , funTypeDeclarations
  , goType
  , ctorName
  , functionName
  , effectName
  , performName
  , fieldName
  , localName
  , pipeLocal
  , integer
  , boolean
  , goTextLiteral
  , malformed
  ) where

import Prelude
import Data.Array as Array
import Data.Enum (fromEnum)
import Data.Int (hexadecimal, toStringAs)
import Data.String.CodePoints (CodePoint, singleton, toCodePointArray)
import Data.String.CodeUnits as String
import Data.String.Common (joinWith)
import Domain.IR.Internal (EffectKey(..), FunType, FunTypeId(..), Ty(..))
import Domain.Resolved (CtorId(..), FunctionId(..), LocalId(..), TypeId(..))
import Format.Go.Context (typeList)
import Format.Go.Context as Context
import Format.Go.Layout (Declared, Layout, Member)

-- Each type becomes one tagged struct and its constructor functions.
declarations ∷ Boolean → Layout → String
declarations context program = joinWith "" (map typeBlock program.types)
  where
  typeBlock declared = structDeclaration declared
    <> joinWith "" (map (constructor context) declared.members)

goType ∷ Ty → String
goType = case _ of
  TInt → "int32"
  TBool → "bool"
  TData (TypeId index) → "waxwingTy" <> show index
  TFun (FunTypeId index) → "waxwingFun" <> show index
  TUnit → "struct{}"
  TText → "string"
  -- One handler struct per effect layout (Format.Go.Effect).
  THandler key → "*" <> effectName key

-- One named Go type per interned arrow, in number order (design §13 rule
-- 8): each names its result's type by number, so the text is linear in
-- the number of distinct suffixes. A program without arrows emits none,
-- so existing output is unchanged; a phantom arrow (a type argument no
-- field holds) still gets its unused declaration.
funTypeDeclarations ∷ Boolean → Array FunType → String
funTypeDeclarations context table =
  joinWith "" (Array.mapWithIndex declared table)
  where
  declared index arrow = "type " <> goType (TFun (FunTypeId index))
    <> " func("
    <> typeList context [ goType arrow.parameter ]
    <> ") "
    <> goType arrow.result
    <> "\n\n"

ctorName ∷ CtorId → String
ctorName (CtorId index) = "waxwingCtor" <> show index

functionName ∷ FunctionId → String
functionName (FunctionId index) = "waxwingFn" <> show index

-- A layout's handler struct and, per operation, its perform function.
effectName ∷ EffectKey → String
effectName (EffectKey index) = "waxwingEff" <> show index

performName ∷ EffectKey → Int → String
performName key position = effectName key <> "Op" <> show position

localName ∷ LocalId → String
localName (LocalId index)
  | index < 0 = "waxwingPipe"
  | otherwise = "waxwingLocal" <> show index

-- A pipe's left operand, bound as the last parameter of the function the
-- pipe is lifted to (Format.Go.Pipe). Resolve numbers locals from 0, so
-- this id names no source local.
pipeLocal ∷ LocalId
pipeLocal = LocalId (-1)

integer ∷ Int → String
integer value = "int32(" <> show value <> ")"

boolean ∷ Boolean → String
boolean value = if value then "true" else "false"

-- A Text value as a Go string literal. The escaping is canonical, so the
-- output is the same for any input: printable ASCII is written as is,
-- `"` and `\` and the three line escapes by name, and every other code
-- point as a fixed-width hex escape (`\u00e9`, `\U0001f600`). The source
-- stays ASCII whatever the text holds.
goTextLiteral ∷ String → String
goTextLiteral text = "\"" <> joinWith "" (map goEscaped (toCodePointArray text))
  <> "\""

goEscaped ∷ CodePoint → String
goEscaped point = case code of
  0x22 → "\\\""
  0x5C → "\\\\"
  0x0A → "\\n"
  0x09 → "\\t"
  0x0D → "\\r"
  _ → otherEscaped point code
  where
  code = fromEnum point

otherEscaped ∷ CodePoint → Int → String
otherEscaped point code
  | code >= firstPrintable && code <= lastPrintable = singleton point
  | code <= lastBasic = "\\u" <> hexadecimalPadded basicDigits code
  | otherwise = "\\U" <> hexadecimalPadded fullDigits code

-- Printable ASCII runs from the space to the tilde; `\u` takes 4 hex digits
-- (to U+FFFF) and `\U` 8.
firstPrintable ∷ Int
firstPrintable = 0x20

lastPrintable ∷ Int
lastPrintable = 0x7E

lastBasic ∷ Int
lastBasic = 0xFFFF

basicDigits ∷ Int
basicDigits = 4

fullDigits ∷ Int
fullDigits = 8

hexadecimalPadded ∷ Int → Int → String
hexadecimalPadded width code = joinWith "" (Array.replicate padding "0") <>
  digits
  where
  digits = toStringAs hexadecimal code
  padding = width - String.length digits

-- Raised by every helper that meets a value its declarations cannot
-- produce: an unknown tag or a nil field (only foreign code, I001).
malformed ∷ String
malformed = "panic(\"waxwing: malformed value\")"

typeName ∷ TypeId → String
typeName (TypeId index) = "waxwingTy" <> show index

fieldName ∷ CtorId → Int → String
fieldName (CtorId ctor) index = "c" <> show ctor <> "f" <> show index

-- ADT fields are pointers so a type may contain itself; a Go func value is
-- already a reference (design §7).
fieldType ∷ Ty → String
fieldType = case _ of
  TData (TypeId index) → "*waxwingTy" <> show index
  other → goType other

structDeclaration ∷ Declared → String
structDeclaration declared =
  "type " <> typeName declared.id <> " struct {\ntag uint32\n"
    <> joinWith "" (Array.concatMap fieldLines declared.members)
    <> "}\n\n"
  where
  fieldLines member = Array.mapWithIndex (fieldLine member.id)
    member.ctor.fields
  fieldLine id index ty = fieldName id index <> " " <> fieldType ty <> "\n"

-- Tags are 1-based within the owner so the zero value never names a
-- constructor (Format.Go.Layout). Constructor ids are unique across types.
constructor ∷ Boolean → Member → String
constructor context member =
  "func " <> ctorName member.id <> "("
    <> joinWith ", " (Context.declared context parameters)
    <> ") "
    <> typeName member.ctor.owner
    <> " { return "
    <> typeName member.ctor.owner
    <> "{"
    <> joinWith ", " ([ "tag: " <> show member.tag ] <> stores)
    <> "} }\n\n"
  where
  parameters = Array.mapWithIndex parameter member.ctor.fields
  parameter index ty = "f" <> show index <> " " <> goType ty
  stores = Array.mapWithIndex store member.ctor.fields
  store index ty =
    fieldName member.id index <> ": " <> storedValue ty ("f" <> show index)

storedValue ∷ Ty → String → String
storedValue ty name = case ty of
  TData _ → "&" <> name
  _ → name
