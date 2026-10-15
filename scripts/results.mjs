import fs from 'fs';
import path from 'path';

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

const results = parseCSV('data/results.csv');
const candidates = parseCSV('data/candidates.csv');

// Create a map of candidate_id -> {name, party}
const candidateMap = new Map();
for (const c of candidates) {
  candidateMap.set(c.id, { name: c.name, party: c.party });
}

// Group results by week
const byWeek = new Map();
for (const r of results) {
  if (!r.week || !r.candidate_id) continue;
  if (!byWeek.has(r.week)) byWeek.set(r.week, []);
  byWeek.get(r.week).push(r);
}

// Process each week to calculate winners and percentages
const output = {};
for (const [week, entries] of byWeek) {
  output[week] = {};

  // Group by party (group is either "blue" or "red")
  const byParty = { blue: [], red: [] };
  for (const entry of entries) {
    const candidate = candidateMap.get(entry.candidate_id);
    if (!candidate) continue;
    const party = candidate.party;
    if (party === 'blue' || party === 'red') {
      byParty[party].push({
        id: entry.candidate_id,
        name: candidate.name,
        comments: parseInt(entry.comments, 10) || 0,
        counted_at: entry.counted_at
      });
    }
  }

  // Calculate percentages and find winner for each party
  for (const party of ['blue', 'red']) {
    const items = byParty[party];
    if (items.length === 0) {
      output[week][party] = [];
      continue;
    }

    const total = items.reduce((sum, item) => sum + item.comments, 0);
    const maxComments = Math.max(...items.map(item => item.comments));

    output[week][party] = items.map(item => ({
      id: item.id,
      name: item.name,
      comments: item.comments,
      pct: total > 0 ? ((item.comments / total) * 100).toFixed(1) : '0.0',
      winner: total > 0 && item.comments === maxComments
    }));
  }
}

// Output JSON to stdout
console.log(JSON.stringify(output, null, 2));
