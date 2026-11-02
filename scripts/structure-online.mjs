// Tranche 2 Task 12 review I1 (design §C.6; dossier §18.155 (5)): the
// online strategy takes exactly `certify` and `certifySound` from
// Strategy.Substitution, never its `validate` (A2's validator), so the
// certificate's `effects` field reaches no validation there. Read from
// each src module's syntax tree with Style.Trace's `facts` (the trace
// gate's reader), never its text.
//
// Rule. Exactly one src module is named Features.Check.Strategy.Online;
// its imports of Strategy.Substitution are explicit lists (not open, not
// `hiding`, not qualified-open) whose names together are exactly the
// pinned set. Missing, open, hiding, extra or fewer names are findings.
//
// Limits (reasoned). Names only: an import through another module that
// re-exports `validate` is the module rules' business
// (scripts/structure-modules.mjs refuses Effects.Validate and
// Effects.Complete to Online), and what Online's imports import is not
// read. A file that does not parse is the trace gate's finding.
export const onlineModule = 'Features.Check.Strategy.Online';
export const substitutionModule = 'Features.Check.Strategy.Substitution';
export const substitutionNames = ['certify', 'certifySound'];

// `sources`: src file path to text; `facts`: Style.Trace's reader.
export const onlineImportFindings = (sources, facts) => {
  const owners = Object.values(sources).map(facts).filter(item =>
    item.parsed && item.name === onlineModule);
  if (owners.length !== 1)
    return [`structure: ${owners.length} modules named ${onlineModule}`];
  const taken = owners[0].imports.filter(item =>
    item.name === substitutionModule);
  const names = [...new Set(taken.flatMap(item => item.names))].sort();
  const exact = taken.length > 0
    && taken.every(item => !item.open && !item.hiding)
    && JSON.stringify(names) === JSON.stringify([...substitutionNames].sort());
  return exact ? [] : [`structure: ${onlineModule} must import exactly`
    + ` ${substitutionNames.join(', ')} from ${substitutionModule}`];
};

// The checkStructure entry, over every src .purs file in `files`.
export const onlineGate = async (files, readText) => {
  const { facts } = await import('../output/Style.Trace/index.js');
  return onlineImportFindings(Object.fromEntries(files.filter(file =>
    file.startsWith('src/') && file.endsWith('.purs')).map(file =>
    [file, readText(file)])), facts);
};
