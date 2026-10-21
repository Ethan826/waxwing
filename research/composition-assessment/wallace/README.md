# Pottier's Wallace toy: probes for the foundation assessment

Inputs (`*.toy`) and outputs (`*.out`) of Toy, the type checker in
Wallace release 2000-02-11 (François Pottier; cambium.inria.fr/~fpottier/
wallace). The archive says "Distributed only by permission", so neither
it nor the changes made to build it are in this repository; only the
programs written for the assessment and the checker's output are.

How it was built (OCaml 5.5.1, Homebrew, 2026-10-20): unpacked in a
scratch directory; `make depend; make` in toy/, with a wrapper `ocamlc`
that opens a compatibility module aliasing functions renamed since
OCaml 2.04 (`String.capitalize`, `Array.create`, `Sort`, `Pervasives`);
the operators `&` and `or` replaced by `&&` and `||` in the sources (a
function alias evaluates both sides; the originals short-circuit); the
toy lexer's string buffer moved from mutable `string` to `Bytes`; the
generated parser's two entry points, whose type parameter is phantom
(their `info` field is always `None`), given type `unit` and cast at
their one use in engine.ml; `-unsafe` dropped. Run: `toy < smoke.toy`.

The toy reads expressions only (top-level declarations are commented
out in its parser), so a declared signature such as program 4's cannot
be stated; program 4's facts are encoded as a function of its parts.
`@@` is symmetric (disjoint) concatenation; `r @@ { admin = () }`
makes `r` lack `admin`.

Each output ends with `Fatal error: exception End_of_file`: the toy
reads phrases until its input ends and has no other way to stop.
