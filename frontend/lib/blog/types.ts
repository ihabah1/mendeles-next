export type BlogCardPost = {
  id: string;
  title: string;
  full_path: string;
  meta_description: string;
  published_at: string | null;
  image_url: string;
  category: string;
  category_slug: string;
  reading_minutes: number;
};

export type BlogCategory = {
  slug: string;
  name: string;
  count: number;
};

export type BlogSort = "newest" | "oldest" | "title";
