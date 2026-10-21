// One measurement, in its own process (protocol.md, resource limits):
// node run-one.mjs <family> <size> <E|A|B>. Prints one JSON line.
import { resourceUsage } from 'node:process'
import { FAMILIES } from './problems.mjs'
import { runE, runA, runB } from './strategies.mjs'

const [family, size, strategy] = process.argv.slice(2)
const f = FAMILIES.find((x) => x.name === family)
const P = f.make(Number(size))
const run = { E: runE, A: runA, B: runB }[strategy]
const t0 = process.hrtime.bigint()
const out = run(P)
const totalMs = Number(process.hrtime.bigint() - t0) / 1e6
delete out.cert
delete out.trees
const atoms = P.B.length
console.log(JSON.stringify({ family, size: Number(size), atoms,
  rigidRows: P.rigidRows.length, ...out, totalMs,
  maxRssMB: Math.round(resourceUsage().maxRSS / 1024) }))
