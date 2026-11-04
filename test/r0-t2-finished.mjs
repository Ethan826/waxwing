// R036 (2): `recheck`'s `trace` is `Either TraceFault Traced`. A test or
// script that reads the finished trace's fields takes it through here:
// `Right` unwrapped, `Left` thrown naming the fault and its meta, never
// read as an empty trace. Callers of `readEffects` pass the `Either`.
export const finished = (trace, where = 'trace') => {
  if (trace?.constructor?.name === 'Right') return trace.value0;
  const fault = trace?.value0;
  throw new Error(`${where}: the trace did not finish `
    + `(${fault?.constructor?.name} ${JSON.stringify(fault?.value0)})`);
};
