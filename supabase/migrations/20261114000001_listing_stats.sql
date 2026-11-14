-- ─────────────────────────────────────────────────────────────────────────────
--  Seller stats: views, saves and message taps per listing, one row per day.
--
--   • Browsers report events through /api/track → public.track_listing(). Nobody can
--     write to the table directly.
--   • Only live listings (available / reserved / sold) are counted, and a seller's own
--     views, saves and taps on their listing are ignored.
--   • Sellers read the stats of their own listings; admins read everything.
--   • Saves are stored on the buyer's device, so "saves" is +1 on save and −1 on unsave
--     (a single day can go negative; totals over time are what's shown).
-- ─────────────────────────────────────────────────────────────────────────────

create table public.listing_stats (
  listing_id uuid not null references public.listings (id) on delete cascade,
  day        date not null default current_date,
  views      integer not null default 0,
  saves      integer not null default 0,
  messages   integer not null default 0,
  primary key (listing_id, day)
);

alter table public.listing_stats enable row level security;

create policy "Sellers read their own listing stats"
  on public.listing_stats for select
  using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy "Admins read all listing stats"
  on public.listing_stats for select using (public.is_admin());

create or replace function public.track_listing(p_slug text, p_kind text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_seller uuid;
begin
  if p_kind not in ('view', 'save', 'unsave', 'message') then
    return;
  end if;

  select id, seller_id into v_id, v_seller
  from public.listings
  where slug = p_slug and status in ('available', 'reserved', 'sold');

  -- Unknown or not-live listing, or the seller looking at their own piece: ignore.
  if v_id is null or v_seller = auth.uid() then
    return;
  end if;

  insert into public.listing_stats as s (listing_id, day, views, saves, messages)
  values (
    v_id,
    (now() at time zone 'Asia/Manila')::date,
    (p_kind = 'view')::int,
    case p_kind when 'save' then 1 when 'unsave' then -1 else 0 end,
    (p_kind = 'message')::int
  )
  on conflict (listing_id, day) do update set
    views    = s.views + excluded.views,
    saves    = s.saves + excluded.saves,
    messages = s.messages + excluded.messages;
end;
$$;

revoke all on function public.track_listing(text, text) from public;
grant execute on function public.track_listing(text, text) to anon, authenticated;

-- Totals per listing for the seller dashboard: all-time and the last 30 days.
-- security invoker: row-level security above still decides which listings you can see.
create or replace function public.listing_stats_summary(p_ids uuid[])
returns table (
  listing_id  uuid,
  views       bigint,
  saves       bigint,
  messages    bigint,
  views_30    bigint,
  saves_30    bigint,
  messages_30 bigint
)
language sql stable security invoker set search_path = ''
as $$
  select
    s.listing_id,
    sum(s.views),
    sum(s.saves),
    sum(s.messages),
    coalesce(sum(s.views)    filter (where s.day > current_date - 30), 0),
    coalesce(sum(s.saves)    filter (where s.day > current_date - 30), 0),
    coalesce(sum(s.messages) filter (where s.day > current_date - 30), 0)
  from public.listing_stats s
  where s.listing_id = any (p_ids)
  group by s.listing_id;
$$;

revoke all on function public.listing_stats_summary(uuid[]) from public;
grant execute on function public.listing_stats_summary(uuid[]) to authenticated;
