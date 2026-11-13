-- ─────────────────────────────────────────────────────────────────────────────
--  Photo storage for listings. Run after 20261113000001_marketplace.sql.
--  Photos are public to view; users can only upload to / delete from their own
--  folder (<user id>/...). Admins can delete any photo.
--  The website compresses photos in the browser (max 1600×2000 JPEG) before upload.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "Listing photos are public"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users upload photos to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Admins delete any listing photo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and public.is_admin());
