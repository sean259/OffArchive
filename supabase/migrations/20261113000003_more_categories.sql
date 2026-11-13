-- More departments: Fragrance and Others.
-- Size is only required for clothing and shoes. For other categories it's optional
-- (e.g. "100 ml" for a perfume) or empty, so the column now allows an empty string.

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('Clothing', 'Shoes', 'Fragrance', 'Books & Supplies', 'Others'));

alter table public.listings drop constraint if exists listings_size_check;
alter table public.listings add constraint listings_size_check
  check (char_length(size) <= 30 and (category not in ('Clothing', 'Shoes') or char_length(trim(size)) >= 1));

alter table public.listings alter column size set default '';
