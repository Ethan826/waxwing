# Stream 2: an attack on D3a

D3a (dossier §18.6, grammar §18.8 as amended in §18.9): if a typed
problem is valid, then for each written-label pattern `π` there is one
typed template that works for every rigid assignment in `π` satisfying
`D`. This file records the attack. Section (a) was written and committed
before any run in this directory; amendments made later say so.

## (a) Frozen grammars and bounds

### Template grammars

- **G-A (the amended grammar, as accepted in §18.13).** §18.8's grammar
  with §18.9's amendment: leaves `A(r, l)`, `T(n)`, the problem's base
  types and `Int`, `Bool`; `Temp_{k+1}` fills the problem's skeletons
  from `Temp_k`; a record node with tails gets a cell map (per Venn cell
  of the rigid rows, absent or one source row in the cell) and, at each
  written label its skeleton does not write, absent or a leaf (`Temp₀`).
  Flexible type variables range over `Temp₂`; flexible rows have, per
  written label, absent or a `Temp₁` template, and a cell map.
  Implementation: sig-oracle/nested-search.mjs `findNested` with
  `{ tailWritten: true }`, used unchanged.
- **G-1 (the first-pass grammar, §18.7)** for flat problems only:
  sig-oracle/templates.mjs `findTemplate`, used unchanged.
- **G-W (a widened grammar; an amendment, recorded here before any
  run).** G-A with three changes: flexible type variables range over
  `Temp₃`; flexible rows' written fields over `Temp₂`; a record node
  with tails gets, at each written label its skeleton does not write,
  absent or a template from the level being filled from (`Temp_k` when
  building `Temp_{k+1}`), not only a leaf. G-W exists only to show that
  a G-A gap is a gap of depth or of tail-node fields and not of
  uniformity. Implementation: d3a/widened.mjs (new; same search as
  `findNested`, with the domains injected).
- **Grammar-independent check.** For the finite-base candidate (R1), the
  claim does not depend on any grammar: every typed template, in any
  grammar where a flexible row's presence at a written label is fixed
  per pattern, fails. Checked by restricting the bounded flexible search
  to each presence choice, and proved in Lean (section (c)).

"No template" below always means: none within the named grammar and
bounds, searched exhaustively.

### Bounded validity

Validity is shown two ways. (1) A **hand witness**: a function from the
rigid assignment to a flexible assignment, written down with the
problem and checked atom by atom (sig-oracle/semantics.mjs `sat`) at
every bounded rigid assignment satisfying `D`. (2) Where a problem is
claimed invalid, or where no hand witness is given, a **bounded search**
(d3a/bt.mjs, new): backtracking over the flexible variables in the
order the atoms first mention them, each atom checked as soon as its
variables are assigned. Domains as bounded.mjs: flexible rows map the
labels to absent or the flexible field types; flexible type variables
range over the type values plus the values of `B`'s subexpressions
that mention no unassigned flexible type variable (bounded.mjs builds
these once per row choice and only from subexpressions free of every
flexible type variable; bt.mjs builds them under the partial
assignment, which can only enlarge the domain). Cross-check before use:
bt.mjs against bounded.mjs on every problem of typed-challenges.mjs,
the first-pass challenges and nested-challenges.mjs at their bounds;
any disagreement must be in the direction "bt valid, bounded invalid"
and explained by the larger domain.

### Runs and their bounds

| Run | Problems | Labels | Rigid rows | Rigid type variables | Flexible field types / type values |
|---|---|---|---|---|---|
| R1 shape split | `shape-split` (finite base types) | written + `q` | none | `Int`, `Bool`, `{}`, `{q:Int}`, `(Int->Int)`; R1' adds base `Str` | second-pass list (`Int`, `Bool`, `{}`, `(Int->Int)`, `{q:Int}`); R1' adds `Str` |
| R2 grammar gaps | `depth-row`, `depth-ty`, `tail-written` | written + `z1`, `z2` | absent, `Int`, `{q:Int}` | the second-pass list | the second-pass list; validity by hand witness only |
| R3 pigeonhole | `pigeonhole` (flat, three rigid rows) | `z1`, `z2` | `Int`, `Bool`; R3' adds `{}` | none | first-pass list (`Int`, `Bool`, `{}`, `(Int->Int)`) |
| R4 agreement generator | 500 problems each for seeds 5 and 17 (below) | `z1`, `z2` | `Int`, `Bool`, `{}` (three, so three rigid rows can differ pairwise) | none | first-pass list |
| R5 named nested | §18.10 label ties, vacuity, record-valued rigid variables | written + `z1`, `z2` | absent, `Int`, `{q:Int}` | the second-pass list | the second-pass list |

R4's generator (d3a/agreement.mjs): rigid rows 0-2, flexible rows 3-6,
no written labels, no type variables. `D`: each `disjoint` between two
rigid rows with probability 0.2; with probability 0.6 one, else none,
and then with probability 0.3 a second, equation among rigid rows,
uniformly `{ ...x } = { ...y }` or `{ ...x } = { ...y, ...z }`. `B`: two
to five atoms, uniformly from: `{ ...r } = { ...f, ...g }`;
`{ ...f } = { ...r }`; `{ ...f, ...g } = { ...r, ...s }`;
`{ ...f } = { ...g }`; `{ ...f, ...r } = { ...g, ...s }`;
`disjoint f g`; `disjoint f r` (`r`, `s` rigid, `f`, `g` flexible,
distinct where written distinct). Classification as typed-oracle.mjs:
bounded valid (bt.mjs), uniform G-1 template per pattern, per-assignment
G-1 template when no uniform one. A separation is minimized by dropping
atoms and rechecked with labels `z1`-`z3` and rigid field types `Int`,
`Bool`, `{}`, `(Int->Int)`.

Stop rule: a run stops at the end of its problem list; a separation is
recorded, minimized and rechecked, not used to stop other runs.
