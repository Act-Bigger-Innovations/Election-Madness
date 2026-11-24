// Builds site/groups.json from data/rounds.csv, data/groups.csv and data/candidates.csv.
// The home page reads it to show the week that is open now. Run by scripts/check.sh.
// Every week has four names per side (1 Heavyweight, 1 Contender, 2 Long shots); a name may appear only once
// and must be on its own party's side. Any break fails the check.
import fs from 'fs';
const csv = (f) => {
  const t = fs.readFileSync('data/' + f, 'utf8').trim(); if (!t) return [];
  const [h, ...r] = t.split('\n'); const c = h.split(',');
  return r.map(x => Object.fromEntries(x.split(',').map((v, i) => [c[i], v])));
};
const cand = new Map(csv('candidates.csv').map(c => [c.id, c]));
const groups = csv('groups.csv');
const seen = new Set();
for (const g of groups) {
  const c = cand.get(g.candidate_id);
  if (!c) throw new Error('groups.csv: unknown candidate ' + g.candidate_id);
  if (seen.has(g.candidate_id)) throw new Error('groups.csv: ' + g.candidate_id + ' is in more than one group');
  if (c.party !== g.side) throw new Error('groups.csv: ' + g.candidate_id + ' is ' + c.party + ', listed on ' + g.side);
  seen.add(g.candidate_id);
}
const weeks = csv('rounds.csv').filter(r => /^g\d+$/.test(r.id)).sort((a, b) => +a.sort - +b.sort).map(r => {
  const week = +r.sort;
  const side = (s) => groups.filter(g => +g.week === week && g.side === s).sort((a, b) => +a.sort - +b.sort).map(g => {
    const c = cand.get(g.candidate_id);
    if (!c) throw new Error('groups.csv: unknown candidate ' + g.candidate_id);
    return { id: c.id, name: c.name, title: (c.title || '').replace(/ · /g, ', ') };
  });
  for (const s of ['blue', 'red']) if (groups.filter(g => +g.week === week && g.side === s).length !== 4) throw new Error('groups.csv: week ' + week + ' ' + s + ' needs 4 names');
  return { week, id: r.id, opens_at: r.opens_at, closes_at: r.closes_at, blue: side('blue'), red: side('red') };
});
process.stdout.write(JSON.stringify(weeks) + '\n');
