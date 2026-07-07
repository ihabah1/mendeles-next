import { BlogReadLink } from "@/components/blog/blog-read-link";
import { EditorialCardImage } from "@/components/blog/editorial-card-image";
import { editorialCopy } from "@/lib/blog/editorial-copy";
import type { BlogCardPost } from "@/lib/blog/types";

type Props = {
  posts: BlogCardPost[];
  locale?: string;
};

export function FeaturedStrip({ posts, locale = "he" }: Props) {
  const copy = editorialCopy(locale);
  const items = posts.slice(0, 3);
  if (!items.length) return null;

  return (
    <section className="grid gap-6 md:grid-cols-3">
      {items.map((post) => (
        <article
          key={post.id}
          className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(15,23,42,0.1)]"
        >
          <BlogReadLink href={post.full_path} postId={post.id} className="flex h-full flex-col">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <EditorialCardImage
                src={post.image_url}
                alt={post.title}
                category={post.category}
                categorySlug={post.category_slug}
                seed={post.id}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-3 right-3 rounded-full bg-[#6F42F5] px-3 py-1 text-[11px] font-bold text-white shadow">
                {post.category}
              </span>
            </div>
            <div className={`flex flex-1 flex-col p-5 ${locale === "en" ? "text-left" : "text-right"}`}>
              <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-slate-900 group-hover:text-[#6F42F5]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 flex-1 text-sm leading-7 text-slate-600">{post.meta_description}</p>
              <span className="mt-4 text-sm font-bold text-[#6F42F5]">{copy.readMore}</span>
            </div>
          </BlogReadLink>
        </article>
      ))}
    </section>
  );
}
