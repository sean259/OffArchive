/** Row shapes for the tables in supabase/migrations/20261113000001_marketplace.sql. */
export type Role = 'user' | 'admin';
export type ListingStatus = 'pending' | 'available' | 'reserved' | 'sold' | 'rejected' | 'hidden';

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  location: string;
  messenger: string | null;
  phone: string | null;
  instagram: string | null;
  /** Storage path of a verified seller's photo (20261114000002_avatars.sql). */
  avatar: string | null;
  role: Role;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListingRow {
  id: string;
  catalog_no: number;
  seller_id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  size: string;
  condition: string;
  status: ListingStatus;
  brand: string | null;
  description: string;
  fit: string | null;
  flaws: string;
  measurements: Record<string, string>;
  art: string;
  images: string[];
  featured: boolean;
  review_note: string | null;
  listed_at: string;
  created_at: string;
  updated_at: string;
}

export type ListingWithSeller = ListingRow & {
  seller: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'verified' | 'role' | 'messenger' | 'phone' | 'instagram' | 'avatar' | 'location' | 'bio'> | null;
};

export const SELLER_COLUMNS = 'id, username, display_name, verified, role, messenger, phone, instagram, avatar, location, bio';
export const LISTING_SELECT = `*, seller:profiles(${SELLER_COLUMNS})`;
