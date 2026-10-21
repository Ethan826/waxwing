# Proposed acceptance programs

All syntax here is proposed and illustrative. These are future acceptance
contracts, not programs accepted by today's compiler. `D(Semigroup,a)` means
either representation in [the comparison](README.md); `make` and `.combine`
stand for its checked construction and projection. Record type names such as
`Stats` are explanatory abbreviations, not new alias syntax. `List`, `Maybe`
and `Pair` are ordinary proposed ADTs for these examples.

## P1: three choices at the same carrier

```text
type List(a) = Nil | Cons(a, List(a));
type Pair(a,b) = Pair(a,b);

fn add(x: Int, y: Int): Int = x + y;
fn multiply(x: Int, y: Int): Int = x * y;
fn takeLast(x: a, y: a): a = y;
fn sum(): D(Semigroup,Int) = make { combine = add };
fn product(): D(Semigroup,Int) = make { combine = multiply };
fn lastFor(seed: a): D(Semigroup,a) = make { combine = takeLast };

fn foldFrom(d: D(Semigroup,a), seed: a, xs: List(a)): a =
  match xs {
    Nil => seed,
    Cons(x,rest) => foldFrom(d, d.combine(seed,x), rest),
  };

fn main(): Pair(Int,Pair(Int,Int)) =
  Pair(foldFrom(sum(),2,Cons(3,Cons(4,Nil))),
    Pair(foldFrom(product(),2,Cons(3,Cons(4,Nil))),
      foldFrom(lastFor(0),2,Cons(3,Cons(4,Nil)))));
```

Expected: `Pair(9,Pair(24,4))`. Each evidence operand has carrier `Int`. For
every dictionary value d, `foldFrom(d,2,Nil)` returns `2` without invoking
combine. The seed is an explicit initial value, not an asserted identity. A
diverging dictionary expression still diverges before the call. Last has no
two-sided identity at Int. `lastFor` uses its seed only to determine the
carrier, without invoking a method. Int arithmetic wraps as currently
specified; this example does not rely on overflow. No numeric instance is
implicitly selected.

## P2: explicit construction and composition

```text
fn fromCombine(op: a -> a -> a): D(Semigroup,a) =
  make { combine = op };

fn reverse(d: D(Semigroup,a)): D(Semigroup,a) =
  make { combine = swapped }
  where
    fn swapped(x: a, y: a): a = d.combine(y,x);
```

Expected: `foldFrom(reverse(lastFor(0)),2,Cons(3,Cons(4,Nil))) = 2`.
`fromCombine` checks a function signature. It cannot establish a law:
`fromCombine(subtract)` is well typed and non-associative. A public name
Semigroup records an intended law obligation, not a proof certificate.

Let `Stats` abbreviate the closed type `{ count: Int, latest: Int }`. Let
`StatsPolicies` abbreviate the closed type with fields `count:
D(Semigroup,Int)` and `latest: D(Semigroup,Int)`.

```text
fn statsEvidence(p: StatsPolicies): D(Semigroup,Stats) =
  make { combine = combineStats }
  where
    fn combineStats(x: Stats, y: Stats): Stats =
      { count: p.count.combine(x.count,y.count),
        latest: p.latest.combine(x.latest,y.latest) };

fn statsExample(): Stats =
  statsEvidence({ count: sum(), latest: lastFor(0) }).combine(
    { count: 2, latest: 10 }, { count: 3, latest: 20 });
```

Expected: `{ count: 5, latest: 20 }`. Replacing only `count` by `product()`
gives `{ count: 6, latest: 20 }`. The dictionary is assembled from chosen
field policies; no automatic derivation or arbitrary row fold is needed. A
fixed two-field helper deliberately avoids dependence on record merge
inference. A generic `Pair(a,b)` helper could similarly combine two supplied
dictionaries without HKTs or polymorphic fields.

## P3: forwarding and returned closures

```text
fn client(d: D(Semigroup,a), x: a, y: a): a =
  foldFrom(d,x,Cons(y,Nil));

fn configured(d: D(Semigroup,a)): a -> a -> a = applyChosen
  where
    fn applyChosen(x: a, y: a): a = client(d,x,y);

fn choose(flag: Bool): D(Semigroup,Int) =
  if flag then sum() else product();

fn runtimeExample(flag: Bool): Pair(Int,Int) =
  Pair(configured(choose(flag))(2)(3),
    configured(lastFor(0))(2)(3));
```

Expected at true: `Pair(5,3)`; at false: `Pair(6,3)`. Test both calls in one
program, then reverse their source order. `configured` returns a closure
capturing the exact dictionary value. Specializing `client` at Int once must
preserve both flows. `configured(reverse(lastFor(0)))(2)(3) = 2` checks a
constructed dictionary with a capture, rather than only globals. A future
specialization oracle must compare observations against ordinary
unspecialized evaluation, not merely count function copies.

## P4: two operands of the same dictionary type

```text
fn both(d: D(Semigroup,a), e: D(Semigroup,a), x: a, y: a): Pair(a,a) =
  Pair(d.combine(x,y), e.combine(x,y));
```

`both(sum(),product(),2,3)` must give `Pair(5,6)`; swapping the operands
gives `Pair(6,5)`. A checker that deduplicates equal dictionary types
silently changes the program. The explicit binder sugar, if adopted, needs
two lexical names here just as ordinary parameters do.

## Negative and boundary programs

| ID | Proposed input/condition | Required outcome and reason |
|---|---|---|
| N1 | `foldFrom(sum(),true,Nil)` | Reject at Bool seed: wrong carrier |
| N2 | `foldFrom(2,Cons(3,Nil))` | Reject missing evidence/arity; do not search |
| N3 | `make Semigroup<Int> { combine = fn(x: Int) => true }` | Reject method type/arity |
| N4 | An effectful `combine` supplied to a pure dictionary | Reject effect mismatch; no silent effect erasure |
| N5 | `both(sum(),sum(),2,3)` | Accept `Pair(5,5)`; distinct parameters may hold the same value |
| N6 | Helper omits d without supplying another operand | Reject missing operand; no implicit default exists. Explicitly passing declared sum() is well typed and deliberately changes the choice |
| N7 | Recursive `f(a)` refers to `f(List(a))` inside a method closure | Reject under existing P001/FN001 specialization restriction |
| N8 | Pure constructor diverges before returning evidence | May diverge; elaboration must not skip its evaluation |
| N9 | `fromCombine(subtract)` | Accept its type; make no associativity claim |
| N10 | Same-shaped dictionaries for unrelated interfaces | A accepts structurally; B requires the matching nominal class |
| N11 | A type meta remains in any expression or named-reference instantiation, including a phantom carrier | Report ambiguity in this annotated core; no Int representative; a written type vector may fix it |
| N12 | `Tag(Int)` and `Tag(Bool)` dictionaries whose only field has type `Unit -> Unit` | A permits interchange at that shape; B rejects the distinct carrier index |

The helper syntax permits named captures solely for these illustrations; it
does not add local polymorphic schemes. Newtypes for Dollars versus Meters
would still prevent accidental domain mixing; none is required solely to
select sum versus product over Int.
