// Runs each acceptance-program variant (programs/*.wxw, from
// docs/plans/2026-10-20-composition-acceptance-programs.md) through the
// compiler built in output/: checking first, then the full compile, then
// Go. Prints one line per program. Research only; not part of verify.
//   GOTOOLCHAIN=go1.26.4 node research/composition-assessment/run.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { checkWired, wired } from '../../test/r005b-support.mjs';
import { runGo } from '../../test/support.mjs';

const dir = new URL('programs/', import.meta.url);
const excerpt = (source, span) =>
  source.slice(span.start.offset, span.end.offset).slice(0, 60);
const shown = (source, found) => `${found.code} ${found.message} `
  + `@[${excerpt(source, found.span)}]`;
const outcome = source => {
  const checked = checkWired(source);
  if (checked) return `rejected: ${shown(source, checked)}`;
  const compiled = wired(source);
  if (compiled) return `checks; compile stops: ${shown(source, compiled)}`;
  return `runs, prints ${JSON.stringify(runGo(source))}`;
};
for (const name of readdirSync(dir).filter(file => file.endsWith('.wxw'))
  .sort()) {
  console.log(`${name}: ${outcome(readFileSync(new URL(name, dir), 'utf8'))}`);
}
