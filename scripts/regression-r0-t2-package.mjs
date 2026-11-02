// Tranche 2 Task 11 regression rows (the package assembly; design §C.3,
// §C.6, §C.7, dossier §18.155 (3), (5), (6)), for the tranche 2
// registry; probes in test/regression-r0-t2-package.mjs. Each restores
// one defect in a whole, compiling form.
const dir = 'src/Features/Check/Strategy/ReadBack/';
const assembly = `${dir}Package.purs`;
const bound = `${dir}Bound.purs`;
const types = 'src/Features/Check/Trace/Types.purs';
const forcedSkipped = { file: `${dir}EffectRows.purs`,
  needle: '  owned = not <<< flip Set.member forced\n',
  replacement: '  owned = const true <<< flip Set.member forced\n' };

const row = (name, file, needle, replacement, message) => ({ name, file,
  needle, replacement, probe: name, message });

export const t2PackageRows = [
  // An `Unsupported` problem read as if it were supported.
  row('r0-t2-package-declined', assembly,
    '  maybe (Right unit) (Left <<< Declined) (declined problem)\n',
    '  maybe (Right unit) (const (Right unit)) (declined problem)\n',
    /r0-t2-package-declined: \["rigid"\]/),
  // Least terms with a clash used to read rows anyway.
  row('r0-t2-package-mark-clash', assembly,
    '  when (terms.clashes > 0) (Left MarkClash)\n',
    '  when (terms.clashes < 0) (Left MarkClash)\n',
    /r0-t2-package-mark-clash: \["Unread"\]/),
  // EffectRows reads the forced tails: the assembly's assertion faults.
  { name: 'r0-t2-package-forced', ...forcedSkipped,
    probe: 'r0-t2-package-forced',
    message: /r0-t2-package-forced: \["ForcedRead"\]/ },
  // The same, with the assembly's assertion dropped: the package binds a
  // forced tail.
  { name: 'r0-t2-package-forced-unasserted',
    edits: [forcedSkipped, { file: assembly,
      needle: '  unforced problem effects\n',
      replacement: '  void (pure (unforced problem effects))\n' }],
    probe: 'r0-t2-package-forced',
    message: /r0-t2-package-forced: \["bound"\]/ },
  // Extension numbers restart at 0, a second numbering beside the
  // body's: an extension effect hole takes a type hole's number.
  row('r0-t2-package-sorts', types,
    '  start = { next: Map.size numbering, seen: numbering }\n',
    '  start = { next: 0 * Map.size numbering, seen: numbering }\n',
    /r0-t2-package-sorts: \[.*"e"/),
  // The trace keeps raw metas: a meta the body shares reads another
  // number on the effect side, and the two live sources of `w`'s handler
  // row disagree (fail-closed, `Apart`).
  row('r0-t2-package-shared', 'src/Features/Check/Trace.purs',
    '    Hole meta → Hole (maybe meta identity '
      + '(Map.lookup meta numbers))\n',
    '    Hole meta → Hole (maybe meta (const meta) '
      + '(Map.lookup meta numbers))\n',
    /r0-t2-package-shared: \["Apart"\]/),
  // The body's numbering gives every meta one number.
  row('r0-t2-package-distinct', 'src/Features/Check/Holes.purs',
    '  else { next: found.next + 1, seen: Map.insert meta found.next '
      + 'found.seen }\n',
    '  else { next: found.next + 0, seen: Map.insert meta found.next '
      + 'found.seen }\n',
    /r0-t2-package-distinct: \["y"\]/),
  // The declaration's row numbered first among the extension, not last.
  row('r0-t2-package-extension', types,
    '  types = Array.concatMap useTypes (entries traced.uses)\n',
    '  types = [ arrowOf traced.row ] <> Array.concatMap useTypes '
      + '(entries traced.uses)\n',
    /r0-t2-package-extension: \[/),
  // Effect rows not read under θ.
  row('r0-t2-package-theta-effects', assembly,
    '  effects ← traverse (boundRow under) read\n',
    '  effects ← traverse (boundRow under { bindings = Map.empty }) read\n',
    /r0-t2-package-theta-effects: \["effects"\]/),
  // Type images not read under θ: the erasure guard sees θ's value.
  row('r0-t2-package-theta-images', `${dir}Images.purs`,
    '  filed info = imageOf reading unread today info >>= reading.bound\n',
    '  filed info = imageOf reading unread today info >>= pure\n',
    /r0-t2-package-theta-images: \["ImageApart"\]/),
  // A binding the package cannot hold kept as the bare hole.
  row('r0-t2-package-theta-unread', bound,
    '  note (UnreadImage variable) (under.image value)\n',
    '  maybe (Right (PVar variable)) Right (under.image value)\n',
    /r0-t2-package-theta-unread: \["arrow","flexible"\]/),
  // A bound effect-row hole kept as the tail.
  row('r0-t2-package-theta-tail', bound,
    '      | Map.member index under.bindings → Left (UnreadImage '
      + '(holeVar index))\n',
    '      | Map.member index under.bindings → Right tail\n',
    /r0-t2-package-theta-tail: \["effectRow"\]/),
  // A mark the injected terms do not read given N.
  { name: 'r0-t2-package-unread-mark',
    edits: [{ file: `${dir}Convert.purs`,
      needle: '    UserEffect _, _ → note (UnmarkedLabel effect) '
        + '(terms mark)\n',
      replacement: '    UserEffect _, _ → Right (fromMaybe TermN '
        + '(terms mark))\n' },
    { file: `${dir}Convert.purs`, needle: 'import Data.Maybe (Maybe)\n',
      replacement: 'import Data.Maybe (Maybe, fromMaybe)\n' }],
    probe: 'r0-t2-package-unread-mark',
    message: /r0-t2-package-unread-mark: \["unread mark"\]/ }
];
