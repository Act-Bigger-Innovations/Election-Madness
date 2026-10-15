// Generate social media posting schedule from data/rounds.csv
// Run: node scripts/posts.mjs > data/posts.csv
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const [head, ...rows] = fs.readFileSync(path.join(root, 'data/rounds.csv'), 'utf8').trim().split('\n');
const cols = head.split(',');
const rounds = rows.map(r => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])));

// Parse date from ISO format string (YYYY-MM-DD part)
const day = (iso) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

// Add days to a date
const plus = (d, n) => new Date(d.getTime() + n * 864e5);

// Format date as YYYY-MM-DD
const formatDate = (d) => d.toISOString().slice(0, 10);

// Get group rounds (g1-g5 for Nov 5 to Dec 8)
const groups = rounds.filter(r => /^g[1-5]$/.test(r.id)).sort((a, b) => +a.sort - +b.sort);

const posts = [];

// Helper to add a post
const addPost = (date, time, platform, format, groupOrWeek, title, caption) => {
  posts.push({
    date: formatDate(date),
    time,
    platform,
    format,
    group_or_week: groupOrWeek,
    title,
    caption,
    status: 'planned'
  });
};

// Launch and write-in posts (Nov 5-8)
// Nov 5 = Wed, Nov 6 = Thu, Nov 7 = Fri, Nov 8 = Sat
addPost(new Date(Date.UTC(2026, 10, 5)), '12:00 PM', 'Instagram', 'story', 'preview', 'Launch Day 1', 'Vote in the preview round');
addPost(new Date(Date.UTC(2026, 10, 6)), '12:00 PM', 'Instagram', 'story', 'preview', 'Write-in Wednesday', 'Submit your pick');
addPost(new Date(Date.UTC(2026, 10, 7)), '12:00 PM', 'Instagram', 'story', 'preview', 'Write-in Friday', 'Last chance to write-in');
addPost(new Date(Date.UTC(2026, 10, 8)), '9:00 AM', 'Instagram', 'story', 'preview', 'Preview Preview', 'One day left to vote');

// Group stage posts
const endDate = new Date(Date.UTC(2026, 11, 8)); // Dec 8, 2026

groups.forEach((g) => {
  const groupNum = +g.id.slice(1);
  const groupName = g.name;
  const opens = day(g.opens_at);
  const closes = day(g.closes_at);

  // opens is Monday 10 AM, closes is Sunday 9 PM
  const mon = opens;
  const tue = plus(opens, 1);
  const wed = plus(opens, 2);
  const thu = plus(opens, 3);
  const fri = plus(opens, 4);
  const sun = closes;

  // Monday schedule
  if (mon <= endDate) {
    addPost(mon, '10:00 AM', 'Instagram', 'carousel', groupName, `${groupName} Matchups`, 'See the bracket');
  }
  if (mon <= endDate) {
    addPost(mon, '3:00 PM', 'Instagram', 'reel', groupName, 'Hook Reel 1', 'Check out these matchups');
  }
  if (mon <= endDate) {
    addPost(mon, '5:00 PM', 'Instagram', 'reel', groupName, 'Hook Reel 2', 'Who will win?');
  }

  // Tuesday-Friday spotlight stories
  [tue, wed, thu, fri].forEach((d, idx) => {
    if (d <= endDate) {
      const dayName = ['Tuesday', 'Wednesday', 'Thursday', 'Friday'][idx];
      addPost(d, '12:00 PM', 'Instagram', 'story', groupName, `Spotlight ${dayName}`, `Voting live now`);
    }
  });

  // Sunday schedule (only add if within range)
  if (sun <= endDate) {
    addPost(sun, '10:00 AM', 'Instagram', 'story', groupName, 'Last Call', `Final day to vote`);
  }
  if (sun <= endDate) {
    addPost(sun, '9:00 PM', 'Instagram', 'story', groupName, 'Results & Close', `Winners announced`);
  }
});

// Generate CSV output
const header = 'date,time,platform,format,group_or_week,title,caption,status';
const rows_csv = posts.map(p =>
  [p.date, p.time, p.platform, p.format, p.group_or_week, p.title, p.caption, p.status]
    .map(v => `"${v}"`)
    .join(',')
);

console.log([header, ...rows_csv].join('\n'));
