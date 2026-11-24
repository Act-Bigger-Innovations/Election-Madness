-- Civic step counts for Election Madness and Congress Hates You (Foundry HQ project).
-- Not applied yet. Apply after Andrew approves.
-- Anonymous, insert-only. Nobody can read rows back through the API; counts come from the view.
-- kind:
--   check_click     tapped a "check my registration" link (unlocks the reward)
--   pledge          tapped "I pledge to vote" (unlocks the reward)
--   register_click  tapped the Rock the Vote register link (counted, no reward)
--   self_report     tapped "I just registered" (unverified estimate, no reward)
-- Rewards never depend on registering: anything of value for registering is barred by federal law.

create table if not exists civic_events (
  id bigserial primary key,
  voter text not null check (char_length(voter) between 8 and 64),
  site text not null check (site in ('em', 'chy')),
  kind text not null check (kind in ('check_click', 'pledge', 'register_click', 'self_report')),
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);

alter table civic_events enable row level security;

create policy "anyone can log a civic step" on civic_events
  for insert to anon, authenticated
  with check (true);

-- Totals per site and kind. distinct_devices counts each device once per kind.
create or replace view civic_event_counts as
select site, kind, count(*)::bigint as taps, count(distinct voter)::bigint as distinct_devices
from civic_events
group by site, kind;

grant select on civic_event_counts to anon, authenticated;
