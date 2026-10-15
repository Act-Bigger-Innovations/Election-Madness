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

- `site/index.html`, `style.css`, `join.html`: the live site (the 100, schedule, rules, standings; voting runs on Instagram comments).
- `site/vote/index.html`: on-site voting page, one file, no build step. Reads with the anon key; the only write is one vote row.
- `site/register/index.html`: voter registration info and tracking, one file, no build step. Reads public registration count; anon insert only for registrations.
- `data/*.csv`: candidates, rounds, matchups, posts. Edit these to change the field. `npm run seed` prints idempotent SQL; the owner runs it against the database (never the site).
- `data/posts.csv`: social media posting schedule (date, time in CT, platform, format, group/week, title, caption, status). Run `node scripts/posts.mjs > data/posts.csv` to regenerate from `data/rounds.csv`.
- `db/0002_registrations.sql`: voter registration schema. Apply once per Supabase project.
- `scripts/check.sh`: the one check (secrets, emojis, data integrity, html balance, Playwright smoke at phone width).
- `test/smoke.mjs`: renders against a fixture, casts a vote, and tests the register page at 390px.

## Rules

- Anon key only. No service-role key anywhere in this repo, ever.
- The database decides what a valid vote is (`em_vote_ok`); the site never trusts itself.
- Rounds open Monday 10 AM CT and close Sunday 9 PM CT. Closing a round and setting `winner_id` is an owner action (SQL), not a site feature yet.
- No emojis in anything shipped.

## Voter registration

`site/register/` offers a voter info and registration page. Users select their state, visit vote.gov per-state links to check or register, and tap "I registered" to self-report and be counted.

The count is self-reported; we cannot verify registrations. One device = one count (enforced by `unique(voter)` in `em_registrations`). Users get a random id in localStorage (same scheme as voting) to prevent re-submission from the same browser.

Apply `db/0002_registrations.sql` to the Supabase project once. The table is insert-only; row-level security prevents reads by the anon key. Results show in the public view `em_registration_count` (total by state, and total overall).

## Weekly results

Every Sunday evening, the comment count from the week's Instagram posts is counted by hand, then recorded in a pull request that edits `data/results.csv` — one row per candidate per week. The site reads that file, computes per-candidate and per-group percentages, and displays them on the home page: each candidate's percentage in the "This week's groups" card and the winner per side in "Standings."

## Running locally

    npm run check        # everything CI runs
    npx serve site       # or open site/index.html
