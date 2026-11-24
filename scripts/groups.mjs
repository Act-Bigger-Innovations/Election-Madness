// Builds site/groups.json from data/rounds.csv, data/groups.csv and data/candidates.csv.
// The home page reads it to show the week that is open now. Run by scripts/check.sh.
// Weeks 2-12 list only each group's headliner until the other three names are added to data/groups.csv.
import fs from 'fs';
const csv = (f) => {
  const t = fs.readFileSync('data/' + f, 'utf8').trim(); if (!t) return [];
  const [h, ...r] = t.split('\n'); const c = h.split(',');
  return r.map(x => Object.fromEntries(x.split(',').map((v, i) => [c[i], v])));
};
const cand = new Map(csv('candidates.csv').map(c => [c.id, c]));
const groups = csv('groups.csv');
const weeks = csv('rounds.csv').filter(r => /^g\d+$/.test(r.id)).sort((a, b) => +a.sort - +b.sort).map(r => {
  const week = +r.sort;
  const side = (s) => groups.filter(g => +g.week === week && g.side === s).sort((a, b) => +a.sort - +b.sort).map(g => {
    const c = cand.get(g.candidate_id);
    if (!c) throw new Error('groups.csv: unknown candidate ' + g.candidate_id);
    return { id: c.id, name: c.name, title: (c.title || '').replace(/ · /g, ', ') };
  });
  return { week, id: r.id, opens_at: r.opens_at, closes_at: r.closes_at, blue: side('blue'), red: side('red') };
});
process.stdout.write(JSON.stringify(weeks) + '\n');
