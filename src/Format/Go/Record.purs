-- Record expressions (R001 design §5). A record is a Go struct value,
-- `waxwingRec<N>`, its fields in sorted label order; a field of declared
-- type holds a pointer, as a constructor's does. Go leaves the evaluation
-- order of a composite literal's operands unspecified, so a literal or
-- update first evaluates each field that could perform an effect or abort
-- into a typed temporary, in written order, inside an immediately invoked
-- closure (as `if` is lowered), then builds the struct. Only a trivial
-- field, a literal or a local name, is used in place: its evaluation does
-- nothing, so order is kept. A literal of trivial fields alone is the
-- struct literal itself.
module Format.Go.Record (lowerLiteral, lowerAccess, lowerUpdate) where

import Prelude
import Data.Array as Array
import Data.String.Common (joinWith)
import Data.Tuple (Tuple(..))
import Domain.IR.Internal as IR
import Domain.IR.Internal (Ty(..))
import Format.Go.Capture (union)
import Format.Go.Data (goType)
import Format.Go.Lowered (Lowered, Lowering, Several, several)
import Format.Go.RecordNames (recordField)

-- One written field once lowered: its label and type, the code that reads
-- its value inside the closure, and the statement binding its temporary
-- ("" for a trivial field).
type Written =
  { label ∷ String, ty ∷ Ty, value ∷ String, binding ∷ String }

lowerLiteral ∷ Lowering → Int → Ty → Array IR.Field → Lowered
lowerLiteral lower next ty fields = joined parts
  (closure ty (temporaries written) literal)
  where
  parts = several lower next (map fieldValue fields)
  written = Array.mapWithIndex field (Array.zip fields parts.codes)
  literal = goType ty <> "{"
    <> joinWith ", " (map entry (Array.sortWith labelOf written))
    <> "}"
  entry found = recordField found.label <> ": " <> stored found

-- `(r).f_label`; a field of declared type is dereferenced.
lowerAccess ∷ Lowering → Int → Ty → IR.Expr → String → Lowered
lowerAccess lower next ty record label = read
  { code = dereferenced ty
      ("(" <> read.code <> ")." <> recordField label)
  }
  where
  read = lower next record

-- The base is copied into `waxwingBase`, then each replacement evaluated
-- in written order, then the copy's fields assigned and returned.
lowerUpdate ∷ Lowering → Int → Ty → IR.Expr → Array IR.Field → Lowered
lowerUpdate lower next ty record fields = joined parts
  ( closure ty
      ( [ "var waxwingBase " <> goType ty <> " = " <> base ]
          <> temporaries written
          <> map assigned written
      )
      "waxwingBase"
  )
  where
  parts = several lower next (Array.cons record (map fieldValue fields))
  base = joinWith "" (Array.take 1 parts.codes)
  written = Array.mapWithIndex field
    (Array.zip fields (Array.drop 1 parts.codes))
  assigned found = "waxwingBase." <> recordField found.label <> " = "
    <> stored found

fieldValue ∷ IR.Field → IR.Expr
fieldValue found = found.value

labelOf ∷ Written → String
labelOf found = found.label

-- The k-th written field: in place when trivial, else its temporary.
field ∷ Int → Tuple IR.Field String → Written
field index (Tuple found code) =
  if trivial found.value then written code ""
  else written name ("var " <> name <> " " <> goType ty <> " = " <> code)
  where
  ty = IR.typeOf found.value
  name = "waxwingField" <> show index
  written value binding = { label: found.label, ty, value, binding }

trivial ∷ IR.Expr → Boolean
trivial (IR.Expr expression) = case expression.node of
  IR.Integer _ → true
  IR.Boolean _ → true
  IR.Text _ → true
  IR.UnitValue → true
  IR.Local _ → true
  _ → false

temporaries ∷ Array Written → Array String
temporaries written = Array.filter bound (map binding written)
  where
  binding found = found.binding
  bound statement = statement /= ""

stored ∷ Written → String
stored found = case found.ty of
  TData _ → "&" <> found.value
  _ → found.value

dereferenced ∷ Ty → String → String
dereferenced ty code = case ty of
  TData _ → "(*" <> code <> ")"
  _ → code

-- The statements, then `result` returned, in a closure of the record's
-- type; with no statement, `result` alone.
closure ∷ Ty → Array String → String → String
closure ty statements result
  | Array.null statements = result
  | otherwise = "func() " <> goType ty <> " { "
      <> joinWith "; " (Array.snoc statements ("return " <> result))
      <> " }()"

joined ∷ Several → String → Lowered
joined parts code =
  { code
  , next: parts.next
  , lifted: parts.lifted
  , free: union parts.frees
  , wrappers: parts.wrappers
  }
