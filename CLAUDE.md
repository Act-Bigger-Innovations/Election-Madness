# Working in this repo

Read README.md first. The rules there are the rules.

- Deliver changes as a pull request on a branch named `em/<short-topic>`. Run `scripts/check.sh` before opening it and paste its last line in the PR body.
- Keep `site/index.html` a single file with no build step. Outfit for names and numbers, Inter for labels and body. No emojis.
- Never add a service-role key, an edge function with elevated rights, or a write path other than `em_votes` insert without an explicit instruction from Andrew in the issue.
- Field changes go in `data/*.csv`, then `npm run seed` output is applied by the owner. Do not hand-write inserts.
- Do not create docs, plans, or notes files. If a decision needs recording, it goes in the PR description or README.md.
