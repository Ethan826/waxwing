# Dependency reviews

One record per dependency taken on or declined (dependency-intake). The
PureScript packages are pinned by spago.lock; this file covers what the
lock does not.

## acorn (taken, dev-only; dossier §18.115)

- Why: the clock gate of docs/plans/2026-10-29-verify-timing-proposal.md
  (1b) must decide on parsed JavaScript, not matched text. Node's
  standard library has no public JavaScript parser, the project has no
  npm dependencies, and the PureScript ecosystem it uses has none that
  parses JavaScript.
- Alternatives considered: a lexical scan with comments and strings
  removed (weaker, more blind spots; the author preferred parsing);
  vendoring acorn's single-file build (it would need new exemptions in
  the width, file-length and structure gates, and loses the lockfile's
  integrity check); @babel/parser 8 (about the same size, but it brings
  @babel/types and uses its own AST format rather than ESTree);
  typescript 7 (2.5 MB unpacked, a compiler taken on for one parse);
  esprima (last release 4.0.1, 2018-07-13).
- Footprint: one package, no transitive dependencies, 568 KB unpacked.
  A devDependency used only by verify's structure checks; never loaded
  by the compiler or its output.
- Fit: imported by the clock gate module in scripts/ and by its test,
  test/clock-gate.test.mjs (and test/clock-scope.test.mjs). It uses
  `parse` only (`ecmaVersion: 'latest'`, `sourceType: 'module'`); the
  tree walk is a small local function, so acorn-walk is not taken.
- Release cycle and maintenance: 8.19.0, released 2026-10-05; 8.x has
  been stable since 2020, with a few minor releases a year. Three
  maintainers, including the original author.
- Security and supply chain: no preinstall, install or postinstall
  script (its `prepare` script runs only for git installs, not registry
  installs); no network access or native code at run time.
- License: MIT. Waxwing does not redistribute it.
- Pinning: exact `8.19.0` in devDependencies, with the package-lock.json
  that npm writes, committed in the same change. verify checks the
  installed version, as it does for purs, spago and purs-tidy. README's
  statement that there are no local npm dependencies changes with it.
