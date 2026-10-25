# Charter example probes (planning item 2, 2026-10-24)

These probes run the adoption record's two examples against today's
compiler: open records with `email` plus two combined service
computations (rows, the bridge), and `checkout` / `Database` /
`DatabaseLive` needing `Config` and `Logger` (construction versus use,
C2). An independent agent froze the predictions before any run. The
coordinating session reran C2a, C2a-A1, C2b, C2f-A1 and R3b on the same
build and got the same outputs. Planning evidence only: nothing here is
a design decision or authorizes work.

## Build and commands

- Compiler: worktree effect-kinds, HEAD 0cd4267, `src/` equal to main
  2af6e40 and to origin/main a82d064 (`git diff --quiet`). The CLI
  bundle was not rebuilt; that it matches the source is assumed.
- node v26.6.0, go1.26.4 darwin/arm64; GOCACHE in job scratch, deleted.
- Every probe: `node scripts/waxwing.mjs emit <probe>.wxw.txt <out>.go`;
  accepted probes also `node scripts/waxwing.mjs run <probe>.wxw.txt`.
- `out/` holds the captured stdout and stderr of each command. Emitted
  Go is not kept; rerunning emit regenerates it.

## Files

- `PREDICTIONS.frozen.md.txt`: the frozen predictions table, then an
  "Amendments" section and an "Additional probe" section, each appended
  before its own run. Renamed from `PREDICTIONS.md` and kept byte for
  byte. Its last hash in `FROZEN.sha256` matches; the two earlier
  hashes are of the shorter file before each append.
- `FROZEN.sha256`: hashes taken before each run batch. Every program
  matches its hash.
- `*.wxw.txt`: the programs, kept out of the pinned R0 corpus.

## Results

25 frozen probes: 19 confirmed, 3 refuted (R3b, C2a, C2f), 5 unknowns
settled. Amendments C2a-A1, C2a-A2 and C2f-A1 were added after the C2a
refusal, R9 after the first run; each was predicted before it ran.

| Probe | Observed | Grade |
|---|---|---|
| R1-preserve | accepted; extra fields and types kept | confirmed |
| R1b-lacks-implicit | accepted without `where r lacks` | unknown settled |
| R1c-lacks-violated | E_TYPE `verified is not allowed here: r lacks { verified }` | confirmed |
| R2-lambda-access | accepted; unannotated lambda reads `u.email` | unknown settled |
| R2b-lambda-rowvar | E_UNBOUND `Unbound type variable r` | confirmed |
| R2c-lambda-two-shapes | E_TYPE shape mismatch at the second call | confirmed |
| R3-missing-field | E_TYPE `Expected { email: Text, ..._ }, found { name: Text }` | confirmed |
| R3b-wrong-field-type | E_TYPE `Expected { email: Text, ..._ }, found { email: Int }` | refuted |
| R3c-body-reads-unnamed | E_TYPE `name is not a field of { email: Text, ...r }` | confirmed |
| R4-union-written | accepted; `15` / `16` | confirmed |
| R5-union-omitted | E_EFFECT `both performs Database, ...` | confirmed |
| R5b-union-partial | E_EFFECT `both performs Logger, ...` | confirmed |
| R6-missing-in-main | E_EFFECT `Unhandled Database in main`, path notes | confirmed |
| R7a-combine-distinct-rows | E_EFFECT, FX017 text exactly | confirmed |
| R7b-combine-shared-tail | accepted; `5` / `20` | unknown settled |
| R7c-combine-lambdas | accepted; `5` / `20` | unknown settled |
| R8-record-and-effect | accepted | confirmed |
| R8b-service-record-field-row | accepted; `mail a@x` | unknown settled |
| R8c-row-sorts | E_TYPE `r is a record row, not an effect row` | confirmed |
| R9-no-param-type | E_SYNTAX `Expected ':'` | confirmed |
| C2a-clause-row-provider | E_EFFECT `... cannot be made equal: both end in ...` | refuted |
| C2a-A1-open-clause-row | accepted; `5` / `1006` | confirmed |
| C2a-A2-matching-order | refused as C2a | unknown settled |
| C2b-construction-time-provider | accepted; `1000` / `-1` / `1006` / `43` | confirmed |
| C2c-inject-fake | accepted; `43` / `1006` | confirmed |
| C2d-record-provider-capture | accepted; `1000` / `1006` / `43` | confirmed |
| C2e-record-use-leak | E_EFFECT `checkout performs Logger, ...` | confirmed |
| C2f-provider-dep-missing | E_EFFECT, opaque, as C2a | refuted |
| C2f-A1-open-clause-row | E_EFFECT `Unhandled Config in main`; notes misleading | headline confirmed |
| C2g-logger-value-injected | accepted; `1006` | confirmed |

