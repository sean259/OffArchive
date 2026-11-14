-- ─────────────────────────────────────────────────────────────────────────────
--  Profile photos for verified sellers.
--
--   • profiles.avatar holds a storage path in the listing-images bucket:
--     <user id>/avatar-<timestamp>.jpg (uploads already go to your own folder only).
--   • Only verified sellers (and admins) can set or change their photo. Anyone can
--     remove theirs. The database enforces this, not just the website.
--   • If a seller loses their badge, the photo stays stored but the site stops showing it.
--
--  Run this BEFORE deploying the code that reads profiles.avatar.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists avatar text
  check (avatar ~ '^[0-9a-f-]{36}/avatar-[0-9]{10,16}\.jpg$');

create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.verified := old.verified;
    -- Photos are a verified-seller perk: others may only clear theirs.
    if not old.verified and new.avatar is not null and new.avatar is distinct from old.avatar then
      new.avatar := old.avatar;
    end if;
    -- Your photo must live in your own folder.
    if new.avatar is not null and split_part(new.avatar, '/', 1) <> auth.uid()::text then
      new.avatar := old.avatar;
    end if;
  end if;
  new.id := old.id;
  new.updated_at := now();
  return new;
end;
$$;
