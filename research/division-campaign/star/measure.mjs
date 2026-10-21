// The measurement driver (protocol.md). Each strategy runs a family's
// sizes in order, one child process each, under 60 s and a 4096 MB
// heap, and stops at the first size that hits a limit.
// Run: node research/division-campaign/star/measure.mjs <out.json>
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FAMILIES } from './problems.mjs'

const STAR = [1, 2, 3, 4, 5, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192,
  256, 384, 512, 768, 1024]
const SIZES = { star: STAR, 'star-read': STAR, 'star-undeclared': STAR,
  'star-unlacked': STAR, 'star-cross': STAR.filter((n) => n >= 2),
  dep: [1, 2, 3, 4, 6, 8, 12, 16, 32, 64, 128],
  divide: [1, 2, 3, 4, 6, 8, 10, 12, 14, 16],
  divide2: [1, 2, 3, 4, 6, 8, 10, 12, 14, 16],
  divide3: [1, 2, 3, 4, 6, 8, 10, 12, 14, 16], route: [0] }
const one = fileURLToPath(new URL('./run-one.mjs', import.meta.url))

const rows = []
for (const f of FAMILIES) {
  for (const strategy of ['E', 'A', 'B']) {
    for (const n of SIZES[f.name]) {
      const res = spawnSync('node', ['--max-old-space-size=4096',
        one, f.name, String(n), strategy], { timeout: 60000,
        encoding: 'utf8', maxBuffer: 1 << 24 })
      let row
      if (res.error?.code === 'ETIMEDOUT' || res.signal === 'SIGTERM') {
        row = { family: f.name, size: n, strategy, limit: 'time 60 s' }
      } else if (res.status !== 0) {
        const heap = /heap/i.test(res.stderr)
        row = { family: f.name, size: n, strategy,
          limit: heap ? 'heap 4096 MB' : `exit ${res.status}`,
          stderr: res.stderr.slice(-300) }
      } else {
        row = JSON.parse(res.stdout.trim().split('\n').pop())
        if (row.cause?.includes('budget')) row.limit = row.cause
      }
      rows.push(row)
      console.log(JSON.stringify(row))
      if (row.limit) break
    }
  }
}
writeFileSync(process.argv[2], JSON.stringify(rows, null, 1) + '\n')
