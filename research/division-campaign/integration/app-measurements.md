# Application-shaped measurements: what a signature checker would face

Stream 9, for dossier §18.20 item 1 ("an application-shaped measurement
comes before implementation planning"). Read-only with respect to the
compiler. Written 2026-10-21 against `68cee4a`, with
`src/Features/Check/SeveralTails.purs` restored from `43b3a28^` for the
build only (not committed). The programs are in apps/, the tool in
apps/measure-apps.mjs, and reproduction is in §8.

Status labels follow measurements.md. **Checked** means computed by the
tool; three points are also computed by hand and asserted before
anything prints (§7.1). **Not proved** marks every sliced count. They
measure what a slicing would leave. S1 and S2 (§18.20 item 4) are
proposed statements whose definitions are not yet reviewed.

**Limits, plainly.** These are synthetic programs, written by this
stream in the shape of request handling, configuration layering,
service assembly and a helper module. None is a real application, and
nothing here says how common each shape is in real code. Literals with
two spreads go through the `wxJoin` surrogate (§1.3), marked `(j)`. That
gives the same rigid rows and labels, but it says nothing about what
literal spreads will cost once they are translated.

## Correction after the slicing hunt (2026-10-21)

Every `7b` column, A's `2^23` comparison and the related scaling claims
inherit a cut that drops variable-free contradictions. They are not
sound-checker speedups. The row-only cut (i) has separate counterexamples
through shared type variables and nested rows. Whole-atom (ii) and
residual (ii)σ remain proposals; no theorem or corrected cost measurement
is established here.

A residual checker must retain `eqs σ`, the rigid lists and declaration
quantifiers. Connecting that residual to the original requires a
substitution-soundness obligation; equivalence requires the stronger
binding-preservation obligation. A concrete-instance substitution cannot
stand for every permitted rigid assignment. A's `2^120` to `2^12`
comparison illustrates the potential of already-ground field-read metas,
without accounting for that full binding-preservation cost.

`star` remains a required useful-scale benchmark, not an accepted language
restriction. Measure search, certificate size and checking separately:
large tables can relocate exponential work. Detailed affected entries
and the proposed replacement obligations are in ../slicing/amendments.md.

## 0. In brief

- **A (`serve`, request handling, mostly independent).** `|R| = 4`,
  `|L| = 34`. checkAll would build 2^136 patterns, 2^126 of them
  consistent with `D`. Sliced over row variables only (i): 2^12 patterns
  in 3 slices. The author's slicing (ii), which also joins through type
  variables, nested fields and `D`, gives **2^120 in one slice**, because
  the type metas of field reads (`req.path`, `env.region`, `cache.hits`)
  meet in one record literal. The same slicing applied after the
  solver's substitution, (ii)σ, gives 2^12 again: those metas are solved
  to `Text` and `Int`.
- **B (`layered`, shared constraints (j)).** `|R| = 4`, `|L| = 9`, one
  component under every slicing: 2^36 patterns, 2^10 consistent.
  Slicing does nothing here, and the count is already past 2^30. The
  `lacks` clauses that the joins force cut the consistent count to 2^10.
- **C (`assemble`, service pipeline (j)).** `|R| = 2`, `|L| = 12`, one
  component: 2^24 patterns, 2^9.5 consistent.
- **D (14 helpers calling each other).** Worst `process`: 2^24 patterns;
  (i) and (ii)σ 2^4.3; (ii) 2^11. Every other helper is at most 2^8.
- **Scaling (§4).** Independent growth (`stages`, `ground`) passes 2^30
  unsliced from 4 rigid rows, and stays at 2^3-2^5 under every slicing.
  The `tied` family repeats A's collapse: under (ii) it grows like the
  unsliced count, 2n². Shared growth is not helped by any slicing:
  `chain` passes 2^30 at 6 rows (n²), `star` at 6 (n(n+1)), `shared` at
  11 labels (3n), one-row `helpers` at 31 labels.
- **Consistent patterns separate the shared shapes.** In `chain`,
  `shared` and `helpers` only one pattern is consistent with `D`,
  whatever n: every written label is lacked by every rigid row, because
  joins and extensions force it. In `star` the consistent count grows as
  n(n-1) and passes 2^30 at 7.
- **Implication (§6).** Exhaustive checkAll over 2^(|R|·|L|) is not a
  production procedure for application-shaped bodies. Candidate
  optimizations are a proved slicing after substitution with bindings
  retained, declaration-consistent enumeration, or a symbolic checker.
  The measurements do not establish their combined cost or preservation.
  The measured `star` count stays exponential.

## 1. What was measured

### 1.1 Sizes

The same as measurements.md §1, from the same code (measure/metrics.mjs):
`R`, `Rm`, `L` (labels written in `D` and `B`), `L rel.`, `F` (row
metas), patterns 2^(|R|·|L|), consistent patterns, bitCheck
2^(|Rm|+|F|), writtenCheck 2^((|Rm|+|F|)·|L|). All counts are log2.

### 1.2 Slicings

Four slicings are reported for each function. A slice is a connected
component of variables; it carries the labels of its groups, and a
sliced count sums over the slices that hold a rigid row.

| name | joins through | cut apart | source |
|---|---|---|---|
| (i) rows | rigid rows and row metas in `B` | type variables; `D`'s `disjoint` clauses; fields on both sides of a record equation | measure/variants.mjs `rowGroups` |
| 7b | row and type variables, `D` | fields on both sides of a record equation | measure/metrics.mjs (measurements.md §2.3) |
| (ii) joined | row and type variables, `D`, every nested field of a record (a record is never cut) | arrow parts, data-type arguments | variants.mjs `joinedGroups` |
| (ii)σ | as (ii), on `B` after the solver's substitution | as (ii) | variants.mjs `solvedGroups` |

(ii) is the slicing the author asked for in §18.20 item 4: independence
must cover shared type variables, nested fields and hypotheses. (i) is
the variant over row variables only. In (i), a field written on one
side of a record equation still joins its field type to the level, as
in 7b, so nested rows can meet there.

(ii)σ was added because (ii) collapsed on A (§3.1). It resolves every
atom with the compiler's own `resolve` (Check/Subst.purs:186), using the
substitution of the last successful top-level `unify` of the function,
which instrument.mjs keeps. A type meta solved to a ground type then
joins nothing. A solved row meta becomes its row. That substitution is
an approximation of the solver's final state, for two reasons: merge
cases unify through `unifyPlain`, which is not seen, and a speculative
branch's state could be the last one seen. Either way, metas left
unsolved stay as variables and can only join more, so on that account
(ii)σ is an upper bound for this slicing.

**Ground checks.** A group that holds labels and no variable belongs to
no slice. The tool counts these (the "ground" column) rather than
dropping them; §18.20 item 4 says ground contradictions are retained.

### 1.3 The `wxJoin` surrogate

Resolve refuses `{ ...a, ...b }` today. measure/joins.mjs rewrites each
such literal, on the parsed program, as a call to

~~~waxwing
fn wxJoin(a: { ...r }, b: { ...s }): { ...r, ...s }
  where r disjoint s = wxJoin(a, b);
~~~

The call writes the same labels and rigid rows. It adds two row metas,
one `Merge` and one apart pair per join, so `F` and bitCheck are
inflated. B, C and the families `shared`, `chain` and `star` each
declare a `join` whose body is the one rewritten literal; their
measured functions call `join`, not a literal. Accepted by §18.20 item
3 as a labelled surrogate. It does not establish the cost of literal
spreads.

## 2. The programs

All four are in apps/ and are accepted by the checker function by
function (`recheck`, the call Features/Check.purs:42 makes). A and D
are accepted through Specialize as whole programs. B and C fail at
Specialize with `E_INTERNAL R005B placeholder: rows with several tails
are lowered in Task 8` (Specialize/Record.purs:44), from the
several-tail result types of `join`, `layered` and `assemble`. No Go
was built.

### 2.1 A: request handling (apps/a-request.wxw)

`serve` has rigid rows `r` (request), `h` (headers, nested in the
request), `e` (environment) and `c` (cache). Each is touched by its own
few helpers. The body also builds eight records that meet none of them.

~~~waxwing
fn withTrace(req: { ...r }, id: Int): { traceId: Int, ...r }
    where r lacks { traceId } =
  { ...req, traceId: id };

fn accepted(h: { accept: Text, ...r }): Text = h.accept;

fn withoutAuth(h: { auth: Text, ...r }): { ...r } = h without { auth };

fn stamped(x: { ...r }, at: Int): { at: Int, ...r }
    where r lacks { at } =
  { ...x, at: at };

fn withStatus(resp: { status: Int, ...r }, code: Int): { status: Int, ...r } =
  resp { status = code };

fn bump(c: { hits: Int, ...r }): { hits: Int, ...r } = c { hits = c.hits + 1 };

fn ownerOf(u: { name: Text, ...r }): Text = u.name;

fn serve(
  req: { path: Text, method: Text, headers: { auth: Text, accept: Text, ...h },
    ...r },
  env: { region: Text, ...e },
  cache: { hits: Int, misses: Int, ...c }
): { status: Int, body: Text, trace: Int, region: Text, hits: Int }
    where r lacks { traceId }, e lacks { at } = {
  let traced = withTrace(req, 7);
  let clean = withoutAuth(req.headers);
  let kind = accepted(clean);
  let started = stamped(env, 100);
  let user = { name: "anon", roles: 0, session: 1 };
  let promoted = { ...user, admin: false };
  let owner = ownerOf(promoted);
  let meta = { region: env.region, kind: kind, at: started.at };
  let draft = { status: 200, body: "ok", length: 2, contentType: kind };
  let sent = withStatus(draft, 201);
  let counted = bump(cache);
  let audit = {
    path: req.path,
    method: req.method,
    status: sent.status,
    trace: traced.traceId,
    owner: owner
  };
  let quota = { limit: 100, used: counted.hits, window: 60 };
  let retry = { after: quota.window, attempts: 3, backoff: 2 };
  let link = { href: req.path, rel: "self", hits: counted.misses };
  let summary = {
    audit: audit,
    quota: quota,
    retry: retry,
    link: link,
    meta: meta
  };
  {
    status: summary.audit.status,
    body: sent.body,
    trace: traced.traceId,
    region: summary.meta.region,
    hits: counted.hits
  }
};

fn main(): Unit with Console = {
  let request = {
    path: "/users",
    method: "GET",
    headers: { auth: "token", accept: "json", lang: "en" },
    id: 4
  };
  let reply = serve(request, { region: "eu", zone: 2 },
    { hits: 0, misses: 0, size: 10 });
  Console.print(reply)
};
~~~

### 2.2 B: layered configuration (apps/b-layered.wxw, (j))

`layered` has four rigid rows related by four `disjoint` clauses. Three
of them are composed by `join` and passed on to helpers that add and
read labels, so every label meets the composed row. The fourth, `k`,
reaches the same component through `k disjoint u` and a second `join`.

~~~waxwing
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
    where r disjoint s =
  { ...a, ...b };

fn withPort(x: { ...r }, port: Int): { port: Int, ...r }
    where r lacks { port } =
  { ...x, port: port };

fn withHost(x: { ...r }, host: Text): { host: Text, ...r }
    where r lacks { host } =
  { ...x, host: host };

fn portOf(x: { port: Int, ...r }): Int = x.port;

fn timeoutOf(x: { timeout: Int, ...r }): Int = x.timeout;

fn nameOf(x: { name: Text, ...r }): Text = x.name;

fn retried(x: { retries: Int, ...r }): { retries: Int, ...r } =
  x { retries = x.retries + 1 };

fn layered(
  defaults: { timeout: Int, retries: Int, ...d },
  site: { name: Text, region: Text, ...s },
  user: { theme: Text, ...u },
  secrets: { token: Text, key: Text, ...k }
): { host: Text, port: Int, timeout: Int, retries: Int, name: Text,
    region: Text, theme: Text, ...d, ...s, ...u }
    where d disjoint s, d disjoint u, s disjoint u, k disjoint u,
      d lacks { port, host, name, region, theme },
      s lacks { port, host, timeout, retries, theme },
      u lacks { port, host, timeout, retries, name, region },
      k lacks { theme } = {
  let base = join(defaults, site);
  let all = join(base, user);
  let ported = withPort(all, 8080);
  let hosted = withHost(ported, nameOf(site));
  let again = retried(hosted);
  let limit = timeoutOf(again) + portOf(again);
  let hidden = secrets without { token, key };
  let private = join(hidden, user);
  again
};

fn main(): Unit with Console = Console.print(layered(
  { timeout: 30, retries: 2, verbose: false },
  { name: "site", region: "eu", owner: "ops" },
  { theme: "dark", lang: "en" },
  { token: "t", key: "k", vault: 1 }));
~~~

A first draft also removed `theme` from `private` (`private without {
theme }`). The checker refused that with `E_INTERNAL R005B placeholder:
rest binders and removal over several tails are typed in Task 7`
(Check/SeveralTails.purs:27, the restored module). The line was
dropped. It is the only change made to get acceptance.

### 2.3 C: service assembly (apps/c-services.wxw, (j))

`assemble` joins a configuration row `c` and a plugin row `p`, then
passes the result through four `with…` extensions and three readers
whose signatures each have their own rigid rows, including a nested
one (`db: { url: Text, ...d }`). `start` is the monomorphic call site.
The source is listed in Appendix A.

### 2.4 D: a helper module (apps/d-helpers.wxw)

Fourteen row-polymorphic helpers that call each other (`birthday` calls
`rename`, `older` and `greet`; `roundTrip` calls `untag` and `tagged`,
which calls `tag`, `birthday` and `nameOf`). `process` uses them on two
rigid rows. The source is listed in Appendix A.

## 3. Results (checked; sliced counts not proved)

### 3.1 The measured functions

| function | R | L | F | pat. | cons. | bit | wr. | (i) pat. | 7b pat. | (ii) pat. | (ii)σ pat. | (ii)σ cons. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A `serve` | 4 | 34 | 25 | 136 | 126 | 29 | 986 | 12.0 | 23.0 | 120 | 12.0 | 6.0 |
| B `layered` (j) | 4 | 9 | 19 | 36 | 10 | 23 | 207 | 36 | 36 | 36 | 36 | 10 |
| C `assemble` (j) | 2 | 12 | 15 | 24 | 9.5 | 17 | 204 | 24 | 24 | 24 | 24 | 9.5 |
| D `process` | 2 | 12 | 7 | 24 | 18 | 9 | 108 | 4.3 | 4.3 | 11.0 | 4.3 | 1 |
| D `pairUp` | 2 | 4 | 2 | 8 | 6 | 4 | 16 | 2 | 2 | 2 | 2 | 1 |

Slices with a rigid row, and the largest slice's patterns:

| function | (i) | 7b | (ii) | (ii)σ | largest under (ii)σ |
|---|---|---|---|---|---|
| A `serve` | 3 | 3 | 1 | 3 | 2^12: `{r, h}` with 6 labels |
| B `layered` | 1 | 1 | 1 | 1 | 2^36 |
| C `assemble` | 1 | 1 | 1 | 1 | 2^24 |
| D `process` | 2 | 2 | 2 | 2 | 2^4 |

The call sites have no rigid row: A's `main` (`|L| = 14`, writtenCheck
2^56), B's `main` (13, 2^91) and C's `start` (15, 2^120). As in
measurements.md §4, these are problems for the solver plus a
certificate (§18.20 item 2), not for checkAll.

