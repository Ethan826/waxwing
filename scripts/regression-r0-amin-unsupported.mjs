// R0 a-min regression rows for the Unsupported restrictions (§18.124
// rulings 3 and 4), spread into r0AminRows (scripts/regression-r0-amin.mjs);
// probes in test/regression-r0-amin-unsupported.mjs.
const generate = 'src/Features/Check/Generate/';
export const unsupportedRows = [
  {
    // Ruling 3: whether a row was written is read from its resolution,
    // so a row that fails to resolve records no Unsupported.
    name: 'r0-amin-unsupported-written',
    file: `${generate}Lookup.purs`,
    needle: '    , written: found.written\n',
    replacement: '    , written: maybe false (const true) found.effects\n',
    probe: 'r0-amin-unsupported-written',
    message: /an unresolvable written row records no Unsupported/
  },
  {
    // Ruling 4: a `with` over a non-MHandler records no restriction.
    name: 'r0-amin-unsupported-unframed',
    file: `${generate}Effect.purs`,
    needle: '  _ → unsupportedAt (at context path (ExprRule 21)) span'
      + ' UnframedInstall\n',
    replacement: '  _ → pure unit\n',
    probe: 'r0-amin-unsupported-unframed',
    message: /a with over a non-MHandler records no UnframedInstall/
  }
];
