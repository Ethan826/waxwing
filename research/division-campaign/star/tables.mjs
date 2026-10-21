// Renders measure.mjs's JSON as Markdown tables, one per family.
// Run: node research/division-campaign/star/tables.mjs <in.json>
import { readFileSync } from 'node:fs'

const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const fmt = (x) => (x === undefined ? '' : x < 10 ? x.toFixed(2)
  : x < 1000 ? x.toFixed(1) : Math.round(x).toString())
const size = (r) => {
  if (r.strategy === 'E') {
    return `${r.entries ?? ''} entries, ${r.bytes ?? ''} B`
  }
  if (r.strategy === 'B') return `${r.leaves ?? ''} leaves, ${r.bytes ?? ''} B`
  return r.bytes === undefined ? '' : `1, ${r.bytes} B`
}
const cover = (r) => {
  const n = r.coverLookups ?? r.coverQueries
  return r.coverMs === undefined ? '' : `${fmt(r.coverMs)} (${n}` +
    (r.coverNodes ? `, ${r.coverNodes} nodes)` : ')')
}
const families = [...new Set(rows.map((r) => r.family))]
for (const family of families) {
  console.log(`\n### ${family}\n`)
  console.log('| n | strategy | verdict | consistent (log2) | search ms | ' +
    'certificate | check ms | coverage ms (work) | total ms | RSS MB |')
  console.log('|---|---|---|---|---|---|---|---|---|---|')
  for (const r of rows.filter((x) => x.family === family)) {
    const verdict = r.limit && !r.verdict ? `limit: ${r.limit}`
      : r.verdict + (r.cause ? ` (${r.cause})` : '')
    const log2 = r.consistentLog2 === undefined ? ''
      : fmt(r.consistentLog2)
    console.log(`| ${r.size} | ${r.strategy} | ${verdict} | ${log2} | ` +
      `${fmt(r.searchMs)} | ${size(r)} | ${fmt(r.checkMs)} | ` +
      `${cover(r)} | ${fmt(r.totalMs)} | ${r.maxRssMB ?? ''} |`)
  }
}