Module totals (each function is checked alone, so a module costs the
sum; log2):

| program | functions | patterns | consistent | (i) | (ii) | (ii)σ |
|---|---|---|---|---|---|---|
| A | 9 | 136 | 126 | 12.0 | 120 | 12.0 |
| B (j) | 9 | 36.0 | 10.0 | 36.0 | 36.0 | 36.0 |
| C (j) | 11 | 24.0 | 9.6 | 24.0 | 24.0 | 24.0 |
| D | 15 | 24.0 | 18.0 | 6.0 | 11.0 | 6.0 |

### 3.2 Why A collapses under (ii)

A path search over (ii)'s groups (a scratch script, not kept) shows the
links:

- `r` and `h` meet in the request type itself. `headers` is a nested
  field of `req`. In (i) they meet too, because a field read from `req`
  is written on one side of the access equation only.
- `r`, `e` and `c` meet only through type metas. `req.path`,
  `env.region` (via `meta`) and `counted.hits` each have a fresh type
  meta. These metas are field types of the literals `audit`, `meta`,
  `quota` and `link`, which are fields of `summary`. Under (ii) a record
  is one group, so `summary`'s type meta, its fields' metas and every
  access they came from become one component, and with it every label
  of those literals.

After the substitution, those metas are `Text` and `Int`, and (ii)σ is
back at three slices: `{r, h}`, `{e}`, `{c}`. So whether S1 is stated
over the recorded `B` or over `B` after the certificate's substitution
decides between 2^120 and 2^12 for A (question 1, §9).

