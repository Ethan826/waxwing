# Makholm and Wells's Bowtie/Martini tool: probes

Inputs (`*.bt`) and output (`all.out`) of `bowtini` 1.3 (Henning
Makholm, Heriot-Watt University, 2005), the type inference tool for
Bowtie (records with symmetric concatenation) and Martini (mixin
modules). The archive is from the Wayback Machine
(www.macs.hw.ac.uk/DART/software/Bowtini/bowtini-1.3.tar.gz, captured
2005-12-19). Its files say "PERHAPS_GPL_EVENTUALLY" and the download
page says the GPL licensing "has not yet been completed", so neither
the archive nor the changes made to build it are in this repository.
Only the programs written for the assessment and the tool's output are.

## Build (2026-10-20)

Moscow ML 2.10.1 from Homebrew (bottle, 6.5 MB). Unpacked in a scratch
directory; `./configure; make DYNLD='gcc -shared -undefined
dynamic_lookup'` (macOS needs the flag to link the C helper). Three
source changes for Basis library and type checker differences since
Moscow ML 2.0: in util/pretty.sml, the record selector `#2` given as
`make_token` became `fn (_ : style, s : string) => s` (a flexible
record type no longer matches the signature); in util/mainutil.sml,
`CharArray.copy {src, si, dst, di, len}` became `CharArraySlice.copy`
of a slice, and `CharArray.extract` became `CharArraySlice.vector` of a
slice. No change touches type inference.

Run: `bowtini [--solve | --noreduce] <file>.bt`. The default output
is the inferred typing after the paper's incremental simplification;
`--solve` also maps unsolved set variables to ⊥ (a ground typing);
`--noreduce` prints the unsimplified constraint set. A refused program
prints an error and exits 255. `all.out` has every file in the three
modes:

    for f in *.bt; do for m in "" --solve --noreduce; do
      echo "== $f $m"; bowtini $m $f 2>&1; echo "[exit $?]"
    done; done > all.out

## Syntax notes

The tool reads one closed term: `\x. e`, application, `{l = e, ...}`,
`e ++ e` (symmetric concatenation), `e.l`, `if e then e else e`,
integers and `true`. There is no `let` (the TODO lists "Add type
inference for let polymorphism") and no declarations, so a lambda-bound
function is monomorphic and no signature can be stated. `false` is not
a boolean literal (the lexer reads it as an option keyword; a
term-level `false` becomes a free variable), so `admin = 0` stands for
`admin: false`. `e \\ l` is the papers' hiding rule (fresh field types
for `l`); `e \ l` is the tool's other hiding form, which frees a field's
type only where the field is present (p11-hide-exports.bt).

Neither `lacks` nor `disjoint` exists. Disjointness is the ⊎ of `++`.
`r lacks { a }` is written in two ways here: as a dummy concatenation
`q ++ {a = 0}` (a constraint `S ⊎ {a} = s'`), or, where the record is a
type-level fiction, as hiding (`b \\ admin` has a set `S \ {admin}`).

## Results

| File | Program | Result |
|---|---|---|
| p3, p3-swap, p3-three | 3 | accepted |
| p3-overlap | 3, overlap control | refused, `{name} ⊎ {name}` |
| p3-three-join | 3, one λ-bound join | refused (no let) |
| p6 | 6 (wrapper as lambda) | accepted |
| p4, p4-lacks | 4, encoded | accepted |
| p4-neg, p4-lacks-neg | 4's negative control | accepted |
| p4-iface, p4-neg-iface | interface alone | `{admin: 'a, r0 / q0 ⇒ s0}` |
| p4-parts | caller splits | accepted |
| p4-parts-neg | caller splits, both lack | refused |
| p5 | 5, encoded | accepted |
| p5-neg | 5, facts unsatisfiable | accepted |
| p11-lambda | 11, lambda form | refused, int/bool |
| p11-hide | 11 with `\\ a` per use | accepted |
| p11-hide-neg | its negative control | accepted |
| p11-lacks | 11, lacks by `++`, `\\` | accepted |
| p11-lacks-neg | its negative control | refused |
| p11-hide-exports | 11 with `\ a` | refused, int/bool |
| paper-hide | ICFP §5's own example | accepted |

Program 4 is stated by giving `p` the type of `a ++ (b \\ admin)`
through the branches of an `if`, inside a function never called, so
`a` and `b` never hold values. The remaining constraint is `s2 ⊎ s1 =
{admin}` with `s1 = s0 \ {admin}` (p4.bt, `--noreduce`); in the
negative control both parts are `\\ admin`. Both are solved by mapping
the free set variables to ⊥ (ICFP 2005 Lemma 5.9): constraints are
checked from operands to result, never back from a known result to
unknown parts. The interface's simplified typing carries no constraint,
so nothing about the split is visible to callers. Program 5 likewise
keeps `s0 ⊎ s1 = {x,y}` with `s0`, `s1` unsolved, and its unsatisfiable
variant is accepted the same way.
