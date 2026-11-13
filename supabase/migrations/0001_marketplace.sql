-- ─────────────────────────────────────────────────────────────────────────────
--  OFFARCHIVE. marketplace: profiles, listings, roles, and row-level security.
--  Run in Supabase → SQL Editor (or `supabase db push`). Safe to read top to bottom.
--
--  Rules enforced by the database itself (not just the website):
--   • Anyone can browse live listings (available / reserved / sold) and seller profiles.
--   • Signed-in users can create listings, but only for themselves.
--   • New listings from unverified sellers start as "pending" until an admin approves.
--     Verified sellers go live immediately.
--   • Sellers can mark their own live listings reserved / sold / available again,
--     but can't publish, feature, or un-hide anything. Content edits by unverified
--     sellers send a live listing back for review.
--   • Only admins can change roles, verify sellers, approve/reject/hide/feature listings.
--   • A seller must have a Messenger username or phone number before listing.
-- ─────────────────────────────────────────────────────────────────────────────

create type public.user_role as enum ('user', 'admin');
create type public.listing_status as enum ('pending', 'available', 'reserved', 'sold', 'rejected', 'hidden');

-- ── Profiles: one per auth user, created automatically on sign-up ───────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9][a-z0-9_.]{2,23}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio          text check (char_length(bio) <= 280),
  location     text not null default 'Cebu, Philippines' check (char_length(location) <= 60),
  messenger    text check (messenger ~ '^[A-Za-z0-9.]{3,50}$'),          -- m.me/<messenger>
  phone        text check (phone ~ '^\+?[0-9 ]{7,16}$'),
  instagram    text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  role         public.user_role not null default 'user',
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Listings ──────────────────────────────────────────────────────────────────
create table public.listings (
  id           uuid primary key default gen_random_uuid(),
  catalog_no   bigint generated always as identity unique,                  -- № 001, № 002…
  seller_id    uuid not null references public.profiles (id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 3 and 80),
  category     text not null check (category in ('Clothing', 'Shoes', 'Books & Supplies')),
  price        integer not null check (price between 1 and 999999),        -- pesos
  size         text not null check (char_length(size) between 1 and 30),
  condition    text not null check (condition in ('Like New', 'Excellent', 'Good', 'Fair')),
  status       public.listing_status not null default 'pending',
  brand        text check (char_length(brand) <= 60),
  description  text not null default '' check (char_length(description) <= 2000),
  fit          text check (char_length(fit) <= 120),
  flaws        text not null default 'None noted. See photos.' check (char_length(flaws) <= 300),
  measurements jsonb not null default '{}'::jsonb check (jsonb_typeof(measurements) = 'object'),
  art          text not null default 'tee',                                 -- fallback illustration
  images       text[] not null default '{}' check (cardinality(images) <= 8), -- storage paths
  featured     boolean not null default false,
  review_note  text check (char_length(review_note) <= 300),               -- admin's reason when rejecting
  listed_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index listings_status_listed_idx on public.listings (status, listed_at desc);
create index listings_seller_idx on public.listings (seller_id);

-- ── Helpers ───────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- New auth user → profile with a username derived from their email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  local_part text := split_part(coalesce(new.email, ''), '@', 1);
  base text;
  candidate text;
  n int := 0;
begin
  base := regexp_replace(lower(local_part), '[^a-z0-9_.]', '', 'g');
  base := regexp_replace(base, '^[^a-z0-9]+', '');
  if char_length(base) < 3 then base := base || 'seller'; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, left(coalesce(nullif(local_part, ''), candidate), 60));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users can edit their profile, but not their own role or verified badge.
-- (auth.uid() is null for the SQL editor / service role, which may change anything.)
create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.verified := old.verified;
  end if;
  new.id := old.id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile();

-- Marketplace rules for listings (see header).
create or replace function public.listing_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  trusted boolean;
  has_contact boolean;
begin
  new.updated_at := now();

  -- Admins and the SQL editor / service role: no restrictions.
  if actor is null or public.is_admin() then
    return new;
  end if;

  select verified, (messenger is not null or phone is not null)
    into trusted, has_contact
    from public.profiles where id = actor;

  if tg_op = 'INSERT' then
    if not coalesce(has_contact, false) then
      raise exception 'Add a Messenger username or phone number to your profile before listing.'
        using errcode = 'P0001';
    end if;
    new.seller_id := actor;
    new.status := case when trusted then 'available' else 'pending' end;
    new.featured := false;
    new.review_note := null;
    new.listed_at := now();
    return new;
  end if;

  -- UPDATE by the owner (RLS already guarantees it's theirs).
  new.seller_id := old.seller_id;
  new.featured := old.featured;
  new.listed_at := old.listed_at;
  new.review_note := old.review_note;

  if old.status = 'rejected' then
    new.status := 'pending';          -- editing a rejected listing resubmits it
    new.review_note := null;
  elsif old.status in ('pending', 'hidden') then
    new.status := old.status;         -- only admins can publish or un-hide
  elsif new.status not in ('available', 'reserved', 'sold') then
    new.status := old.status;         -- sellers can only toggle available / reserved / sold
  end if;

  -- Unverified sellers changing what a live listing *is* goes back to review.
  if not coalesce(trusted, false)
     and old.status in ('available', 'reserved')
     and (new.title, new.description, new.images, new.category, new.brand, new.condition)
         is distinct from
         (old.title, old.description, old.images, old.category, old.brand, old.condition) then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

create trigger listing_guard
  before insert or update on public.listings
  for each row execute function public.listing_guard();

-- ── Row-level security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

create policy "Profiles are public"
  on public.profiles for select using (true);
create policy "Users update their own profile"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update any profile"
  on public.profiles for update using (public.is_admin());

create policy "Live listings are public"
  on public.listings for select using (status in ('available', 'reserved', 'sold'));
create policy "Sellers see their own listings"
  on public.listings for select using (seller_id = auth.uid());
create policy "Admins see all listings"
  on public.listings for select using (public.is_admin());

create policy "Users create their own listings"
  on public.listings for insert with check (seller_id = auth.uid());

create policy "Sellers update their own listings"
  on public.listings for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "Admins update any listing"
  on public.listings for update using (public.is_admin());

create policy "Sellers delete their own listings"
  on public.listings for delete using (seller_id = auth.uid());
create policy "Admins delete any listing"
  on public.listings for delete using (public.is_admin());
