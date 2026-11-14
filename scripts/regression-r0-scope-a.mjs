// Scope A regression rows (dossier §18.198-§18.200; proposal §8 task 4),
// spread into r0Rows (scripts/regression-r0.mjs); the probes are in
// test/regression-r0-scope-a.mjs. Each restores one defect in a whole,
// compiling form, and its probe must name it.
const candidate = 'src/Features/Check/Strategy/Candidate.purs';
const functional = 'src/Features/Check/Functional.purs';
const admitted = 'src/Features/Check/Admitted.purs';
const translate = 'src/Features/Check/Generate/Translate.purs';
const substitution = 'src/Features/Check/Strategy/Substitution.purs';
const decide = 'src/Features/Check/Decide.purs';
const asked = 'src/Features/Check/Strategy/Asked.purs';
const ground = 'src/Features/Check/GroundRule.purs';
const exposed = 'src/Features/Check/Strategy/Exposed.purs';
const row = (name, file, needle, replacement, probe) => ({ name, file,
  needle, replacement, probe, message: new RegExp(`${probe}: \\[`) });

export const scopeARows = [
  // `canonical` leaves tails unsorted.
  row('r0-scope-a-tails-unsorted', candidate, ' (sort tails)\n',
    ' (if true then tails else sort tails)\n', 'r0-scope-a-canonical'),
  // `canonical` leaves fields unsorted.
  row('r0-scope-a-fields-unsorted', candidate,
    '(sortWith fst (map field fields))',
    '(if true then map field fields else sortWith fst (map field fields))',
    'r0-scope-a-canonical'),
  // `under` does not canonicalize a variable's binding.
  row('r0-scope-a-binding-raw', candidate,
    'maybe ty canonical (Map.lookup variable candidate)',
    'maybe ty identity (Map.lookup variable candidate)',
    'r0-scope-a-canonical'),
  // The holder set misses a function inside a record field.
  row('r0-scope-a-holder-record', functional,
    'TRecord row → Array.any (containsFunction found) (fieldTypes row)',
    'TRecord row → Array.any (containsFunction found)'
      + ' (Array.take 0 (fieldTypes row))', 'r0-scope-a-tables'),
  // The holder set misses a function inside a type argument.
  row('r0-scope-a-holder-argument', functional,
    '    || Array.any (containsFunction found) arguments\n',
    '    || Array.any (containsFunction found) (Array.take 0 arguments)\n',
    'r0-scope-a-tables'),
  // The admitted set ignores reachability (the transitive boundary).
  row('r0-scope-a-admitted-local', admitted,
    'unexpressible = reaching ctors (',
    'unexpressible = reaching [] (', 'r0-scope-a-tables'),
  // The admitted set ignores the holder set.
  row('r0-scope-a-admitted-holder', admitted,
    '    && not (Set.member id holding)\n',
    '    && not (Set.member id (Set.filter (const false) holding))\n',
    'r0-scope-a-tables'),
  // Generation narrows the marker without reading the arguments.
  row('r0-scope-a-arguments-unread', translate,
    '    && Array.all (plainArgument admitted) arguments.tys\n',
    '    && Array.all (plainArgument admitted) (Array.take 0 arguments.tys)\n',
    'r0-scope-a-tables'),
  // An argument's head or nullary type is not checked against the set.
  row('r0-scope-a-argument-head', translate,
    'TData id arguments rows → Set.member id admitted && Array.null rows',
    'TData id arguments rows → (Set.member id admitted || true)'
      + ' && Array.null rows', 'r0-scope-a-tables'),
  // The check exposes nothing.
  row('r0-scope-a-exposure-off', substitution,
    'Right (Valid (exposedBy problem candidate))',
    'Right (Valid (const [] (exposedBy problem candidate)))',
    'r0-scope-a-boundary'),
  // Rule 1 ignores what the solution exposes.
  row('r0-scope-a-rule1-ignores', decide,
    'exposed = maybe [] (map Outside <<< exposure <<< _.validity)',
    'exposed = maybe [] (const [] <<< map Outside <<< exposure'
      + ' <<< _.validity)', 'r0-scope-a-boundary'),
  // The exposure check reads an arrow inside an argument as plain.
  row('r0-scope-a-exposure-arrow', exposed, '  Arrow _ _ → [ unit ]\n',
    '  Arrow _ _ → []\n', 'r0-scope-a-boundary'),
  // Review of 2026-11-14: one row per branch of the exposure check.
  // Any head counts as admitted.
  row('r0-scope-a-exposure-any-head', exposed,
    '  | Set.member id holders.admitted\n',
    '  | (Set.member id holders.admitted || true)\n', 'r0-scope-a-exposure'),
  // A record-row head is not named `DataOverRecords`.
  row('r0-scope-a-exposure-over-records', exposed,
    '  | Set.member id holders.overRecords = [ DataOverRecords ]\n',
    '  | Set.member id (Set.filter (const false) holders.overRecords) ='
      + ' [ DataOverRecords ]\n', 'r0-scope-a-exposure'),
  // A record inside an argument reads as plain.
  row('r0-scope-a-exposure-record', exposed, '  Record _ _ → [ unit ]\n',
    '  Record _ _ → []\n', 'r0-scope-a-exposure'),
  // A handler inside an argument reads as plain.
  row('r0-scope-a-exposure-handler', exposed,
    '  App (HandlerHead _) _ → [ unit ]\n', '  App (HandlerHead _) _ → []\n',
    'r0-scope-a-exposure'),
  // A nullary holder inside an argument reads as plain.
  row('r0-scope-a-exposure-base', exposed,
    'Base (DataBase id) → if Set.member id holders.admitted then',
    'Base (DataBase id) → if Set.member id holders.admitted || true then',
    'r0-scope-a-exposure'),
  // No row for `unplain`'s head test: with the recursion into arguments
  // every nested node meets `node`'s own test, and a record-row head's
  // record argument is never plain, so dropping it changes no result (an
  // equivalent mutant; the run of 2026-11-14 found it undetectable).
  // Nodes inside an argument are not read for their own kind.
  row('r0-scope-a-exposure-no-recursion', exposed,
    '    node holders id arguments <> concatMap (nodes holders) arguments\n',
    '    node holders id arguments\n      <> concatMap (nodes holders)'
      + ' (if true then [] else arguments)\n', 'r0-scope-a-exposure'),
  // Neither the site table nor the candidate's images are read.
  { name: 'r0-scope-a-exposure-atoms-only', edits: [{ file: exposed,
    needle: '          <> fromFoldable (Map.values view.types)\n',
    replacement: '          <> fromFoldable (Map.values (Map.filter'
      + ' (const false) view.types))\n' }, { file: exposed,
    needle: '      <> fromFoldable (Map.values candidate)\n',
    replacement: '      <> fromFoldable (Map.values (Map.filter (const false)'
      + ' candidate))\n' }], probe: 'r0-scope-a-exposure',
  message: /r0-scope-a-exposure: \[/ },
  // The requirement-definedness refusal is gone.
  row('r0-scope-a-definedness-off', asked, '        *> definedIn entry\n',
    '        *> const (Right unit) (definedIn entry)\n',
    'r0-scope-a-definedness'),
  // GroundRule reads a nullary declared base as printable outright.
  row('r0-scope-a-ground-base', ground,
    'DataBase id → declared holders id',
    'DataBase id → const Holds (declared holders id)',
    'r0-scope-a-ground-kind')
];
