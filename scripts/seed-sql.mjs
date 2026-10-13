// Turns data/*.csv into one idempotent SQL upsert. No keys here: the output is run
// by the owner (Supabase SQL editor or the Supabase connector), never by the site.
//   node scripts/seed-sql.mjs > /tmp/seed.sql
import fs from 'node:fs';
const csv = (f) => {
  const [head, ...rows] = fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8').trim().split('\n');
  const cols = head.split(',');
  return rows.map(r => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
};
const q = (v) => v === '' || v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const out = [];
for (const c of csv('candidates.csv'))
  out.push(`insert into em_candidates (id,name,party,seed,title,status) values (${q(c.id)},${q(c.name)},${q(c.party)},${c.seed || 'null'},${q(c.title)},${q(c.status)})
  on conflict (id) do update set name=excluded.name, party=excluded.party, seed=excluded.seed, title=excluded.title, status=excluded.status;`);
for (const r of csv('rounds.csv'))
  out.push(`insert into em_rounds (id,name,opens_at,closes_at,sort) values (${q(r.id)},${q(r.name)},${q(r.opens_at)},${q(r.closes_at)},${r.sort || 0})
  on conflict (id) do update set name=excluded.name, opens_at=excluded.opens_at, closes_at=excluded.closes_at, sort=excluded.sort;`);
for (const m of csv('matchups.csv'))
  out.push(`insert into em_matchups (id,round_id,a_id,b_id,sort) values (${q(m.id)},${q(m.round_id)},${q(m.a_id)},${q(m.b_id)},${m.sort || 0})
  on conflict (id) do update set round_id=excluded.round_id, a_id=excluded.a_id, b_id=excluded.b_id, sort=excluded.sort;`);
process.stdout.write(out.join('\n') + '\n');
