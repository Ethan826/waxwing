/-
Executable examples and negative controls for the call-site decider.
Each `#guard` evaluates `decideCall` (with Lean's evaluator, at build
time) and fails the build if the answer differs; `decideCall_correct`
says what each answer means. Row variables and type variables are
numbered separately. The problems are written by hand from dossier §5
and §6 (the step from Waxwing source is not formalized).
-/
import Composition.Unify.Decider

namespace Composition.Examples

open Composition.Syntax

inductive L where
  | a | admin | x | y | name | f
  deriving DecidableEq

inductive T where
  | int | bool | text
  deriving DecidableEq

abbrev E := TExpr L T

def rec1 (l : L) (t : E) : E := .record (.cons l t .nil) []
def rec2 (l : L) (t : E) (k : L) (u : E) : E :=
  .record (.cons l t (.cons k u .nil)) []
def parts (rs : List Nat) : E := .record .nil rs
def int : E := .base .int
def bool : E := .base .bool
def text : E := .base .text

/- Program 4's call: `{ ...r, ...s } = { admin: Bool }`, `s lacks admin`. -/
def p4 : Problem L T :=
  [.eq (parts [0, 1]) (rec1 .admin bool), .lacks 1 .admin]
#guard decideCall p4 = true
/- Its negative control: both parts lack `admin`. -/
#guard decideCall (p4 ++ [.lacks 0 .admin]) = false
/- Without the `lacks`: satisfiable (two splits; §4's policy then
refuses it as undetermined, which this decider does not decide). -/
#guard decideCall [.eq (parts [0, 1]) (rec1 .admin bool)] = true

/- Program 5's call. -/
def p5eq : Atom L T := .eq (parts [0, 1]) (rec2 .x int .y int)
#guard decideCall [p5eq, .lacks 0 .y, .lacks 1 .x] = true
#guard decideCall [p5eq, .lacks 0 .y, .lacks 1 .y] = false

/- Program 11: `q lacks a`, extended at `Int` and at `Bool`, called
with `{ name: Text }`. -/
def p11 (q : E) : Problem L T :=
  [.lacks 0 .a, .eq (.tvar 1) (.record (.cons .a int .nil) [0]),
    .eq (.tvar 2) (.record (.cons .a bool .nil) [0]), .eq (parts [0]) q]
#guard decideCall (p11 (rec1 .name text)) = true
/- Its negative control: `q` holds `a`. -/
#guard decideCall (p11 (rec2 .name text .a int)) = false

/- Program 3's overlap control: both parts hold `a`. -/
#guard decideCall [.eq (parts [0]) (rec1 .a int),
  .eq (parts [1]) (rec1 .a int), .eq (.tvar 0) (parts [0, 1])] = false

/- Gonzalez's residual: `(r ⊎ s).x` used as Int and as Text. -/
def sel (ty : E) : Problem L T :=
  [.eq (parts [0, 1]) (.record (.cons .x (.tvar 5) .nil) [2]),
    .eq (.tvar 5) ty]
#guard decideCall (sel int ++ [.eq (.tvar 5) text]) = false
#guard decideCall (sel int) = true

/- Gonzalez's self-unification: `x = x`. -/
#guard decideCall ([.eq (.tvar 0) (.tvar 0)] : Problem L T) = true

/- Gonzalez's nested case: `{ f: { ...q, a: Int } }` with `q = { name:
Text }`, its `f.name` used as Int (refused) and as Text (accepted). -/
def nested (nameTy : E) : Problem L T :=
  [.eq (parts [0]) (rec1 .name text),
    .eq (.tvar 3) (rec1 .f (.record (.cons .a int .nil) [0])),
    .eq (.tvar 3) (rec1 .f (.record (.cons .name nameTy .nil) [4]))]
#guard decideCall (nested int) = false
#guard decideCall (nested text) = true

/- The occurs check: `x = x → Int`. -/
#guard decideCall ([.eq (.tvar 0) (.arrow (.tvar 0) int)] : Problem L T)
  = false

/- A chain `x = y, y = Bool`, consistent and not. -/
#guard decideCall [.eq (.tvar 0) (.tvar 1), .eq (.tvar 1) bool,
  .eq (.tvar 0) bool] = true
#guard decideCall [.eq (.tvar 0) (.tvar 1), .eq (.tvar 1) bool,
  .eq (.tvar 0) int] = false

/- A record repeating a label is undefined. -/
#guard decideCall [.eq (.tvar 0) (rec2 .a int .a int)] = false

end Composition.Examples
