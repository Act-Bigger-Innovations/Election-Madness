-- Optional email save for game unlocks. Not applied yet.
-- Apply in a Supabase project used only for game players, never Foundry HQ or garden-network:
-- both of those have policies that let any signed-in user read or change shared data,
-- and every player who saves an email becomes a signed-in user of the project they sign in to.
-- Sign-in is Supabase's email link (anon key plus the player's own JWT). No service role anywhere.

create table if not exists player_unlocks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item text not null check (item in ('ballot_box_badge', 'ballot_box_hat')),
  site text not null check (site in ('em', 'chy')),
  updates_ok boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);

alter table player_unlocks enable row level security;

create policy "players read their own unlocks" on player_unlocks
  for select to authenticated using (user_id = auth.uid());

create policy "players save their own unlocks" on player_unlocks
  for insert to authenticated with check (user_id = auth.uid());

create policy "players change their own update choice" on player_unlocks
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "players delete their own unlocks" on player_unlocks
  for delete to authenticated using (user_id = auth.uid());

revoke all on player_unlocks from anon;
