-- Voter registration tracking
-- Allows anonymous tracking of voter registrations by state
-- One device = one registration (enforced by unique constraint on voter)

create table em_registrations (
  id bigserial primary key,
  voter text not null,
  state text not null,
  created_at timestamp with time zone default now(),
  unique(voter)
);

-- Public view of registration counts
create or replace view em_registration_count as
select total, state from (
  select count(*)::bigint as total, state from em_registrations group by state
  union all
  select count(*)::bigint, null from em_registrations
) t
order by state nulls first;
-- The total row (state null) comes first, because the register page reads the first row.

-- Row-level security: anon can only insert
alter table em_registrations enable row level security;

create policy "anon insert only" on em_registrations
  for insert
  to anon
  with check (true);

create policy "anon select count only" on em_registrations
  for select
  to anon
  using (false);
