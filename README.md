# Election Madness 2028

A public, March Madness-style bracket of likely 2028 presidential contenders. One vote per matchup per device, one week per round, winners advance. Hypothetical until candidates declare.

- Live site: https://electionmadness.mrearthrebirth.com (Cloudflare Pages; `site/` is the deployed tree, `site/vote/` is the on-site voting page, not yet linked from the home page)
- Database: Foundry Supabase project `hbpurggayqtjshwlwmet`, tables `em_candidates`, `em_rounds`, `em_matchups`, `em_votes`, view `em_tallies`
- Social: @ElectionMadness28

## How work happens here

1. Work arrives as a GitHub issue (or a one-line ask in chat).
2. A branch and a pull request carry the change. `scripts/check.sh` runs on every PR; green means mergeable.
3. Andrew merges from the GitHub app on his phone. Nothing else needs approval.
4. `main` deploys to the live site.

No task files, no Drive documents for code. The repo is the record.

## Layout

- `site/index.html`, `style.css`, `join.html`: the live site as imported Oct 13 (the 100, schedule, rules, standings; voting runs on Instagram comments).
- `site/vote/index.html`: on-site voting page, one file, no build step. Reads with the anon key; the only write is one vote row. Decision pending on whether votes live here or on Instagram.
- `data/*.csv`: candidates, rounds, matchups. Edit these to change the field. `npm run seed` prints idempotent SQL; the owner runs it against the database (never the site).
- `scripts/check.sh`: the one check (secrets, emojis, data integrity, html balance, Playwright smoke at phone width).
- `test/smoke.mjs`: renders against a fixture and casts a vote through a mocked API.

## Rules

- Anon key only. No service-role key anywhere in this repo, ever.
- The database decides what a valid vote is (`em_vote_ok`); the site never trusts itself.
- Rounds open Monday 10 AM CT and close Sunday 9 PM CT. Closing a round and setting `winner_id` is an owner action (SQL), not a site feature yet.
- No emojis in anything shipped.

## Running locally

    npm run check        # everything CI runs
    npx serve site       # or open site/index.html