Exact messages and spans are in `out/<probe>.emit.out`. The probe
agent kept no outputs for C2a-A1, C2a-A2, C2f-A1 and R9; the
coordinating session captured them later on the same build, and they
match the table.

## Classification against the charter questions

| Question | Class | Evidence | Gap |
|---|---|---|---|
| Accept wider records, return them with extra fields intact | works | R1, R1b, R8 | none |
| Extend a passed-through record | works; `where r lacks` not needed when the result writes the label | R1, R1b, R1c | R005 Tranche A done |
| Merge two open records | not probed; docs stop at the R005B placeholder | docs | R005 Tranche B |
| Named function signatures inferred | no; types and `...r` written, lacks sets inferred | R9, R1b | INF001 |
| Local lambdas | partly; open record inferred from access, but monomorphic, and annotations cannot bind row variables | R2, R2b, R2c | local generalization, INF001 |
| Missing field diagnosed | works; text names neither label nor field | R3, R3b, R3c | F3 |
| Union of service rows, written | works | R4 | none |
| Union of service rows, inferred | not expressible | R5 | INF001 |
| Missing capability diagnosed | works, with path notes | R5, R5b, R6, C2e | none |
| Combinator over two service callbacks | workaround: shared `...e`; distinct written rows refused | R7a, R7b, R7c | FX017, FX007 |
| Record and effect rows together | works; sorts kept apart | R8, R8b, R8c | R009 not exercised |
| C2: construction needs Config + Logger, `checkout` names only Database | workaround: a constructor performs them and returns a pure handler or service record | C2b, C2d, C2g | provider design, INF001, M001 |
| C2: provider uses Config/Logger at use time | workaround: only with open clause row `+ ...e`; closed spelling cannot be installed | C2a, C2a-A1, C2a-A2 | F1; FX017/FX028 family |
| Where construction failures surface | in the constructor's row, handled at construction | C2b | none |
| What leaks into the consumer's row | nothing for captured providers; field rows for service records, by design | C2b-C2e, C2g | none |
| Fake replaces provider by injection | works for stateless fakes | C2b, C2c, C2d | FX003 |
| Missing provider dependency diagnosed | headline right with open spelling; notes blame wrong code | C2f, C2f-A1 | F2, F1 |
| Assembly named or selected automatically | not expressible; hand-nested `with` | structural | provider design, M001, C001/K001 |

## Findings for triage (not yet filed)

**F1. A closed clause-row handler type cannot be installed.** A provider
typed `Handler(Database with Config + Logger)` was refused at every
installation site tried (C2a, C2a-A2, C2f). The message repeats labels
(`Logger + Config + Config + Logger + … 1 more + ...`), prints an empty
tail name (`both end in ...`), has no notes and spans the whole `with`
expression. Writing `+ ...e` (C2a-A1) makes it work. The probe agent's
hypothesis, not checked against the source: the instantiated ambient
row unifies with the call-site row ρ, so the clause row becomes X + ρ,
which never equals ρ unless X is empty. This parallels the documented
`Handler(nofail Log)` trap but is undocumented for clause rows.

**F2. Missing-dependency notes blame the wrong code.** In C2f-A1,
`Unhandled Config in main` notes `Config comes from this call of
checkout` and `Config is performed here` at `Database.query(id)`.
`checkout` performs only Database; Config is performed by
`databaseLive`'s clause, which no note names.

**F3. A field-type mismatch is reported as a whole-shape mismatch.**
docs/language.md (Row polymorphism) says field mismatches use texts
such as `Expected Int, found Text`; R3b reports `Expected { email:
Text, ..._ }, found { email: Int }`. Either the doc sentence is
narrower than it reads or the behaviour drifted. R3 likewise does not
name the missing label.

**F4 (docs, low).** README "Records" can be read as requiring `where r
lacks { reviewed }` always; R1b shows it is unnecessary when the result
type writes the label beside `...r`.

**Note.** R7b and R7c show a shared-`...e` combinator accepts callees
with different rows, the row unifying to their union: a second
workaround for R7a besides writing the full row.

## Choices the probe agent made where the brief was silent

- "DatabaseLive needs Config and Logger" was modelled both at use time
  (clause row, C2a) and at construction (constructor function, C2b,
  C2d, C2g), since only construction time is C2's distinction.
- `let x = with h { … }` and a result type starting on a new line have
  no exact precedent in the docs; both were accepted.
- Printing handlers use `Handler(L with Console + ...e)` from
  examples/services.wxw, which hid F1 until C2a used the closed form.
- For "inferred", only omitted rows and omitted parameter types were
  tried, not a rigid `with ...e` caller.
