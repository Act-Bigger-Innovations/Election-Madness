// Prints the season schedule from data/rounds.csv. The group-stage weeks come straight from the
// g* rows; every later milestone is a fixed offset from the last group week. The dates in
// site/index.html are copied from this output, so change rounds.csv, rerun, then fix the html.
// Run: node scripts/dates.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const [head, ...rows] = fs.readFileSync(path.join(root, 'data/rounds.csv'), 'utf8').trim().split('\n');
const cols = head.split(',');
const rounds = rows.map(r => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));
const groups = rounds.filter(r => /^g\d+$/.test(r.id)).sort((a, b) => +a.sort - +b.sort);
if (!groups.length) { console.error('no g* rows in data/rounds.csv'); process.exit(1); }

// Calendar days only. The time of day is fixed by the rules (Mon 10 AM CT to Sun 9 PM CT).
const day = (iso) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
const plus = (d, n) => new Date(d.getTime() + n * 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const md = (d) => MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
const mdy = (d) => md(d) + ', ' + d.getUTCFullYear();
const dmdy = (d) => DOW[d.getUTCDay()] + ' ' + mdy(d);
// "Nov 9 – 15", "Nov 30 – Dec 6", "Nov 9, 2026 – Jan 31, 2027"; with year: "Nov 5 – 8, 2026".
const span = (a, b, year) => {
  if (year && a.getUTCFullYear() !== b.getUTCFullYear()) return mdy(a) + ' – ' + mdy(b);
  const end = a.getUTCMonth() === b.getUTCMonth() ? String(b.getUTCDate()) : md(b);
  return md(a) + ' – ' + end + (year ? ', ' + b.getUTCFullYear() : '');
};
// ISO timestamp for 7 PM Central on a calendar day, with the right DST offset.
const ct7pm = (d) => {
  const ymd = d.toISOString().slice(0, 10);
  for (const off of ['-05:00', '-06:00']) {
    const h = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' }).format(new Date(ymd + 'T19:00:00' + off));
    if (+h === 19) return ymd + 'T19:00:00' + off;
  }
  throw new Error('no CT offset for ' + ymd);
};

const first = day(groups[0].opens_at), last = day(groups[groups.length - 1].closes_at);
const launch = [plus(first, -4), plus(first, -1)];           // Thu to Sun before week 1
const playIn = [plus(last, 8), plus(last, 14)];               // one week off, then Mon to Sun
const bubble = [plus(playIn[1], 1), plus(playIn[1], 14)];     // two weeks
const seeding = [plus(bubble[1], 1), plus(bubble[1], 7)];     // one week
const selection = plus(seeding[1], 7);                        // the Sunday a week after seeding
const bracket = [plus(selection, 8), plus(selection, 57)];    // seven week-long games, Mon to Mon

const out = [];
const line = (k, v) => out.push(k.padEnd(22) + v);
line('Launch & write-ins', span(launch[0], launch[1], true));
line('Group stage', span(first, last, true));
groups.forEach((g, i) => line('  Week ' + (i + 1) + ' of ' + groups.length, span(day(g.opens_at), day(g.closes_at))));
line('First results', 'Sunday, ' + md(day(groups[0].closes_at)));
line('Play-in', span(playIn[0], playIn[1], true));
line('Bubble Weeks', span(bubble[0], bubble[1], true));
line('Seeding Series', span(seeding[0], seeding[1], true));
line('Selection Show', dmdy(selection) + ', 7 PM CT  ' + ct7pm(selection));
line('Hypothetical bracket', span(bracket[0], bracket[1], true));
line('Champion night', dmdy(bracket[1]));
console.log(out.join('\n'));
