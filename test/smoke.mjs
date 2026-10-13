// Renders the site against a fixture copy of the database and exercises a vote.
// Run: node test/smoke.mjs   (needs playwright; scripts/check.sh installs it)
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const html = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
const csv = (f) => { const [h, ...r] = fs.readFileSync(path.join(root, 'data', f), 'utf8').trim().split('\n'); const c = h.split(','); return r.map(x => Object.fromEntries(x.split(',').map((v, i) => [c[i], v]))); };
const now = Date.now();
const fx = {
  em_candidates: csv('candidates.csv').map(c => ({ ...c, seed: +c.seed })),
  em_rounds: [{ id: 'live', name: 'Live round', opens_at: new Date(now - 36e5).toISOString(), closes_at: new Date(now + 36e5 * 50).toISOString(), sort: 1 },
              { id: 'done', name: 'Closed round', opens_at: new Date(now - 36e5 * 200).toISOString(), closes_at: new Date(now - 36e5 * 10).toISOString(), sort: 0 }],
  em_matchups: [{ id: 'l1', round_id: 'live', a_id: 'newsom', b_id: 'khanna', sort: 1 }, { id: 'l2', round_id: 'live', a_id: 'vance', b_id: 'paul', sort: 2 }, { id: 'd1', round_id: 'done', a_id: 'aoc', b_id: 'beshear', sort: 1 }],
  em_tallies: [{ matchup_id: 'l1', a_votes: 12, b_votes: 8 }, { matchup_id: 'l2', a_votes: 0, b_votes: 0 }, { matchup_id: 'd1', a_votes: 40, b_votes: 55 }],
};
const srv = http.createServer((q, s) => { s.writeHead(200, { 'content-type': 'text/html' }); s.end(html); }).listen(8790);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = []; const posts = [];
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.route('**/rest/v1/**', async (route) => {
  const u = new URL(route.request().url()); const t = u.pathname.split('/').pop();
  if (route.request().method() === 'POST') { posts.push(JSON.parse(route.request().postData())); fx.em_tallies[0].a_votes++; return route.fulfill({ status: 201, body: '' }); }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fx[t] || []) });
});
const fail = (m) => { console.error('FAIL ' + m); process.exitCode = 1; };
await page.goto('http://localhost:8790/#now'); await page.waitForSelector('.match');
if ((await page.locator('.match').count()) !== 2) fail('live round should show 2 matchups');
if (!(await page.locator('.status').textContent()).includes('Voting open')) fail('status should say open');
await page.locator('.cand[data-c="newsom"]').click(); await page.waitForTimeout(400);
if (posts.length !== 1 || posts[0].candidate_id !== 'newsom' || !/^[a-f0-9]{32}$/.test(posts[0].voter)) fail('vote POST wrong: ' + JSON.stringify(posts));
if (!(await page.locator('.cand[data-c="newsom"]').getAttribute('class')).includes('mine')) fail('voted card not marked mine');
if (!(await page.locator('#m-l1 .cand[data-c="khanna"]').isDisabled())) fail('other side should be disabled after voting');
for (const r of ['bracket', 'results', 'how']) { await page.goto('http://localhost:8790/#' + r); await page.waitForTimeout(200); if ((await page.locator('h1').count()) !== 1) fail(r + ' has no h1'); }
await page.goto('http://localhost:8790/#results'); await page.waitForTimeout(200);
if (!(await page.locator('#m-d1 .meta').textContent()).includes('Andy Beshear advances')) fail('closed round should name the winner');
const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth); if (wide) fail('horizontal scroll at 390px');
fs.mkdirSync(path.join(root, 'test/shots'), { recursive: true });
await page.goto('http://localhost:8790/#now'); await page.waitForSelector('.match'); await page.screenshot({ path: path.join(root, 'test/shots/now-phone.png'), fullPage: true });
await ctx.grantPermissions(['clipboard-read','clipboard-write']);
await page.goto('http://localhost:8790/#bracket/l2'); await page.waitForSelector('.match');
if (!(await page.locator('#m-l2').getAttribute('class')).includes('hl')) fail('deep link should highlight the matchup');
await page.evaluate(() => { navigator.share = undefined; });
await page.locator('.share[data-share="l1"]').click(); await page.waitForTimeout(200);
const clip = await page.evaluate(() => navigator.clipboard.readText()); if (!clip.endsWith('#bracket/l1')) fail('share should copy a deep link, got ' + clip);
if (errors.length) fail('console errors: ' + errors.join(' | '));
console.log(process.exitCode ? 'smoke FAILED' : 'smoke ok'); await browser.close(); srv.close();