## 4. Scaling (checked; sliced counts not proved)

apps/scale.mjs generates each family; the function measured is named.
Program "no" means that Check accepts the function and Specialize
refuses the program with the several-tail placeholder of §2. All counts
are log2.

### 4.1 Independent growth

`stages` n: n rigid rows, each read by its own helper, beside n ground
records of three labels each (A's shape grown both ways).

| n | R | L | pat. | cons. | wr. | (i) pat. | (ii) pat. | (ii) cons. | (ii)σ pat. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 4 | 4 | 3 | 12 | 1 | 1 | 0 | 1 |
| 2 | 2 | 8 | 16 | 14 | 48 | 2 | 2 | 1 | 2 |
| 4 | 4 | 16 | 64 | 60 | 192 | 3 | 3 | 2 | 3 |
| 8 | 8 | 32 | 256 | 248 | 768 | 4 | 4 | 3 | 4 |
| 16 | 16 | 64 | 1024 | 1008 | 3072 | 5 | 5 | 4 | 5 |

Unsliced 4n², sliced log2(n) + 1: n slices of 2^1.

`ground` n: four rigid rows as in `stages` 4, beside n ground records.
The body grows and the signature does not.

| n | L | pat. | cons. | wr. | (i) pat. | (ii) pat. | (ii)σ pat. |
|---|---|---|---|---|---|---|---|
| 0 | 4 | 16 | 12 | 32 | 3 | 3 | 3 |
| 4 | 16 | 64 | 60 | 192 | 3 | 3 | 3 |
| 16 | 52 | 208 | 204 | 1248 | 3 | 3 | 3 |
| 64 | 196 | 784 | 780 | 14112 | 3 | 3 | 3 |

Unsliced 16 + 12n; every slicing stays at 2^3. This is `wide`
(measurements.md §6.1) grown: labels that never meet a rigid row cost
nothing once sliced. Without slicing, a consistent-only enumerator
does not help, because no row lacks those labels.

`tied` n: n rigid rows, one field read from each, the reads gathered
into one record literal (A's `audit` in isolation).

| n | R | L | pat. | cons. | (i) pat. | (ii) pat. | (ii) cons. | (ii)σ pat. |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 2 | 2 | 1 | 1 | 2 | 1 | 1 |
| 2 | 2 | 4 | 8 | 6 | 2 | 8 | 6 | 2 |
| 4 | 4 | 8 | 32 | 28 | 3 | 32 | 28 | 3 |
| 8 | 8 | 16 | 128 | 120 | 4 | 128 | 120 | 4 |
| 32 | 32 | 64 | 2048 | 2016 | 6 | 2048 | 2016 | 6 |

Under (ii) on the recorded `B`, `tied` is one component: 2n², no better
than unsliced. Under (i) and (ii)σ, log2(n) + 1.

### 4.2 Shared growth

`shared` n: three disjoint rigid rows joined (j), then n labels added by
n helpers; every row lacks every added label.

| n | R | L | pat. | cons. | wr. | every slicing: pat. |
|---|---|---|---|---|---|---|
| 1 | 3 | 1 | 3 | 0 | 10 | 3 |
| 4 | 3 | 4 | 12 | 0 | 52 | 12 |
| 10 | 3 | 10 | 30 | 0 | 190 | 30 |
| 11 | 3 | 11 | 33 | 0 | 220 | 33 |
| 32 | 3 | 32 | 96 | 0 | 1312 | 96 |

`chain` n: n rigid rows, pairwise disjoint, each beside one label the
others lack, joined left to right (j) (B's shape grown).

| n | R | L | pat. | cons. | wr. | every slicing: pat. |
|---|---|---|---|---|---|---|
| 2 | 2 | 2 | 4 | 0 | 12 | 4 |
| 4 | 4 | 4 | 16 | 0 | 64 | 16 |
| 5 | 5 | 5 | 25 | 0 | 105 | 25 |
| 6 | 6 | 6 | 36 | 0 | 156 | 36 |
| 12 | 12 | 12 | 144 | 0 | 672 | 144 |

`star` n: a context row `h` joined (j) with each of n rows separately.
Row `r_i` sits beside its own `f_i`; the other rows never meet `f_i`, so
nothing makes them lack it.

| n | R | L | pat. | cons. | wr. | every slicing: pat. | every slicing: cons. |
|---|---|---|---|---|---|---|---|
| 2 | 3 | 2 | 6 | 2 | 22 | 6 | 2 |
| 4 | 5 | 4 | 20 | 12 | 84 | 20 | 12 |
| 5 | 6 | 5 | 30 | 20 | 130 | 30 | 20 |
| 6 | 7 | 6 | 42 | 30 | 186 | 42 | 30 |
| 7 | 8 | 7 | 56 | 42 | 252 | 56 | 42 |
| 12 | 13 | 12 | 156 | 132 | 732 | 156 | 132 |

`helpers` n: a module of n helpers, `h_i` adding `a_i` to the result of
`h_{i-1}` on its own rigid row; `h_n` is measured.

| n | R | L | pat. | cons. | wr. | every slicing: pat. |
|---|---|---|---|---|---|---|
| 2 | 1 | 2 | 2 | 0 | 6 | 2 |
| 8 | 1 | 8 | 8 | 0 | 24 | 8 |
| 16 | 1 | 16 | 16 | 0 | 48 | 16 |
| 31 | 1 | 31 | 31 | 0 | 93 | 31 |
| 32 | 1 | 32 | 32 | 0 | 96 | 32 |

The tool prints every measured n, with `F`, writtenCheck under each
slicing and the verdicts. The tables above are excerpts of that output.

## 5. Where enumeration becomes infeasible

The first measured n past 2^30 (from the tool's output; `none` means
not within the sizes run):

| family | patterns | consistent | (i) | (ii) | (ii) cons. | (ii)σ |
|---|---|---|---|---|---|---|
| stages | 4 | 4 | none (16) | none | none | none |
| ground | 4 | 4 | none (64) | none | none | none |
| tied | 4 | 8 | none (32) | 4 | 8 | none |
| shared | 11 | none (32) | 11 | 11 | none | 11 |
| chain | 6 | none (12) | 6 | 6 | none | 6 |
| star | 6 | 7 | 6 | 6 | 7 | 6 |
| helpers | 31 | none (32) | 31 | 31 | none | 31 |

For the four programs: A's `serve` is past 2^30 unsliced (2^136) and
under (ii) (2^120). It is under 2^30 with 7b (2^23), (i) and (ii)σ
(2^12). B's `layered` is past it under every slicing (2^36), but its
consistent count is 2^10. C (2^24) and D (2^24 unsliced, at most 2^11
sliced) are under it.

In terms of a closed form, the measured component costs `|R_c|·|L_c|`
for each slice `c`, and every family follows its generator's product:
4n² and 2n² unsliced for `stages` and `tied`, n², n(n+1), 3n and n for
the shared families. A shared component of `k` rigid rows is past 2^30
once it carries more than 30/k labels.

## 6. What this implies for search plus certificate checking

- **checkAll as defined (every subset, then filter) is a reference, not
  a production check, for application-shaped bodies.** It pays
  2^(|R|·|L|) with `L` every label written in the body. A pays 2^136. That
  fits §18.20: exhaustive enumeration as a bounded reference.
- **Slicing is what makes the independent shape cheap, and the
  definition decides whether it does.** Over the recorded `B`, the
  slicing the author requires (ii) keeps A at 2^120, because type metas
  tie unrelated rows together. Over `B` after the certificate's
  substitution it gives 2^12. That count does not include the full
  binding-preserving chain: a residual checker must keep `eqs σ`, the
  rigid lists and declaration quantifiers. Those equations can reconnect
  components. Separate substitution-soundness and equivalence obligations
  connect the residual to the original. The 21 residual ground checks
  in A are not evidence that the complete checking cost is preserved.
- **Shared components need something other than slicing.** B, C, `chain`
  and `shared` are single components by construction, and slicing
  leaves them alone. Their consistent counts are small, often one
  pattern, because the joins force the `lacks` clauses. An enumerator
  that lists only patterns consistent with `D` (measurements.md §1)
  would handle them. That is a new definition and needs a lemma that it
  lists the same patterns that checkAll keeps.
- **`star` is the open case.** A context row joined with many
  independent rows leaves `n(n-1)` consistent patterns in one
  component: 2^42 at n = 7. Neither slicing as defined here nor
  consistent-only enumeration removes it. Per-label relevance might:
  whether `r_j` holds `f_i` (i ≠ j) appears to matter to nothing in the
  body. That would be S2 applied within a component, which nothing
  here measures or proves. A symbolic checker is the other way
  (recon.md §5.1 step 9).
- **Call sites stay with the solver.** Every `main` and `start` has
  `|R| = 0` and writtenCheck from 2^56 to 2^120. As §18.20 item 2
  decided, those are checked from the solver's certificate, not
  decided by enumeration.

## 7. What is checked and what is assumed

Checked by the tool:

- the sizes and the four slicings of every function in apps/*.wxw and of
  every generated point, from the atoms logged by the instrumented
  compiler (the same six wrappers as stream 7b, now in
  measure/instrument.mjs);
- that variants.mjs's 7b slicing reproduces metrics.mjs's sliced
  patterns and consistent counts on every function (an assertion);
- that the stream 7b corpus run is unchanged by this stream's
  refactoring: its text output and JSON were compared byte for byte
  before and after, at `68cee4a` (896 sources at this commit; the
  apps/ directory and this document are kept out of that corpus);
- the hand computations of §7.1;
- acceptance: each function's `recheck` verdict and each program's
  Check-then-Specialize result, as reported in §2.

Assumed, or not established:

- every sliced count. S1 and S2 are proposed statements. The sliced
  numbers are upper bounds only for the slicing named, and only up to
  the logging limits of measurements.md §2.2 (propagation logged,
  merge cases not, reverts not undone);
- (ii)σ's substitution is the last top-level `unify`'s, an
  approximation (§1.2);
- `wxJoin` stands in for literal spreads (§1.3); B, C, `shared`, `chain`
  and `star` depend on it;
- the programs' shapes are this stream's guesses at application code.
  No real program was ported. The families scale one parameter at a
  time.

### 7.1 Hand checks the run starts with

apps/expect.mjs, asserted before anything prints:

| point | hand computation |
|---|---|
| `stages` 1 | `R = 1`, `L = {f1, a1, b1, c1}`: 2^4; `r1` lacks `f1`: 2^3 consistent; each slicing keeps `{r1}` with `f1`: 2^1 |
| `tied` 2 | `R = 2`, `L = 4`: 2^8; `f1`, `f2` free in one row each, `a1`, `a2` in both: 2^6; (i) 2^1 + 2^1; (ii) one component, 2^8; (ii)σ 2^2 |
| `star` 2 | `R = 3`, `L = 2`: 2^6; `f1` lacked by `h` and `r1`, free in `r2`, and the reverse for `f2`: 2^2; one slice through `h` |

Changing `tied`'s expected (ii) count to 2 stops the run with the
assertion and its hand computation; restored, the run passes.

## 8. Reproduction

~~~sh
# SeveralTails.purs is restored in the branch since 2d175e3
npm run build
node research/division-campaign/integration/apps/measure-apps.mjs \
  <scratch-dir> --json <scratch-dir>/apps.json
# the stream 7b corpus, unchanged:
node research/division-campaign/integration/measure/measure.mjs \
  <scratch-dir> --json <scratch-dir>/results.json
rm -rf <scratch-dir>
~~~

measure-apps.mjs takes about 20 seconds after the build. `<scratch-dir>`
receives a copy of output/ (about 80 MB). No Go toolchain is used.

Files: apps/*.wxw (the programs), apps/scale.mjs (families),
apps/expect.mjs (hand checks), apps/measure-apps.mjs (driver),
apps/tables.mjs (output), measure/variants.mjs (slicings),
measure/counting.mjs (helpers moved out of metrics.mjs) and
measure/instrument.mjs (the instrumented compiler, moved out of
measure.mjs and extended to keep the last substitution).

## 9. Questions for the author

1. **Before or after the substitution?** Should S1 be stated over the
   recorded `B` or over `B[σ]`, with σ the certificate's substitution?
   On A that is the difference between 2^120 and 2^12. If `B[σ]`, the
   checker checks σ against all of `B` first, then the residual
   per-pattern problem slice by slice.
2. **Consistent-only enumeration.** Should a consistent-only enumerator
   (with a lemma that it lists exactly the patterns checkAll keeps)
   become a proposed statement beside S1 and S2? On the shared shapes
   here it reduces 2^36 (B) and 2^144 (`chain` 12) to 2^10 and 2^0.
3. **`star`.** Is a context row joined with many independent records a
   shape the language should support at scale? If so, the candidates
   are per-label relevance inside a component (an S2 variant) or a
   symbolic checker. Neither has been measured.
4. **Real programs.** Is a ported real program wanted before planning,
   or do these synthetic shapes suffice to pick the strategy? None of
   the counts here says how often each shape occurs.
5. **Several-tail lowering.** B, C and three families pass Check and
   stop at Specialize with the R005B placeholder. Should measurements
   wait for lowering, or is check-level acceptance enough for sizes?

## Appendix A. Programs C and D

apps/c-services.wxw:

~~~waxwing
fn join(a: { ...r }, b: { ...s }): { ...r, ...s }
    where r disjoint s =
  { ...a, ...b };

fn withDb(env: { ...r }, url: Text): { db: { url: Text, pool: Int }, ...r }
    where r lacks { db } =
  { ...env, db: { url: url, pool: 4 } };

fn withLog(env: { ...r }, level: Int): { log: { level: Int }, ...r }
    where r lacks { log } =
  { ...env, log: { level: level } };

fn withClock(env: { ...r }, at: Int): { clock: { at: Int }, ...r }
    where r lacks { clock } =
  { ...env, clock: { at: at } };

fn withCache(env: { ...r }, size: Int):
    { cache: { size: Int, hits: Int }, ...r }
    where r lacks { cache } =
  { ...env, cache: { size: size, hits: 0 } };

fn dbUrl(env: { db: { url: Text, ...d }, ...r }): Text = env.db.url;

fn logLevel(env: { log: { level: Int, ...l }, ...r }): Int = env.log.level;

fn now(env: { clock: { at: Int, ...k }, ...r }): Int = env.clock.at;

fn assemble(config: { name: Text, port: Int, ...c }, plugins: { ...p }): {
    db: { url: Text, pool: Int },
    log: { level: Int },
    clock: { at: Int },
    cache: { size: Int, hits: Int },
    name: Text,
    port: Int,
    ...c,
    ...p
  }
    where c disjoint p, c lacks { db, log, clock, cache },
      p lacks { db, log, clock, cache, name, port } = {
  let base = join(config, plugins);
  let withData = withDb(base, "pg://local");
  let logged = withLog(withData, 2);
  let timed = withClock(logged, 0);
  let cached = withCache(timed, 64);
  let health = {
    db: dbUrl(cached),
    level: logLevel(cached),
    port: cached.port,
    started: now(cached),
    up: true
  };
  let routes = { users: "/users", orders: "/orders", status: "/health" };
  cached
};

fn start(): Int = {
  let app = assemble({ name: "shop", port: 80, debug: false },
    { metrics: true, tracing: 1 });
  logLevel(app) + now(app) + app.port
};

fn main(): Unit with Console = Console.print(start());
~~~

apps/d-helpers.wxw:

~~~waxwing
fn nameOf(x: { name: Text, ...r }): Text = x.name;

fn ageOf(x: { age: Int, ...r }): Int = x.age;

fn rename(x: { name: Text, ...r }, n: Text): { name: Text, ...r } =
  x { name = n };

fn older(x: { age: Int, ...r }): { age: Int, ...r } = x { age = x.age + 1 };

fn tag(x: { ...r }, t: Text): { tag: Text, ...r } where r lacks { tag } =
  { ...x, tag: t };

fn untag(x: { tag: Text, ...r }): { ...r } = x without { tag };

fn greet(x: { name: Text, ...r }): Text = "hi ${nameOf(x)}";

fn birthday(x: { name: Text, age: Int, ...r }):
    { name: Text, age: Int, ...r } =
  rename(older(x), greet(x));

fn tagged(x: { name: Text, age: Int, ...r }):
    { tag: Text, name: Text, age: Int, ...r }
    where r lacks { tag } =
  tag(birthday(x), nameOf(x));

fn summary(x: { name: Text, age: Int, ...r }): { name: Text, years: Int } =
  { name: nameOf(x), years: ageOf(x) };

fn roundTrip(x: { name: Text, age: Int, ...r }):
    { name: Text, age: Int, ...r }
    where r lacks { tag } =
  untag(tagged(x));

fn pairUp(x: { name: Text, ...r }, y: { age: Int, ...s }):
    { left: Text, right: Int } =
  { left: nameOf(x), right: ageOf(y) };

fn contact(x: { email: Text, ...r }): { email: Text, verified: Bool } =
  { email: x.email, verified: false };

fn process(
  person: { name: Text, age: Int, email: Text, ...r },
  account: { id: Int, age: Int, ...s }
): { summary: { name: Text, years: Int }, pair: { left: Text, right: Int },
    contact: { email: Text, verified: Bool }, id: Int }
    where r lacks { tag } = {
  let trip = roundTrip(person);
  let pair = pairUp(trip, account);
  {
    summary: summary(birthday(trip)),
    pair: pair,
    contact: contact(person),
    id: account.id
  }
};

fn main(): Unit with Console = Console.print(process(
  { name: "Ada", age: 36, email: "ada@example.org", city: "London" },
  { id: 7, age: 2, plan: "pro" }));
~~~
